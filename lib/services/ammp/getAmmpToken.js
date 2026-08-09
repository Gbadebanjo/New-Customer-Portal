import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { ServiceConstants } from '@/utils/constants';

/**
 * Resolves an AMMP bearer token using the fleet-wide master key.
 *
 * There is no per-user or per-customer key any more. All AMMP requests use
 * the same credential; which sites a user can see is enforced separately in
 * code based on their `customer` field + role.
 *
 * `userId` is accepted for backwards-compat with existing call sites but
 * is not used.
 */
export async function getAmmpToken(/* userId */) {
    const key = ServiceConstants.AmmpMasterKey || ServiceConstants.AmmpApiKey;
    if (!key) return { access_token: null };
    const { access_token } = await AmmpServices().getAuthToken(key);
    return { access_token: access_token ?? null };
}
