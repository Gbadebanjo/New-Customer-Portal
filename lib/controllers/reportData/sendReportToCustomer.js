'use server';
import ReportData from '@/database/models/ReportData';
import db from '@/database/models';
import { revalidatePath } from 'next/cache';
import { verifyAuth } from '@/lib/auth/auth';
import { invalidatePrefix } from '@/lib/services/cache/memoryCache';
import { logAuditEvent } from '@/lib/services/logging/logAuditEvent';
import { notifyCustomerOfNewReport } from '@/lib/services/reports/notifyCustomerOfNewReport';

// Sending a report is a review-and-publish action, reserved for
// Portal Admin + Admin. DCA is deliberately excluded — they can review
// but not publish. Customer users obviously can't send at all.
const SEND_ROLES = new Set(['Admin', 'Daystar Portal Admin']);

/**
 * Publish a site's in-progress report rows to the customer.
 *
 * Every `in_progress` row for the (siteId, month, year) tuple is
 * flipped to `status='verified'`, timestamped with `verified_at` and
 * `verified_by_user_id`, and the customer notification/email is fired.
 * Rows that are already `verified` or still `raw` are left alone.
 *
 * Returns:
 *   { ok: true, sent: <number of rows flipped> }
 *   { ok: false, error }
 */
export async function sendReportToCustomer({ siteId, month, year, customerId = '' }) {
    if (!siteId || !month || !year) {
        return { ok: false, error: 'Missing siteId / month / year.' };
    }

    // Auth: session + Admin-or-Portal-Admin role.
    const { user } = await verifyAuth();
    if (!user?.id) return { ok: false, error: 'Not authenticated.' };
    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    const canSend = roles.some((r) => SEND_ROLES.has(r?.name));
    if (!canSend) {
        return { ok: false, error: 'Only Admin or Portal Admin can send reports.' };
    }

    const where = {
        site_id: String(siteId),
        report_month: Number(month),
        report_year: Number(year),
        status: 'in_progress',
    };

    // How many rows are we about to publish? Return the count so the UI
    // can display "12 days sent to <customer>".
    const pending = await ReportData.count({ where });
    if (pending === 0) {
        return { ok: false, error: 'No days in progress to send.' };
    }

    const now = new Date();
    await ReportData.update(
        {
            status: 'verified',
            verified_at: now,
            verified_by_user_id: user.id,
        },
        { where }
    );

    // Bust the resolver cache so downstream Compare / Dashboard widgets
    // pick up the newly-verified numbers on next paint.
    invalidatePrefix('resolver:');
    revalidatePath('/reports');
    revalidatePath('/admin/analytics');
    revalidatePath('/fleet');

    // Fire the customer notification best-effort. Any failure here
    // (email transport down, no users on the customer, etc.) is
    // non-fatal — the send has already happened at the data layer.
    notifyCustomerOfNewReport({
        customerId,
        siteId,
        month,
        year,
        verifiedCount: pending,
    }).catch((err) => console.error('notifyCustomerOfNewReport failed:', err?.message));

    // Audit trail — separate from the customer notification.
    try {
        await logAuditEvent({
            name: 'Report Sent To Customer',
            userName: full?.username || full?.email || 'Unknown',
            url: `/reports?site=${siteId}&month=${month}&year=${year}`,
            method: 'POST',
            extra: { siteId, month, year, customerId, sent: pending },
        });
    } catch { /* non-fatal */ }

    return { ok: true, sent: pending };
}
