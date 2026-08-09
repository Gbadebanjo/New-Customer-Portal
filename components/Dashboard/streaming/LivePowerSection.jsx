import AmmpServices from '@/lib/services/ammp/AmmpServices';
import LivePowerCard from './LivePowerCard';

/**
 * Async server component: fetches most-recent totals only. Fast (short TTL),
 * arrives independently of the historic KPIs.
 */
export default async function LivePowerSection({ assets, token, autoRefreshMs }) {
    if (!token || !Array.isArray(assets) || assets.length === 0) {
        return <LivePowerCard totals={null} autoRefreshMs={autoRefreshMs} />;
    }
    const totals = await AmmpServices().fetchLivePowerTotalsOnly(assets, token);
    return <LivePowerCard totals={totals} autoRefreshMs={autoRefreshMs} />;
}
