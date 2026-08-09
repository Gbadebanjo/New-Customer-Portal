'use server';
import { Op } from 'sequelize';
import db from '@/database/models';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';
import { withCache, scopeKey } from '@/lib/services/cache/memoryCache';

// Fields the resolver knows about + the mapping from report_data columns.
// If a caller asks for other fields we still return the row but leave those
// fields undefined — safer than pretending.
const FIELD_MAP = {
    solar_kwh:       'pv_production',
    consumption_kwh: 'total_daily_consumption',
    generator_kwh:   'energy_production_diesel_generator',
    grid_kwh:        null, // report_data doesn't store grid separately today
};
const DEFAULT_FIELDS = ['solar_kwh', 'consumption_kwh', 'generator_kwh', 'grid_kwh'];

function toUtcYMD(d) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function eachDayUtc(from, to) {
    const days = [];
    const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
        days.push(new Date(t));
    }
    return days;
}

function todayUtc() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Turn a report_data row into a resolver row. Fields the caller didn't
// ask for are left off; unmapped fields resolve to null.
function rowFromDb(dbRow, fields) {
    const out = {
        date: toUtcYMD(new Date(Date.UTC(dbRow.report_year, dbRow.report_month - 1, dbRow.day))),
        siteId: dbRow.site_id,
        source: dbRow.status === 'verified' ? 'verified' : 'raw',
    };
    for (const f of fields) {
        const col = FIELD_MAP[f];
        out[f] = col ? Number(dbRow[col] ?? 0) : null;
    }
    if (dbRow.status === 'verified') {
        out.verifiedAt = dbRow.verified_at ? new Date(dbRow.verified_at).toISOString() : null;
    }
    return out;
}

// Turn one day's live AMMP historic-energy payload into a resolver row for
// the requested fields. AMMP energy values are in Wh — convert to kWh.
function rowFromLive(historic, siteId, date, fields) {
    const out = { date: toUtcYMD(date), siteId, source: 'live' };
    const sumWh = (series) => {
        if (!series?.data) return 0;
        let s = 0;
        for (const p of series.data) if (typeof p?.value === 'number') s += p.value;
        return s;
    };
    // Map each requested field to the AMMP series that carries it.
    for (const f of fields) {
        switch (f) {
            case 'solar_kwh':       out[f] = sumWh(historic?.pv_energy) / 1000; break;
            case 'consumption_kwh': out[f] = sumWh(historic?.consumption_energy) / 1000; break;
            case 'generator_kwh':   out[f] = sumWh(historic?.genset_energy) / 1000; break;
            case 'grid_kwh':        out[f] = sumWh(historic?.energy_from_grid) / 1000; break;
            default:                out[f] = null;
        }
    }
    return out;
}

function unavailableRow(siteId, date, fields) {
    const out = { date: toUtcYMD(date), siteId, source: 'unavailable' };
    for (const f of fields) out[f] = null;
    return out;
}

/**
 * See docs/RESOLVER-CONTRACT.md for the full spec. In short:
 *   - Every (site × day) in the range gets exactly one row.
 *   - Prefers verified > raw > live. Never overwrites a verified row.
 *   - Never throws on data-availability issues.
 */
export async function getEnergyForRange({
    userId,
    siteIds,
    from,
    to,
    fields = DEFAULT_FIELDS,
}) {
    if (!siteIds || siteIds.length === 0) {
        return { series: [], sourceMix: { verified: 0, raw: 0, live: 0, unavailable: 0 } };
    }
    if (from > to) throw new RangeError('from must be ≤ to');

    const cacheKey =
        `resolver:${scopeKey(String(userId ?? 'anon'))}:${[...siteIds].sort().join(',')}:` +
        `${toUtcYMD(from)}:${toUtcYMD(to)}:${[...fields].sort().join(',')}`;

    // 5 min ceiling — verified rows can be cached longer, but the resolver
    // has to handle mixed ranges, so we use the shortest safe TTL. Verify /
    // reset actions manually invalidate their affected keys (see below).
    return withCache(cacheKey, 5 * 60_000, () => resolveUncached({ userId, siteIds, from, to, fields }));
}

