import AmmpServices from '@/lib/services/ammp/AmmpServices';
import DataFreshness from '@/components/ui/DataFreshness/DataFreshness';

/**
 * Fetches the "last data received" timestamp and renders the small
 * Live/Delayed/Offline pill next to the site name.
 */
export default async function FreshnessBadgeBlock({ assetId, token }) {
    if (!token || !assetId) {
        return <DataFreshness lastReceived={null} />;
    }
    const lastReceived = await AmmpServices().getLastDataReceived(token, assetId);
    return <DataFreshness lastReceived={lastReceived} />;
}
