import db from '@/database/models';
import { ServiceConstants } from '@/utils/constants';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';

// customer_id → { assets, expiresAt } — asset_groups don't change often,
// so 5 minutes is plenty and shaves ~1s off every dashboard render for a
// customer user. Bust manually via `invalidateCustomerAssetsCache` if the
// AMMP grouping changes.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = (globalThis.__daystarCustomerAssetsCache ||= new Map());

/**
 * Returns the AMMP assets that belong to a customer, resolved live via
 * the `[Customer] <company_name>` asset-group convention. Under the
 * master-key model this is the ONLY correct way to scope a customer's
 * data — no local mapping table, no free-typed names, no fleet-wide
 * fetch-and-filter.
 *
 * Cached per-customer for 5 minutes so a Suspense-heavy dashboard
 * render doesn't re-fetch the group on every parallel controller call.
 */
export async function getAssetsForCustomer(customerId) {
    if (!customerId) return [];

    const hit = cache.get(customerId);
    if (hit && hit.expiresAt > Date.now()) return hit.assets;

    try {
        const customer = await db.Customer.findByPk(customerId, {
            attributes: ['id', 'company_name'],
            raw: true,
        });
        if (!customer?.company_name) return [];

        const { access_token } = await getAmmpToken();
        if (!access_token) return [];

        const baseUrl = ServiceConstants.AmmpServerBaseUrl;
        const authHeaders = {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };

        const groupsRes = await fetch(`${baseUrl}/v1/asset_groups`, {
            cache: 'no-store',
            method: 'GET',
            headers: authHeaders,
        });
        const groups = await groupsRes.json();
        const wantName = `[customer] ${customer.company_name.trim().toLowerCase()}`;
        const group = Array.isArray(groups)
            ? groups.find(
                  (g) => (g?.group_name || g?.name || '').trim().toLowerCase() === wantName
              )
            : null;
        const groupId = group?.group_id || group?.id;
        if (!groupId) return cachePut(customerId, []);

        const membersRes = await fetch(`${baseUrl}/v1/asset_groups/${groupId}/members`, {
            cache: 'no-store',
            method: 'GET',
            headers: authHeaders,
        });
        const body = await membersRes.json();
        // AMMP returns { group_id, group_name, members: [...] }, not a bare
        // array — tolerate a raw array too in case the API shape shifts.
        const members = Array.isArray(body?.members)
            ? body.members
            : Array.isArray(body)
                ? body
                : [];

        // `/v1/asset_groups/{id}/members` returns a stripped-down asset
        // (id/name/long_name only) — no `total_pv_power`, no `tags`. Every
        // downstream consumer (deriveSiteType, KPI totals, PowerLineChart)
        // needs the full asset shape. Hydrate each member via its own
        // `/v1/assets/{id}` call, in parallel, capped at 8 concurrent so a
        // large customer doesn't burst AMMP.
        const enriched = await enrichAssets(members, baseUrl, authHeaders);
        return cachePut(customerId, enriched);
    } catch (err) {
        console.error('getAssetsForCustomer error:', err);
        return [];
    }
}

function cachePut(customerId, assets) {
    cache.set(customerId, { assets, expiresAt: Date.now() + CACHE_TTL_MS });
    return assets;
}

// Fetch full asset details for a list of stripped members, up to 8 in
// parallel. Individual failures fall back to the stripped shape rather
// than dropping the site — a site with unknown metadata is still worth
// showing.
async function enrichAssets(members, baseUrl, authHeaders) {
    const LIMIT = 8;
    const out = new Array(members.length);
    let cursor = 0;

    async function worker() {
        while (true) {
            const i = cursor++;
            if (i >= members.length) return;
            const m = members[i];
            const id = m?.asset_id;
            if (!id) { out[i] = m; continue; }
            try {
                const r = await fetch(`${baseUrl}/v1/assets/${id}`, {
                    cache: 'no-store',
                    method: 'GET',
                    headers: authHeaders,
                });
                if (!r.ok) { out[i] = m; continue; }
                const full = await r.json();
                // Merge — full-asset shape wins for overlapping keys, but
                // members-list ids/names are preserved as fallback.
                out[i] = { ...m, ...full };
            } catch {
                out[i] = m;
            }
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(LIMIT, members.length) }, worker)
    );
    return out;
}

export function invalidateCustomerAssetsCache(customerId) {
    if (customerId) cache.delete(customerId);
    else cache.clear();
}
