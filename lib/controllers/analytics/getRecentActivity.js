'use server';
import db from '@/database/models';

// Small helper — safely fetch a batch from a model, empty array on failure so
// the whole feed doesn't die when one source table is unavailable.
async function safe(fn) {
    try { return await fn(); } catch { return []; }
}

/**
 * Build a chronological "recent activity" feed by mixing three sources:
 *   - audit_logs (user-driven events — logins, edits, deletes)
 *   - cron_runs  (system events — ingestion, notifications)
 *   - notifications (personal + system alerts already surfaced elsewhere)
 *
 * Everything is normalised to a common shape, merged, sorted by time,
 * and clipped to the last `limit` items.
 */
export async function getRecentActivity({ limit = 20 } = {}) {
    const [audits, crons, notifs] = await Promise.all([
        safe(() => db.AuditLog.findAll({
            order: [['created_at', 'DESC']],
            limit: 20,
            raw: true,
        })),
        safe(() => db.CronRun.findAll({
            order: [['started_at', 'DESC']],
            limit: 10,
            raw: true,
        })),
        safe(() => db.Notification.findAll({
            order: [['created_at', 'DESC']],
            limit: 10,
            raw: true,
        })),
    ]);

    const events = [
        ...audits.map((a) => ({
            id: `audit:${a.id}`,
            kind: 'audit',
            title: a.name || 'Audit event',
            subtitle: [a.user_name, a.url].filter(Boolean).join(' · '),
            at: a.created_at,
            outcome: a.has_exception === 'true' ? 'failed' : 'ok',
        })),
        ...crons.map((c) => ({
            id: `cron:${c.id}`,
            kind: 'cron',
            title: c.kind === 'ingest_daily'
                ? 'Daily ingestion'
                : c.kind === 'notify_reports'
                    ? 'Report-ready notifications'
                    : c.kind,
            subtitle: c.status === 'ok'
                ? summariseCronPayload(c.summary)
                : c.status === 'failed'
                    ? (c.error_text || 'Failed')
                    : 'Started',
            at: c.finished_at || c.started_at,
            outcome: c.status === 'failed' ? 'failed' : (c.status === 'running' ? 'running' : 'ok'),
        })),
        ...notifs.map((n) => ({
            id: `notif:${n.id}`,
            kind: 'notification',
            title: n.title,
            subtitle: n.body || '',
            at: n.created_at,
            outcome: 'info',
        })),
    ]
        .filter((e) => e.at)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, limit);

    return { events };
}

function summariseCronPayload(payload) {
    if (!payload || typeof payload !== 'object') return 'Completed';
    if (typeof payload.ok === 'number' || typeof payload.failed === 'number') {
        const parts = [];
        if (payload.ok != null) parts.push(`${payload.ok} ok`);
        if (payload.failed) parts.push(`${payload.failed} failed`);
        return parts.length ? parts.join(', ') : 'Completed';
    }
    if (typeof payload.notified === 'number') {
        return payload.notified === 0
            ? 'No notifications sent'
            : `Notified ${payload.notified}`;
    }
    return 'Completed';
}
