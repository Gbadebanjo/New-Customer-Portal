'use server';
import { verifyAuth } from '@/lib/auth/auth';
import db from '@/database/models';
import {
    ingestReportDataForCustomer,
    resolveIngestionToken,
} from '@/lib/services/ingestion/ingestReportData';
import { invalidatePrefix } from '@/lib/services/cache/memoryCache';

const NOC_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

/**
 * Ad-hoc "pull fresh raw values from the provider for this month/site".
 * Verified rows are protected; raw rows are overwritten with the latest
 * snapshot. Restricted to NOC roles.
 *
 * Under the master-key model there is no local mapping table — the caller
 * (the Reports screen) already knows which customer they're viewing, so
 * they pass `customerId` in. We tag the ingested rows with that id.
 */
export async function refreshReportFromSource({ siteId, year, month, customerId }) {
    const { user } = await verifyAuth();
    if (!user?.id) return { ok: false, error: 'Not authenticated' };

    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    if (!roles.some((r) => NOC_ROLES.has(r?.name))) {
        return { ok: false, error: 'Not authorised' };
    }
    if (!siteId || !year || !month) return { ok: false, error: 'Missing arguments' };

    const { access_token: token } = await resolveIngestionToken();
    if (!token) return { ok: false, error: 'No AMMP token available' };

    // Whole calendar month for the given (year, month), UTC.
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // last day

    const result = await ingestReportDataForCustomer(
        customerId || '',
        [String(siteId)],
        { from, to, token }
    );

    if (result?.ok && ((result.created ?? 0) > 0 || (result.updated ?? 0) > 0)) {
        invalidatePrefix('resolver:');
    }
    return result;
}
