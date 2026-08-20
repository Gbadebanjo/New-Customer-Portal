import db from '@/database/models';
import { MailTypes, sendEmailByType } from '@/lib/services/mail/sendMail';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Fan out the "you have a new report" in-app notification + email to
 * every user attached to `customerId`. Best-effort — the caller
 * shouldn't fail on notification errors. Skipped entirely when
 * `customerId` is empty (a Daystar user editing an un-mapped site).
 *
 * `verifiedCount` is the number of days the send call transitioned
 * from `in_progress` → `verified`, used for the copy in the email.
 */
export async function notifyCustomerOfNewReport({ customerId, siteId, month, year, verifiedCount }) {
    if (!customerId) return;

    const users = await db.User.findAll({ where: { customer: customerId }, raw: true });
    if (users.length === 0) return;

    // Site name is only useful for a friendlier email subject. Leaving
    // null lets the mail template fall back to "your site".
    const siteName = null;

    const periodLabel = MONTHS[(month || 1) - 1] ? `${MONTHS[(month || 1) - 1]} ${year}` : '';
    const href = `/reports?site=${encodeURIComponent(siteId)}&month=${month}&year=${year}`;
    const title = 'A new report is ready';
    const body = verifiedCount === 1
        ? `1 new verified day is available${siteName ? ` for ${siteName}` : ''}${periodLabel ? ` (${periodLabel})` : ''}.`
        : `${verifiedCount} new verified days are available${siteName ? ` for ${siteName}` : ''}${periodLabel ? ` (${periodLabel})` : ''}.`;

    // In-app notifications — one row per user.
    const rows = users.map((u) => ({
        user_id: u.id,
        kind: 'report_ready',
        title,
        body,
        href,
        metadata: { siteId, month, year, verifiedCount, customerId },
    }));
    try {
        await db.Notification.bulkCreate(rows);
    } catch (err) {
        console.error('notifyCustomerOfNewReport: bulkCreate failed:', err?.message);
    }

    // "You have a new report" email per customer user.
    const rawBase = process.env.NEXT_PUBLIC_BASE_URL || '';
    const base = process.env.NODE_ENV === 'production'
        ? rawBase.replace(/^http:\/\//, 'https://')
        : rawBase;
    const link = `${base}${href}`;
    await Promise.all(users.filter((u) => u.email).map((u) =>
        sendEmailByType(MailTypes.REPORT_READY, u.email, {
            name: u.name || 'there',
            siteName: siteName || '',
            periodLabel,
            link,
        }).catch((err) => console.error('REPORT_READY mail failed:', u.email, err?.message))
    ));
}
