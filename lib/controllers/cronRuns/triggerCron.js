'use server';
import { verifyAuth } from '@/lib/auth/auth';
import db from '@/database/models';

const NOC_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Whitelist — never let the UI POST to arbitrary internal routes.
const CRON_PATHS = {
    sync_asset_groups: '/api/internal/sync/asset-groups',
    ingest_daily:      '/api/internal/ingest/daily',
    notify_reports:    '/api/internal/notify/reports',
};

/**
 * Admin-triggered "run this cron now". Calls the same protected endpoint an
 * external scheduler would, using the server-side INTERNAL_LOG_SECRET so the
 * secret never leaves the server. Records the triggering user on the run row.
 */
export async function triggerCron(kind, body = {}) {
    const path = CRON_PATHS[kind];
    if (!path) return { ok: false, error: 'Unknown cron' };

    const { user } = await verifyAuth();
    if (!user?.id) return { ok: false, error: 'Not authenticated' };

    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    if (!roles.some((r) => NOC_ROLES.has(r?.name))) {
        return { ok: false, error: 'Not authorised' };
    }

    const secret = process.env.INTERNAL_LOG_SECRET;
    if (!secret) return { ok: false, error: 'Server missing INTERNAL_LOG_SECRET' };

    const base = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
        const response = await fetch(`${base}${path}`, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'x-internal-secret': secret,
                'content-type': 'application/json',
            },
            body: JSON.stringify({ ...body, triggeredByUserId: user.id }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return { ok: false, error: payload?.error || `HTTP ${response.status}` };
        }
        return { ok: true, payload };
    } catch (err) {
        return { ok: false, error: err?.message || 'Fetch failed' };
    }
}
