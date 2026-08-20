'use server';

import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';
import { verifyAuth } from '@/lib/auth/auth';
import { canAccessSite } from '@/lib/services/authz/getAuthorizedSiteIds';

export default async function getAssetAlerts(assetId, dateFrom, dateTo) {
    try {
        // Auth + per-site authorization. Fleet-role admins pass through;
        // customer users must have the asset mapped to their customer.
        const { user } = await verifyAuth();
        if (!user?.id) return { alerts: [], error: 'Not authenticated.' };
        if (!assetId) return { alerts: [], error: 'Missing asset.' };
        if (!(await canAccessSite(user.id, assetId))) {
            return { alerts: [], error: 'You do not have permission to view this site’s alerts.' };
        }

        // Use the fleet-wide master key via getAmmpToken. The legacy
        // AmmpServices().getAuthToken() fallback pulls the per-customer
        // AMMP_API_KEY which has no fleet scope and returns 403 on most
        // assets — that's why this endpoint was silently returning zero.
        const { access_token } = await getAmmpToken();
        if (!access_token) {
            return { alerts: [], error: 'Failed to authenticate with data service.' };
        }

        const alerts = await AmmpServices().getAssetStatusInfoLog(access_token, assetId, dateFrom, dateTo);
        return { alerts };
    } catch (error) {
        console.error('Error in getAssetAlerts:', error);
        return { alerts: [], error: 'Failed to fetch alerts.' };
    }
}
