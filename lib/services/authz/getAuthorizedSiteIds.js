import db from '@/database/models';
import { getAssetsForCustomer } from '@/lib/services/ammp/getAssetsForCustomer';

// Roles that see everything — they bypass per-customer scoping.
const FLEET_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Small in-memory cache so the same request doesn't re-query the mapping
// table for every AMMP call in a Suspense-heavy render tree.
const CACHE_TTL_MS = 15_000;
const cache = (globalThis.__daystarAuthzCache ||= new Map());

/**
 * Central authorization gate for every AMMP data fetch.
 *
 * Returns:
 *   - `null`       → fleet-wide access (admin roles). Caller passes every id.
 *   - `string[]`   → the exact list of asset ids this user is allowed to see.
 *   - `[]`         → the user has no access (customer with no mapping yet).
 *
 * Every AMMP-touching controller must call this and filter its results. If a
 * caller forgets, downstream `intersectWithAuthorized()` below acts as the
 * last-mile guard.
 */
export async function getAuthorizedSiteIds(userOrId) {
    const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
    if (!userId) return [];

    const cached = cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let value;
    try {
        const user = typeof userOrId === 'string'
            ? await db.User.findByPk(userId, { raw: true })
            : userOrId;

        if (!user) {
            value = [];
        } else {
            const roles = Array.isArray(user.roles) ? user.roles : [];
            const isFleet = roles.some((r) => FLEET_ROLES.has(r?.name));
            if (isFleet) {
                value = null; // fleet-wide
            } else if (!user.customer) {
                // Non-admin with no customer assigned = deliberately no data.
                value = [];
            } else {
                // Live-resolve via AMMP `[Customer] X` asset-group; the
                // helper caches the fetch, so subsequent authorization
                // checks in the same render tree are ~free.
                const assets = await getAssetsForCustomer(user.customer);
                value = assets
                    .map((a) => a?.asset_id ?? a?.id)
                    .filter(Boolean)
                    .map(String);
            }
        }
    } catch (err) {
        console.error('getAuthorizedSiteIds error:', err);
        value = [];
    }

    cache.set(userId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
}

/**
 * Filter a list of asset ids (or asset objects) down to what a user is
 * allowed to see. Last-mile safety net — call this on the response from
 * any AMMP fetch that returns multiple assets.
 */
export async function intersectWithAuthorized(userOrId, items, idKey = 'asset_id') {
    const allowed = await getAuthorizedSiteIds(userOrId);
    if (allowed === null) return items;                        // fleet, no filter
    if (!allowed || allowed.length === 0) return [];
    const set = new Set(allowed.map(String));
    return items.filter((it) => {
        const id = typeof it === 'string' ? it : it?.[idKey];
        return id != null && set.has(String(id));
    });
}

/**
 * Convenience: for callers that need a single-site check (Asset Details, etc.).
 * Returns true iff the user is fleet OR the asset id is in their mapping.
 */
export async function canAccessSite(userOrId, assetId) {
    if (!assetId) return false;
    const allowed = await getAuthorizedSiteIds(userOrId);
    if (allowed === null) return true;
    return allowed.map(String).includes(String(assetId));
}

/** Explicitly bust the cache for a user — call this after mapping changes. */
export function invalidateAuthorizationCache(userId) {
    if (userId) cache.delete(userId);
    else cache.clear();
}
