import AmmpServices from '@/lib/services/ammp/AmmpServices';
import ActiveSitesPanel from './ActiveSitesPanel';

/**
 * Async server component: fetches the freshness map for the given assets and
 * hands it to the ActiveSitesPanel client component.
 */
export default async function ActiveSitesSection({ assets, token }) {
    let freshnessMap = {};
    if (token && Array.isArray(assets) && assets.length > 0) {
        const ids = assets.map((a) => a.asset_id?.toString()).filter(Boolean);
        const freshness = await AmmpServices().getAllLastDataReceived(ids, token);
        freshnessMap = Object.fromEntries((freshness || []).map((f) => [f.asset_id, f.last_received]));
    }
    return <ActiveSitesPanel assets={assets} freshnessMap={freshnessMap} />;
}