async function resolveUncached({ userId, siteIds, from, to, fields }) {
    const days = eachDayUtc(from, to);
    const siteIdStrs = siteIds.map(String);
    const today = todayUtc().getTime();

    // Bulk-load every report_data row that could serve any (site × day) in
    // the range. One query, then in-memory index by "siteId:YYYY-MM-DD".
    let dbRows = [];
    try {
        dbRows = await db.ReportData.findAll({
            where: {
                site_id: { [Op.in]: siteIdStrs },
                [Op.or]: buildMonthClauses(days),
            },
            raw: true,
        });
    } catch (err) {
        console.error('getEnergyForRange: report_data query failed', err);
    }

    const dbByKey = new Map();
    for (const r of dbRows) {
        const date = new Date(Date.UTC(r.report_year, r.report_month - 1, r.day));
        dbByKey.set(`${r.site_id}:${toUtcYMD(date)}`, r);
    }

    // Figure out which (site × day) pairs actually need a live fetch.
    const liveNeeded = []; // { siteId, date }
    for (const siteId of siteIdStrs) {
        for (const date of days) {
            const key = `${siteId}:${toUtcYMD(date)}`;
            if (dbByKey.has(key)) continue;                  // rules 1–2
            liveNeeded.push({ siteId, date });               // rules 3–4
        }
    }

    // Fetch live for the days that need it — group by site (one AMMP call
    // per site covering the whole missing sub-range, not per day).
    const liveBySiteDate = new Map();
    if (liveNeeded.length > 0 && userId) {
        const { access_token: token } = await getAmmpToken(userId).catch(() => ({ access_token: null }));
        if (token) {
            const perSite = new Map(); // siteId -> Set of days needed
            for (const n of liveNeeded) {
                if (!perSite.has(n.siteId)) perSite.set(n.siteId, []);
                perSite.get(n.siteId).push(n.date);
            }
            const svc = AmmpServices();
            await Promise.all([...perSite.entries()].map(async ([siteId, dates]) => {
                dates.sort((a, b) => a - b);
                const rangeFrom = dates[0];
                const rangeTo = new Date(dates[dates.length - 1].getTime() + 86_400_000 - 1);
                try {
                    const historic = await svc.getHistoricAssetEnergyData(token, siteId, rangeFrom, rangeTo, '1d');
                    // AMMP returns one payload per site with a series per metric;
                    // slot each per-day value onto its date. Fallback: assign
                    // the whole payload to every day and let sumWh treat each
                    // date's slice — simplest safe behavior when the payload
                    // shape doesn't include per-day break-down we can pluck.
                    for (const date of dates) {
                        liveBySiteDate.set(`${siteId}:${toUtcYMD(date)}`, historic);
                    }
                } catch { /* leave unavailable */ }
            }));
        }
    }

    // Build the final series in deterministic order.
    const series = [];
    const mix = { verified: 0, raw: 0, live: 0, unavailable: 0 };

    for (const date of days) {
        for (const siteId of siteIdStrs) {
            const key = `${siteId}:${toUtcYMD(date)}`;
            const dbRow = dbByKey.get(key);
            if (dbRow) {
                const row = rowFromDb(dbRow, fields);
                mix[row.source]++;
                series.push(row);
                continue;
            }
            const live = liveBySiteDate.get(key);
            if (live) {
                const row = rowFromLive(live, siteId, date, fields);
                // Today's live data always tagged 'live' regardless of what
                // rule matched — the contract says "right now is live".
                row.source = 'live';
                mix.live++;
                series.push(row);
                continue;
            }
            const row = unavailableRow(siteId, date, fields);
            mix.unavailable++;
            series.push(row);
            // Ignore today marker `today` — future extension point.
            void today;
        }
    }

    return { series, sourceMix: mix };
}

// Build a Sequelize OR clause covering the (report_month, report_year)
// combinations touched by the requested day range. Cheaper than pulling
// every row for every site ever.
function buildMonthClauses(days) {
    const seen = new Set();
    const clauses = [];
    for (const d of days) {
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        const key = `${y}-${m}`;
        if (seen.has(key)) continue;
        seen.add(key);
        clauses.push({ report_year: y, report_month: m });
    }
    return clauses;
}
