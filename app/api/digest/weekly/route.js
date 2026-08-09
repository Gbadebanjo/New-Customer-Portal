import { NextResponse } from 'next/server';
import db from '@/database/models';
import { buildWeeklyDigest } from '@/lib/services/digest/buildWeeklyDigest';
import { renderWeeklyDigest } from '@/lib/services/digest/renderWeeklyDigest';
import { sendMail } from '@/lib/services/mail/sendMail';
import { getAllPrefs } from '@/lib/services/userPrefs/userPrefsStore';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/digest/weekly
 *
 * Sends the weekly solar digest to every user who has opted in. Protected by
 * the same INTERNAL_LOG_SECRET header we use for other internal endpoints so
 * only an authorised cron can trigger it.
 *
 * Also accepts { userIds: [...] } in the body to send to a specific set of
 * users (useful for a "send me a preview" button or ad-hoc catch-up runs).
 */
export async function POST(request) {
    const secret = request.headers.get('x-internal-secret');
    if (secret !== process.env.INTERNAL_LOG_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let userIds = null;
    try {
        const body = await request.json().catch(() => ({}));
        if (Array.isArray(body?.userIds) && body.userIds.length > 0) {
            userIds = body.userIds;
        }
    } catch { /* no body is fine */ }

    // Opt-in is stored per-user in the JSON prefs store (kept off the DB so
    // no migration is needed). Build the recipient list from prefs when we
    // aren't given explicit userIds.
    let candidateIds = userIds;
    if (!candidateIds) {
        const prefs = getAllPrefs();
        candidateIds = Object.entries(prefs)
            .filter(([, p]) => p?.weeklyDigestEnabled === true)
            .map(([id]) => id);
    }

    if (!candidateIds || candidateIds.length === 0) {
        return NextResponse.json({ sent: 0, skipped: 0, failed: 0, details: [], reason: 'no-recipients' });
    }

    const users = await db.User.findAll({
        where: { id: candidateIds },
        raw: true,
    });

    const recipients = users.filter((u) => {
        if (!u.email) return false;
        if (userIds) return true; // explicit request: honour it
        return !u.is_locked_out && !u.not_active;
    });

    const portalBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    const results = { sent: 0, skipped: 0, failed: 0, details: [] };

    for (const user of recipients) {
        try {
            const digest = await buildWeeklyDigest(user.id);
            if (!digest || digest.siteCount === 0) {
                results.skipped++;
                results.details.push({ userId: user.id, reason: 'no-sites' });
                continue;
            }
            const html = renderWeeklyDigest({
                digest,
                userName: user.name || user.username,
                portalBaseUrl,
            });
            await sendMail({
                to: user.email,
                subject: 'Your weekly solar summary',
                html,
                text: 'Your weekly solar summary — open in a modern email client to view.',
            });
            results.sent++;
        } catch (err) {
            results.failed++;
            results.details.push({ userId: user.id, error: err?.message });
        }
    }

    return NextResponse.json(results);
}
