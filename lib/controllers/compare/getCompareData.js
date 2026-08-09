'use server';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { getAuthorizedAssets } from '@/lib/services/ammp/getAuthorizedAssets';
import { getEnergyForRange } from '@/lib/services/reportData/getEnergyForRange';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Loads a compact comparison payload for the given site IDs, over the
 * requested lookback window (default 7 days). Each site returns the
 * numbers we want to show side-by-side in a table + tiny bar chart.
 */
export async function getCompareData(userId, assetIds, windowDays = 7) {
    const { token, assets: authorized } = await getAuthorizedAssets(userId);
    if (!token || !Array.isArray(assetIds) || assetIds.length === 0) return { sites: [] };

    const svc = AmmpServices();
    // Only pull freshness — the asset metadata (long_name, total_pv_power)
    // comes from the caller's authorized list, which is already cached.
    const freshness = await svc.getAllLastDataReceived(assetIds, token);
    const byId = new Map((authorized || []).map((a) => [a.asset_id?.toString(), a]));

    const to = new Date();
    const from = new Date(to.getTime() - windowDays * DAY_MS);

    // Historical solar/consumption/generator through the resolver — this is
    // the layer that prefers verified > raw > live. Environmental-impact CO2
    // is still fetched live per site (not stored in report_data).
    const [{ series, sourceMix }, envs] = await Promise.all([
        getEnergyForRange({
            userId,
            siteIds: assetIds.map(String),
            from,
            to,
            fields: ['solar_kwh', 'consumption_kwh', 'generator_kwh', 'grid_kwh'],
        }),
        Promise.all(assetIds.map((id) => svc.getEnvironmentalImpact(token, id, from, to).catch(() => null))),
    ]);

    // Fold the flat series into per-site totals + a per-site source flag.
    const perSiteTotals = new Map();
    for (const row of series) {
        if (!perSiteTotals.has(row.siteId)) {
            perSiteTotals.set(row.siteId, { solar: 0, consumption: 0, generator: 0, grid: 0, sources: new Set() });
        }
        const t = perSiteTotals.get(row.siteId);
        t.solar       += Number(row.solar_kwh ?? 0);
        t.consumption += Number(row.consumption_kwh ?? 0);
        t.generator   += Number(row.generator_kwh ?? 0);
        t.grid        += Number(row.grid_kwh ?? 0);
        t.sources.add(row.source);
    }

    const sites = assetIds.map((id, i) => {
        const meta = byId.get(id.toString()) || {};
        const totals = perSiteTotals.get(String(id)) || { solar: 0, consumption: 0, generator: 0, grid: 0, sources: new Set() };

        const solarKwh = totals.solar;
        const denominator = totals.solar + totals.grid + totals.generator;
        const solarSharePct = denominator > 0 ? (totals.solar / denominator) * 100 : null;

        // total_pv_power is in W (AMMP convention). Convert to kW.
        const capacityKw = meta.total_pv_power != null
            ? Number(meta.total_pv_power) / 1000
            : null;

        const freshnessRow = freshness.find((f) => f.asset_id === id.toString());

        // CO2: prefer AMMP's verified figure. Fallback uses 0.5543 kg per kWh.
        const co2AvoidedKg = envs[i]?.co2AvoidedKg ?? (solarKwh * 0.5543);

        // Data source flag for this site — verified only if every day is verified.
        let dataSource = 'live';
        if (totals.sources.size === 1 && totals.sources.has('verified')) dataSource = 'verified';
        else if (totals.sources.has('verified')) dataSource = 'partial';
        else if (totals.sources.has('raw')) dataSource = 'raw';

        return {
            id,
            name: meta.long_name || meta.asset_name || 'Unnamed site',
            capacityKw,
            solarKwh,
            solarSharePct,
            co2AvoidedKg,
            co2Source: envs[i]?.co2AvoidedKg != null ? 'verified' : 'estimated',
            dataSource,
            lastReceived: freshnessRow?.last_received ?? null,
        };
    });

    return {
        windowDays,
        sites,
        sourceMix, // { verified, raw, live, unavailable } across the whole result
    };
}
