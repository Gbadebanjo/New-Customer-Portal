import db from '@/database/models';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { ServiceConstants } from '@/utils/constants';

// Convert an AMMP historic-energy payload (values in Wh) into a per-day
// bucket of the columns we store in report_data (kWh). Bucketing is done by
// UTC date because that's how the resolver keys rows.
function bucketPayloadByDay(historic) {
    const buckets = new Map(); // 'YYYY-MM-DD' -> { field: kWh }

    const push = (seriesKey, colKey) => {
        const series = historic?.[seriesKey];
        if (!series?.data) return;
        for (const p of series.data) {
            if (typeof p?.value !== 'number') continue; // skip null / missing values
            // AMMP's daily interval returns `date` (e.g. "2026-08-01");
            // sub-daily intervals return `timestamp`. Accept both so this
            // works regardless of which resolution the caller asked for.
            const raw = p.date || p.timestamp;
            if (!raw) continue;
            const d = new Date(raw);
            if (isNaN(d.getTime())) continue;
            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
            if (!buckets.has(key)) buckets.set(key, {});
            const bucket = buckets.get(key);
            bucket[colKey] = (bucket[colKey] || 0) + p.value / 1000; // Wh → kWh
        }
    };

    push('pv_energy', 'pv_production');
    push('consumption_energy', 'total_daily_consumption');
    push('genset_energy', 'energy_production_diesel_generator');

    return buckets;
}

/**
 * Ingest per-day rollups into report_data for one customer's list of sites.
 * This is the correct shape under the master-key model — the caller does
 * customer↔sites resolution via customer_site_mapping and we just do the
 * per-site fetch + upsert.
 *
 * Protects verified rows: if an existing row has status='verified', it's
 * left untouched even if AMMP now returns different numbers.
 */
export async function ingestReportDataForCustomer(customerId, siteIds, { from, to, token }) {
    if (!token) return { ok: false, reason: 'no-token' };
    if (!Array.isArray(siteIds) || siteIds.length === 0) {
        return { ok: false, reason: 'no-sites' };
    }

    const svc = AmmpServices();
    let created = 0, updated = 0, skipped = 0, failed = 0;

    for (const siteId of siteIds) {
        let historic = null;
        try {
            historic = await svc.getHistoricAssetEnergyData(token, siteId, from, to, '1d');
        } catch (err) {
            console.error(`ingest: historic-energy failed for site ${siteId}`, err);
            failed++;
            continue;
        }

        const perDay = bucketPayloadByDay(historic);
        for (const [dateKey, vals] of perDay.entries()) {
            const [yStr, mStr, dStr] = dateKey.split('-');
            const year = Number(yStr);
            const month = Number(mStr);
            const day = Number(dStr);

            const existing = await db.ReportData.findOne({
                where: { site_id: siteId, report_year: year, report_month: month, day },
            });

            if (existing && existing.status === 'verified') {
                skipped++;
                continue;
            }

            const values = {
                site_id: siteId,
                customer_id: customerId || '',
                report_year: year,
                report_month: month,
                day,
                pv_production: vals.pv_production ?? 0,
                total_daily_consumption: vals.total_daily_consumption ?? 0,
                energy_production_diesel_generator: vals.energy_production_diesel_generator ?? 0,
                status: 'raw',
                raw_source_data: {
                    pv_production: vals.pv_production ?? 0,
                    total_daily_consumption: vals.total_daily_consumption ?? 0,
                    energy_production_diesel_generator: vals.energy_production_diesel_generator ?? 0,
                    ingested_at: new Date().toISOString(),
                },
            };

            if (existing) { await existing.update(values); updated++; }
            else          { await db.ReportData.create(values); created++; }
        }
    }

    return { ok: true, sites: siteIds.length, created, updated, skipped, failed };
}

/**
 * Look up the ingestion token once — always the master key. Called by every
 * ingestion caller so they don't each duplicate the auth step.
 */
export async function resolveIngestionToken() {
    const svc = AmmpServices();
    const master = ServiceConstants.AmmpMasterKey;
    if (master) {
        const { access_token } = await svc.getAuthToken(master);
        if (access_token) return { access_token, source: 'master' };
    }
    // Fall back to whichever env-level key we have.
    const { access_token } = await svc.getAuthToken(null);
    return { access_token: access_token ?? null, source: access_token ? 'env' : null };
}
