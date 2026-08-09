import AmmpServices from '@/lib/services/ammp/AmmpServices';
import KpiCards from './KpiCards';
import { deriveSiteType } from '@/lib/services/siteType/deriveSiteType';

/**
 * Async server component: fetches historic-only totals for the fleet and
 * hands them to the pure KpiCards renderer. Only PV-having sites feed
 * the totals — a battery-only site would contribute zeros and skew the
 * "sites contributing" copy in the KPI subtitles.
 */
export default async function KpiCardsSection({ assets, token }) {
    if (!token || !Array.isArray(assets) || assets.length === 0) {
        return <KpiCards totals={null} />;
    }
    const solarAssets = assets.filter((a) => deriveSiteType(a).hasSolar);
    if (solarAssets.length === 0) {
        return <KpiCards totals={null} />;
    }
    const totals = await AmmpServices().fetchHistoricTotalsOnly(solarAssets, token);
    return <KpiCards totals={totals} />;
}
