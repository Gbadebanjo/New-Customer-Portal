import db from '@/database/models';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';
import { getAssetsForCustomer } from '@/lib/services/ammp/getAssetsForCustomer';

const FLEET_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

/**
 * The one function every data fetch should call to get "the assets this
 * user is allowed to see". Wraps token + fetch + scoping so no caller
 * has to remember the three steps.
 *
 * Fleet users → all AMMP assets. Customer users → only the members of
 * their `[Customer] <company_name>` asset-group. Customer users NEVER
 * trigger the 454-asset fleet-wide fetch.
 *
 * Returns { token, assets }. Empty array means the user has no access
 * (no customer, no matching group, or upstream fetch failed).
 */
export async function getAuthorizedAssets(userOrId) {
    const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
    if (!userId) return { token: null, assets: [] };

    const user = typeof userOrId === 'string'
        ? await db.User.findByPk(userId, { raw: true })
        : userOrId;
    if (!user) return { token: null, assets: [] };

    const { access_token: token } = await getAmmpToken(userId);
    if (!token) return { token: null, assets: [] };

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const isFleet = roles.some((r) => FLEET_ROLES.has(r?.name));

    if (!isFleet) {
        if (!user.customer) return { token, assets: [] };
        const assets = await getAssetsForCustomer(user.customer);
        return { token, assets };
    }

    // Fleet users — full fleet fetch (this is the expensive path, but
    // customers no longer hit it).
    let raw = [];
    try {
        const result = await AmmpServices().getAssets(token);
        raw = Array.isArray(result) ? result : [];
    } catch (err) {
        console.error('getAuthorizedAssets: fetch failed', err);
        return { token, assets: [] };
    }
    return { token, assets: raw };
}
