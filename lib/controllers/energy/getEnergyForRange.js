'use server';
import { verifyAuth } from '@/lib/auth/auth';
import { canAccessSite } from '@/lib/services/authz/getAuthorizedSiteIds';
import { getEnergyForRange as resolveEnergy } from '@/lib/services/reportData/getEnergyForRange';

/**
 * Server action used by the Asset Details "Energy Production" date picker.
 * Delegates to the historical data resolver so verified rows win over raw
 * / live, then reshapes into the totals object the progress chart expects.
 *
 * Values are returned in **Wh** because the caller pipes them through
 * `toStringEnergy`, which formats Wh into Wh / kWh / MWh depending on
 * magnitude. `null` on error.
 */
export async function getEnergyForRange(assetId, fromIso, toIso) {
    try {
        if (!assetId || !fromIso || !toIso) return null;

        const { user } = await verifyAuth();
        if (!user?.id) return null;
        // Per-site authorization — resolver only uses userId for its
        // AMMP token, not to filter DB rows, so a Customer user could
        // otherwise pass any assetId and receive that site's report
        // data. Mirrors the fix on /api/ammp/historic-*.
        if (!(await canAccessSite(user.id, assetId))) return null;

        const from = new Date(fromIso);
        const to = new Date(toIso);
        if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
        to.setUTCHours(23, 59, 59, 999);

        const { series, sourceMix } = await resolveEnergy({
            userId: user.id,
            siteIds: [String(assetId)],
            from,
            to,
            fields: ['solar_kwh', 'consumption_kwh', 'generator_kwh', 'grid_kwh'],
        });

        // Fold the per-day series into totals and convert kWh → Wh for the
        // existing chart consumer.
        let solar = 0, generator = 0, grid = 0;
        for (const r of series) {
            solar     += Number(r.solar_kwh ?? 0);
            generator += Number(r.generator_kwh ?? 0);
            grid      += Number(r.grid_kwh ?? 0);
        }
        const totalKwh = solar + generator + grid;

        return {
            totalEnergyProduced: totalKwh * 1000,
            energyFromSolar:     solar * 1000,
            energyFromGenerator: generator * 1000,
            energyFromGrid:      grid * 1000,
            from: from.toISOString(),
            to: to.toISOString(),
            sourceMix,
        };
    } catch (err) {
        console.error('getEnergyForRange error:', err);
        return null;
    }
}
