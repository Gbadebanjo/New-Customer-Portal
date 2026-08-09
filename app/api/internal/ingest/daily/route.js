import { NextResponse } from 'next/server';
import db from '@/database/models';
import {
    ingestReportDataForCustomer,
    resolveIngestionToken,
} from '@/lib/services/ingestion/ingestReportData';
import { invalidatePrefix } from '@/lib/services/cache/memoryCache';
import { recordCronRun } from '@/lib/services/cronRuns/recordCronRun';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/internal/ingest/daily
 *
 * Iterates every customer that has entries in customer_site_mapping and
 * pulls the last `daysBack` days of per-site rollups into report_data as
 * status='raw'. Verified rows are never overwritten.
 *
 * Body (optional):
 *   { customerIds?: string[], daysBack?: number, triggeredByUserId?: string }
 *
 * If customerIds is passed, only those customers are ingested. Otherwise
 * every customer with any mapping is processed.
 */
export async function POST(request) {
    const secret = request.headers.get('x-internal-secret');
    if (secret !== process.env.INTERNAL_LOG_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const daysBack = Math.max(1, Math.min(31, Number(body?.daysBack) || 1));
    const customerIds = Array.isArray(body?.customerIds) && body.customerIds.length > 0 ? body.customerIds : null;
    const triggeredByUserId = body?.triggeredByUserId || null;

    const payload = await recordCronRun('ingest_daily', { triggeredByUserId }, async () => {
        const now = new Date();
        // Inclusive window from `daysBack` days ago through end-of-yesterday.
        const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 1);
        const from = new Date(to.getTime() - (daysBack - 1) * 86_400_000);

        // One token for the whole run. Master-key first, env fallback otherwise.
        const { access_token: token, source } = await resolveIngestionToken();
        if (!token) {
            return {
                window: { from: from.toISOString(), to: to.toISOString() },
                error: 'No AMMP token available. Set AMMP_MASTER_KEY (preferred) or AMMP_API_KEY in the environment.',
                customersProcessed: 0,
            };
        }

        // Build the per-customer site list from customer_site_mapping. This is
        // the "single source of truth" for who sees what — populated by the
        // sync_asset_groups cron.
        const mappingWhere = customerIds ? { customer_id: customerIds } : {};
        const mappings = await db.CustomerSiteMapping.findAll({
            where: mappingWhere,
            attributes: ['customer_id', 'asset_id'],
            raw: true,
        });

        // Group by customer_id.
        const byCustomer = new Map();
        for (const m of mappings) {
            if (!byCustomer.has(m.customer_id)) byCustomer.set(m.customer_id, []);
            byCustomer.get(m.customer_id).push(m.asset_id);
        }

        const results = {
            tokenSource: source,
            window: { from: from.toISOString(), to: to.toISOString() },
            customersProcessed: 0,
            sitesIngested: 0,
            rowsCreated: 0,
            rowsUpdated: 0,
            rowsSkipped: 0,
            errors: [],
            details: [],
        };

        if (byCustomer.size === 0) {
            results.warning = 'No customer_site_mapping rows yet — did the sync_asset_groups cron run?';
            return results;
        }

        for (const [customerId, siteIds] of byCustomer.entries()) {
            try {
                const r = await ingestReportDataForCustomer(customerId, siteIds, { from, to, token });
                if (r.ok) {
                    results.customersProcessed++;
                    results.sitesIngested += r.sites || 0;
                    results.rowsCreated   += r.created || 0;
                    results.rowsUpdated   += r.updated || 0;
                    results.rowsSkipped   += r.skipped || 0;
                    results.details.push({ customerId, sites: r.sites, created: r.created, updated: r.updated });
                } else {
                    results.errors.push({ customerId, reason: r.reason });
                }
            } catch (err) {
                results.errors.push({ customerId, error: err?.message });
            }
        }

        if (results.rowsCreated > 0 || results.rowsUpdated > 0) {
            invalidatePrefix('resolver:');
        }

        return results;
    });

    return NextResponse.json(payload);
}
