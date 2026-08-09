import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '@/database/models';
import { getAllPrefs, updateUserPrefs } from '@/lib/services/userPrefs/userPrefsStore';
import { recordCronRun } from '@/lib/services/cronRuns/recordCronRun';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function shouldFireToday(freq, lastNotifiedAt) {
    if (!freq || freq === 'off') return false;
    const now = new Date();
    if (!lastNotifiedAt) return true;
    const last = new Date(lastNotifiedAt);
    if (isNaN(last.getTime())) return true;

    const dayMs = 24 * 60 * 60 * 1000;
    const daysSince = Math.floor((now.getTime() - last.getTime()) / dayMs);
    if (freq === 'daily')   return daysSince >= 1;
    if (freq === 'weekly')  return daysSince >= 7;
    if (freq === 'monthly') return daysSince >= 28;
    return false;
}

/**
 * POST /api/internal/notify/reports
 *
 * Runs daily. For each user whose reportNotifyFrequency is due (daily,
 * weekly, or monthly), checks whether there are newly-verified report_data
 * rows for their sites since their last notification. If yes, inserts one
 * `notifications` row and stamps lastReportNotifiedAt on their prefs.
 *
 * Protected by the shared INTERNAL_LOG_SECRET header. Cron hits it at ~5am
 * after the ingestion job (see /api/internal/ingest/daily).
 */
export async function POST(request) {
    const secret = request.headers.get('x-internal-secret');
    if (secret !== process.env.INTERNAL_LOG_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const triggeredByUserId = await request.json().then((b) => b?.triggeredByUserId || null).catch(() => null);

    const payload = await recordCronRun('notify_reports', { triggeredByUserId }, async () => {
        return await runNotifyReports();
    });
    return NextResponse.json(payload);
}

async function runNotifyReports() {
    const prefsMap = getAllPrefs();
    const eligibleIds = Object.entries(prefsMap)
        .filter(([, p]) => p?.reportNotifyFrequency && p.reportNotifyFrequency !== 'off')
        .filter(([, p]) => shouldFireToday(p.reportNotifyFrequency, p.lastReportNotifiedAt))
        .map(([id]) => id);

    if (eligibleIds.length === 0) {
        return { scanned: Object.keys(prefsMap).length, notified: 0 };
    }

    const users = await db.User.findAll({ where: { id: eligibleIds }, raw: true });
    let notified = 0;
    const details = [];

    for (const user of users) {
        const prefs = prefsMap[user.id] || {};
        const since = prefs.lastReportNotifiedAt
            ? new Date(prefs.lastReportNotifiedAt)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Scope: rows for this user's customer that were verified since the
        // last notification. If the user has no customer set, fall back to
        // notifying whenever new verified rows exist (they see the fleet).
        const where = { status: 'verified', verified_at: { [Op.gt]: since } };
        if (user.customer) where.customer_id = user.customer;

        const count = await db.ReportData.count({ where });
        if (count === 0) {
            details.push({ userId: user.id, reason: 'no-new-verified' });
            continue;
        }

        await db.Notification.create({
            user_id: user.id,
            kind: 'report_ready',
            title: 'Your solar report is ready',
            body:
                count === 1
                    ? '1 new verified day is available in your Reports.'
                    : `${count} new verified days are available in your Reports.`,
            href: '/reports',
            metadata: { newlyVerified: count, since: since.toISOString() },
        });

        updateUserPrefs(user.id, { lastReportNotifiedAt: new Date().toISOString() });
        notified++;
        details.push({ userId: user.id, newlyVerified: count });
    }

    return { scanned: eligibleIds.length, notified, details };
}
