import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { getAuthorizedAssets } from '@/lib/services/ammp/getAuthorizedAssets';
import { getEnergyForRange } from '@/lib/services/reportData/getEnergyForRange';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Builds a weekly digest payload for one user, summing across every site
 * they're authorised to see. Reads through the historical data resolver so
 * verified rows are preferred over raw / live. The digest badge reflects
 * that mix so the customer can trust the numbers.
 *
 * Returns null if the user has no assets or no token.
 */
export async function buildWeeklyDigest(userId) {
    const { token, assets } = await getAuthorizedAssets(userId);
    if (!token || !Array.isArray(assets) || assets.length === 0) return null;
    const svc = AmmpServices();

    const to = new Date();
    const from = new Date(to.getTime() - WEEK_MS);
    const assetIds = assets.map((a) => a.asset_id?.toString()).filter(Boolean);

    // Resolver call (prefers verified > raw > live). Freshness stays live —
    // "who's still online right now" isn't a resolver concern.
    const [{ series, sourceMix }, freshness] = await Promise.all([
        getEnergyForRange({ userId, siteIds: assetIds, from, to, fields: ['solar_kwh'] }),
        svc.getAllLastDataReceived(assetIds, token),
    ]);

    // Fold the flat series into per-site totals.
    const totalsBySite = new Map();
    for (const row of series) {
        if (!totalsBySite.has(row.siteId)) totalsBySite.set(row.siteId, 0);
        totalsBySite.set(row.siteId, totalsBySite.get(row.siteId) + Number(row.solar_kwh || 0));
    }

    const perSite = assets.map((asset) => {
        const siteId = String(asset.asset_id);
        const solarKwh = totalsBySite.get(siteId) || 0;
        const freshnessRow = freshness.find((f) => f.asset_id === siteId);
        return {
            id: asset.asset_id,
            name: asset.long_name || asset.asset_name,
            solarKwh,
            lastReceived: freshnessRow?.last_received ?? null,
        };
    });

    perSite.sort((a, b) => b.solarKwh - a.solarKwh);

    const totalSolarKwh = perSite.reduce((sum, s) => sum + s.solarKwh, 0);
    const co2AvoidedKg = totalSolarKwh * 0.5543;
    const dieselAvoidedL = Math.round(totalSolarKwh * 0.28);

    // Offline sites — nothing received in the last hour by the time the
    // digest ran. Same threshold as the notifications bell.
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const offlineSites = perSite.filter((s) => {
        if (!s.lastReceived) return false;
        const t = new Date(s.lastReceived).getTime();
        return !isNaN(t) && t < oneHourAgo;
    });

    return {
        from: from.toISOString(),
        to: to.toISOString(),
        siteCount: perSite.length,
        totalSolarKwh,
        co2AvoidedKg,
        dieselAvoidedL,
        topSites: perSite.slice(0, 5),
        offlineSites,
        sourceMix, // { verified, raw, live, unavailable }
    };
}
