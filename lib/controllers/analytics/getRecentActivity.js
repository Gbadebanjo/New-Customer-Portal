'use server';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';

// Only the top-tier `Admin` role can pull the merged activity feed —
// it aggregates security_logs (failed logins, IPs), audit_logs, cron
// runs, and personal notifications across every user, matching the
// gating on /admin/audit-logs.
const SUPER_ADMIN_ROLE = 'Admin';

// Small helper — swallow-and-empty so one source table missing (schema
// drift, fresh install) doesn't take out the whole activity feed.
async function safe(fn) {
    try { return await fn(); } catch { return []; }
}

// Actions we treat as "failed / attention needed" when styling the feed.
const SECURITY_FAILED_ACTIONS = new Set([
    'LoginFailed',
    'TwoFactorFailed',
    'TwoFactorSetupFailed',
    'AccountLocked',
    'LoginRateLimitedByIp',
    'LoginAttemptWhileLocked',
]);

const SECURITY_ADMIN_ACTIONS = new Set([
    'TwoFactorResetByAdmin',
    'PasswordResetRequestedByAdmin',
]);

function humaniseSecurityAction(action) {
    // ActionName in security_logs is a code (LoginFailed, TwoFactorEnabled, …).
    // Turn it into something a human wants to see in a feed.
    const map = {
        LoginSucceeded: 'Login',
        LoginFailed: 'Failed login',
        LoginRateLimitedByIp: 'Rate-limited login attempt',
        LoginAttemptWhileLocked: 'Login attempt while locked',
        LoginRequires2FA: '2FA challenge issued',
        LoginRequires2FASetup: '2FA setup required',
        TwoFactorFailed: 'Failed 2FA code',
        TwoFactorEnabled: '2FA enabled',
        TwoFactorSetupFailed: 'Failed 2FA setup',
        TwoFactorResetByAdmin: '2FA reset by admin',
        AccountLocked: 'Account locked',
        AccountActivated: 'Account activated',
        PasswordReset: 'Password reset',
        PasswordResetRequested: 'Password reset requested',
        PasswordResetRequestedByAdmin: 'Password reset sent by admin',
        InvitationSent: 'Invitation sent',
        Logout: 'Logout',
    };
    return map[action] || action || 'Security event';
}

/**
 * Chronological feed of everything happening in the app. Merges four
 * sources — audit_logs, security_logs, cron_runs, notifications — into
 * one normalised list. Supports filtering by kind, free-text search on
 * title/subtitle, and offset-based pagination so the UI can "load more".
 *
 * Each source is over-fetched relative to the requested page so that
 * filters land useful results even when one source dominates the raw
 * timestamps.
 */
export async function getRecentActivity({ kind = 'all', search = '', limit = 25, offset = 0 } = {}) {
    // Super-admin gate — session + Admin role. Bail with an empty
    // feed rather than throwing so the caller (usually a client
    // component) can render an empty state cleanly.
    const { user } = await verifyAuth();
    if (!user?.id) return { events: [], hasMore: false, total: 0 };
    const caller = await db.User.findByPk(user.id, { attributes: ['roles'], raw: true });
    const roles = Array.isArray(caller?.roles) ? caller.roles : [];
    if (!roles.some((r) => r?.name === SUPER_ADMIN_ROLE)) {
        return { events: [], hasMore: false, total: 0 };
    }

    // Fetch cap per source. We deliberately over-fetch and slice at the
    // end so that filters (search, kind) still return a full page.
    const perSource = Math.max(50, (offset + limit) * 2);

    const wantsKind = (k) => kind === 'all' || kind === k;

    const [audits, security, crons, notifs] = await Promise.all([
        wantsKind('audit') ? safe(() => db.AuditLog.findAll({
            order: [['created_at', 'DESC']],
            limit: perSource,
            raw: true,
        })) : [],
        wantsKind('security') ? safe(() => db.SecurityLogs.findAll({
            order: [['created_at', 'DESC']],
            limit: perSource,
            raw: true,
        })) : [],
        wantsKind('cron') ? safe(() => db.CronRun.findAll({
            order: [['started_at', 'DESC']],
            limit: perSource,
            raw: true,
        })) : [],
        wantsKind('notification') ? safe(() => db.Notification.findAll({
            order: [['created_at', 'DESC']],
            limit: perSource,
            raw: true,
        })) : [],
    ]);

    const events = [
        ...audits.map((a) => ({
            id: `audit:${a.id}`,
            kind: 'audit',
            title: a.name || 'Audit event',
            subtitle: [a.user_name, a.url].filter(Boolean).join(' · '),
            at: a.created_at,
            outcome: a.has_exception === 'true' ? 'failed' : 'ok',
            ip: a.client_ip_address || null,
        })),
        ...security.map((s) => ({
            id: `security:${s.id}`,
            kind: 'security',
            title: humaniseSecurityAction(s.action),
            subtitle: [s.user_name, s.client_ip_address].filter(Boolean).join(' · '),
            at: s.created_at,
            outcome: SECURITY_FAILED_ACTIONS.has(s.action)
                ? 'failed'
                : SECURITY_ADMIN_ACTIONS.has(s.action)
                    ? 'info'
                    : 'ok',
            ip: s.client_ip_address || null,
        })),
        ...crons.map((c) => ({
            id: `cron:${c.id}`,
            kind: 'cron',
            title: cronLabel(c.kind),
            subtitle: c.status === 'ok'
                ? summariseCronPayload(c.summary)
                : c.status === 'failed'
                    ? (c.error_text || 'Failed')
                    : 'Started',
            at: c.finished_at || c.started_at,
            outcome: c.status === 'failed' ? 'failed' : (c.status === 'running' ? 'running' : 'ok'),
            ip: null,
        })),
        ...notifs.map((n) => ({
            id: `notif:${n.id}`,
            kind: 'notification',
            title: n.title,
            subtitle: n.body || '',
            at: n.created_at,
            outcome: 'info',
            ip: null,
        })),
    ].filter((e) => e.at);

    // Apply text filter in-memory. Cheap for the volumes we fetch.
    const t = (search || '').trim().toLowerCase();
    const filtered = t
        ? events.filter((e) =>
            (e.title && e.title.toLowerCase().includes(t)) ||
            (e.subtitle && e.subtitle.toLowerCase().includes(t))
        )
        : events;

    filtered.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const paged = filtered.slice(offset, offset + limit);
    const hasMore = filtered.length > offset + limit;

    return { events: paged, hasMore, total: filtered.length };
}

function cronLabel(kind) {
    const map = {
        ingest_daily: 'Daily ingestion',
        notify_reports: 'Report-ready notifications',
        sync_asset_groups: 'Asset group sync',
    };
    return map[kind] || kind || 'Cron run';
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
