'use server';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';
import { buildWeeklyDigest } from '@/lib/services/digest/buildWeeklyDigest';
import { renderWeeklyDigest } from '@/lib/services/digest/renderWeeklyDigest';
import { sendMail } from '@/lib/services/mail/sendMail';
import { getAllPrefs } from '@/lib/services/userPrefs/userPrefsStore';

const ADMIN_ROLES = new Set(['Admin', 'Daystar Portal Admin']);

/**
 * Admin-triggered weekly-digest send. Fires the digest to every user who
 * has opted in via their profile toggle. Returns per-user tallies so the
 * UI can show a summary — no separate cron round-trip needed.
 *
 * Restricted to Admin / Daystar Portal Admin roles. Any authenticated
 * user hitting this without those roles gets a 403-style error.
 */
export async function triggerWeeklyDigestForAll() {
    const { user } = await verifyAuth();
    if (!user?.id) return { ok: false, error: 'Not authenticated' };

    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    if (!roles.some((r) => ADMIN_ROLES.has(r?.name))) {
        return { ok: false, error: 'Not authorised' };
    }

    // Recipient list from the user-prefs store (weeklyDigestEnabled === true).
    const prefs = getAllPrefs();
    const candidateIds = Object.entries(prefs)
        .filter(([, p]) => p?.weeklyDigestEnabled === true)
        .map(([id]) => id);

    if (candidateIds.length === 0) {
        return { ok: true, sent: 0, skipped: 0, failed: 0, reason: 'no-recipients' };
    }

    const users = await db.User.findAll({ where: { id: candidateIds }, raw: true });
    const recipients = users.filter(
        (u) => u.email && !u.is_locked_out && !u.not_active
    );

    const portalBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    const results = { sent: 0, skipped: 0, failed: 0 };

    for (const target of recipients) {
        try {
            const digest = await buildWeeklyDigest(target.id);
            if (!digest || digest.siteCount === 0) {
                results.skipped++;
                continue;
            }
            const html = renderWeeklyDigest({
                digest,
                userName: target.name || target.username,
                portalBaseUrl,
            });
            await sendMail({
                to: target.email,
                subject: 'Your weekly solar summary',
                html,
                text: 'Your weekly solar summary — open in a modern email client to view.',
            });
            results.sent++;
        } catch (err) {
            console.error('digest send failed for', target.id, err);
            results.failed++;
        }
    }

    return { ok: true, ...results, candidates: candidateIds.length };
}
