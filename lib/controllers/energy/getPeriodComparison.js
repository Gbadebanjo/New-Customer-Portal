'use server';
import { getEnergyForRange } from '@/lib/services/reportData/getEnergyForRange';
import { getAuthorizedAssets } from '@/lib/services/ammp/getAuthorizedAssets';
import { deriveSiteType } from '@/lib/services/siteType/deriveSiteType';
import { verifyAuth } from '@/lib/auth/auth';

// Resolves the (start, end) UTC bounds for the current + previous period.
// All bounds are inclusive-day; the resolver iterates day by day.
function windowsFor(period, now = new Date()) {
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterday = new Date(utcMidnight.getTime() - 86_400_000);

    if (period === 'day') {
        // Yesterday vs the day before. "Today" is often incomplete so we
        // compare closed days for a fair number.
        const dayBefore = new Date(yesterday.getTime() - 86_400_000);
        return {
            current:  { from: yesterday, to: yesterday, label: 'Yesterday' },
            previous: { from: dayBefore, to: dayBefore, label: 'Day before' },
        };
    }

    if (period === 'week') {
        // Last complete 7-day window vs the 7 days before that.
        const cEnd = yesterday;
        const cStart = new Date(cEnd.getTime() - 6 * 86_400_000);
        const pEnd = new Date(cStart.getTime() - 86_400_000);
        const pStart = new Date(pEnd.getTime() - 6 * 86_400_000);
        return {
            current:  { from: cStart, to: cEnd, label: 'Last 7 days' },
            previous: { from: pStart, to: pEnd, label: 'Prior 7 days' },
        };
    }

    // month — current calendar month up to yesterday, vs same day-count in
    // the previous calendar month. Anchoring to "day-count so far" makes
    // early-month comparisons fair (compare 5 days to 5 days, not 5 to 30).
    const daysIntoMonth = now.getUTCDate() - 1; // 0-based
    const cStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const cEnd = yesterday >= cStart ? yesterday : cStart;
    const pStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const pEnd = new Date(pStart.getTime() + daysIntoMonth * 86_400_000);
    return {
        current:  { from: cStart, to: cEnd, label: 'This month so far' },
        previous: { from: pStart, to: pEnd, label: 'Last month, same window' },
    };
}

function sumSolar(series) {
    let total = 0;
    let hadRows = false;
    const sources = new Set();
    for (const row of series || []) {
        hadRows = true;
        if (typeof row.solar_kwh === 'number') total += row.solar_kwh;
        if (row.source) sources.add(row.source);
    }
    return { total, hadRows, sources };
}

/**
 * Solar-production comparison for the current period vs the previous one.
 * Returns kWh totals, delta, delta percent, and the resolver source mix
 * (verified > raw > live) for each side.
 *
 * When there's no data on either side, `available` is false — the UI
 * should render an explicit "Data not available yet" state instead of a
 * misleading "0 kWh".
 */
// The leading `_ignoredUserId` param is kept for backwards
// compatibility with existing callers (they pass user.id from local
// state) — it's IGNORED. The trusted userId comes from the session.
// Otherwise a Customer user could pass an admin's uuid and receive
// fleet-wide totals via getAuthorizedAssets.
export async function getPeriodComparison(_ignoredUserId, period = 'week') {
    const p = ['day', 'week', 'month'].includes(period) ? period : 'week';

    const { user } = await verifyAuth();
    if (!user?.id) return { period: p, available: false, reason: 'not-authenticated' };
    const userId = user.id;

    const { assets } = await getAuthorizedAssets(userId);
    // Only sites with a PV array can contribute to a "solar production"
    // trend. Filter here so a battery-only customer doesn't get a card
    // full of misleading zeros — they get a clear no-solar state instead.
    const solarAssets = (assets || []).filter((a) => deriveSiteType(a).hasSolar);
    const siteIds = solarAssets.map((a) => a.asset_id).filter(Boolean);

    if (!assets || assets.length === 0) {
        return { period: p, available: false, reason: 'no-sites' };
    }
    if (siteIds.length === 0) {
        return { period: p, available: false, reason: 'no-solar-sites' };
    }

    const w = windowsFor(p);
    // Both windows resolved in parallel — cheap since the resolver caches.
    const [curr, prev] = await Promise.all([
        getEnergyForRange({ userId, siteIds, from: w.current.from,  to: w.current.to,  fields: ['solar_kwh'] }),
        getEnergyForRange({ userId, siteIds, from: w.previous.from, to: w.previous.to, fields: ['solar_kwh'] }),
    ]);

    const c = sumSolar(curr?.series);
    const pv = sumSolar(prev?.series);

    // "No data" — nothing on either side. Very common for brand-new sites
    // or sites the provider hasn't ingested yet.
    if (!c.hadRows && !pv.hadRows) {
        return { period: p, available: false, reason: 'no-data', window: w };
    }

    const deltaKwh = c.total - pv.total;
    const deltaPct = pv.total > 0 ? (deltaKwh / pv.total) * 100 : null;

    // Data source flag for the current window — "verified" only if every
    // day resolved from a verified row.
    const currSource = c.sources.size === 1 && c.sources.has('verified')
        ? 'verified'
        : c.sources.has('verified')
            ? 'partial'
            : c.sources.has('raw') ? 'raw' : 'live';

    return {
        period: p,
        available: true,
        currentLabel: w.current.label,
        previousLabel: w.previous.label,
        currentKwh: c.total,
        previousKwh: pv.total,
        deltaKwh,
        deltaPct,
        currentSource: currSource,
        currentHasData: c.hadRows,
        previousHasData: pv.hadRows,
        solarSiteCount: solarAssets.length,
        totalSiteCount: assets.length,
    };
}
