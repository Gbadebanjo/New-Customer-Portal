import { NextResponse } from 'next/server';
import { syncAssetGroups } from '@/lib/services/ingestion/syncAssetGroups';
import { recordCronRun } from '@/lib/services/cronRuns/recordCronRun';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/internal/sync/asset-groups
 *
 * Syncs AMMP asset_groups → customer_site_mapping so the authorization
 * choke-point (getAuthorizedSiteIds) knows who can see what. Protected by
 * the shared INTERNAL_LOG_SECRET header. Should run nightly, before the
 * data ingestion cron.
 */
export async function POST(request) {
    const secret = request.headers.get('x-internal-secret');
    if (secret !== process.env.INTERNAL_LOG_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const triggeredByUserId = await request.json()
        .then((b) => b?.triggeredByUserId || null)
        .catch(() => null);

    const payload = await recordCronRun('sync_asset_groups', { triggeredByUserId }, async () => {
        return await syncAssetGroups();
    });
    return NextResponse.json(payload);
}
