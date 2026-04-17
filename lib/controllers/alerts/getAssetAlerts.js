'use server';

import AmmpServices from '@/lib/services/ammp/AmmpServices';

export default async function getAssetAlerts(assetId, dateFrom, dateTo) {
    try {
        const { access_token } = await AmmpServices().getAuthToken();
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
