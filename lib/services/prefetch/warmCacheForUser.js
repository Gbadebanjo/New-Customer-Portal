import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { getAuthorizedAssets } from '@/lib/services/ammp/getAuthorizedAssets';
import { getAuthorizedSiteIds } from '@/lib/services/authz/getAuthorizedSiteIds';

// Fleet users (admin roles) see all 454 sites — prefetching everything for
// them would burn a lot of API budget for no perceived benefit (their views
// are filter-first anyway).
const MAX_SITES_TO_PREFETCH = 40;

/**
 * Fire-and-forget "warm the cache for this user's next page load". Called
 * from the login server action right after password check succeeds; runs
 * while the user is typing their 2FA code, so by the time the Dashboard
 * mounts, every fetch it needs is already cached.
 *
 * Never throws. Never awaits — the login flow does not depend on it.
 */
export function warmCacheForUser(userId) {
    if (!userId) return;
    // Kick off in the background; the caller must not await this.
    Promise.resolve().then(() => runPrefetch(userId))
        .catch((err) => console.error('warmCacheForUser error', err));
}

async function runPrefetch(userId) {
    const allowed = await getAuthorizedSiteIds(userId);

    // Fleet users bypass prefetch entirely — see MAX_SITES_TO_PREFETCH.
    if (allowed === null) return;
    if (!Array.isArray(allowed) || allowed.length === 0) return;

    const { token, assets } = await getAuthorizedAssets(userId);
    if (!token || !assets || assets.length === 0) return;

    const svc = AmmpServices();
    const ids = assets
        .map((a) => a.asset_id?.toString())
        .filter(Boolean)
        .slice(0, MAX_SITES_TO_PREFETCH);

    // All three warm-ups fire concurrently. Individual failures are OK — the
    // Dashboard will just miss on those specific caches and refetch.
    await Promise.allSettled([
        svc.getAllLastDataReceived(ids, token),
        svc.getAllMostRecentData(ids, token),
        // historic totals are a big call — kick it off but don't block on it
        svc.fetchHistoricTotalsOnly(assets, token),
    ]);
}
