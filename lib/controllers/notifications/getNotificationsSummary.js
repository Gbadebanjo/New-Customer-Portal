'use server';
import { Op } from 'sequelize';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import { getAuthorizedAssets } from '@/lib/services/ammp/getAuthorizedAssets';
import { withCache, scopeKey } from '@/lib/services/cache/memoryCache';

// A fleet-user bell polling every 90s should NEVER trigger a 400-site
// AMMP fan-out on every tick. Cap the per-call site count so the fetch
// stays under a second, and cache the assembled summary per user for a
// window shorter than the client poll (60s < 90s ⇒ bell always gets
// fresh-enough data on each tick).
const MAX_SITES_FOR_OFFLINE = 40;
const MAX_SITES_FOR_ALERTS  = 20;
const SUMMARY_CACHE_TTL_MS  = 60_000;

// Same allowlist as getAllSupportQueries — kept in sync so the bell count
// matches what the /support page shows.
const FLEET_WIDE_ROLES = new Set([
    'Admin',
    'Daystar Portal Admin',
    'Daystar Customer Admin',
]);

// A site counts as "needing attention" when we haven't heard from it in this
// long. Matches the "Offline" threshold in the DataFreshness badge.
const OFFLINE_THRESHOLD_MS = 60 * 60 * 1000;

// Fan out status-info-latest across every site — same idea as the freshness
// fan-out — and return the flat list of active (non-OK) alerts. Capped at 5
// results so the bell doesn't render a wall of text.
async function collectAlerts(userId) {
    try {
        const { token, assets } = await getAuthorizedAssets(userId);
        if (!token || !Array.isArray(assets) || assets.length === 0) return [];
        const svc = AmmpServices();
        const results = await Promise.all(
            assets.slice(0, MAX_SITES_FOR_ALERTS).map(async (asset) => {
                try {
                    const res = await svc.getStatusInfoLatest(token, asset.asset_id);
                    const alerts = Array.isArray(res?.alerts) ? res.alerts : [];
                    return alerts
                        .filter((a) => (a.status_level || '').toUpperCase() !== 'OK')
                        .map((a) => ({
                            id: a.alert_id,
                            siteId: asset.asset_id,
                            siteName: asset.long_name || asset.asset_name,
                            level: a.status_level || 'UNKNOWN',
                            content: a.content || '',
                            timestamp: a.timestamp,
                        }));
                } catch { return []; }
            })
        );
        return results.flat()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    } catch {
        return [];
    }
}

async function collectOfflineSites(userId) {
    try {
        const { token, assets } = await getAuthorizedAssets(userId);
        if (!token || !Array.isArray(assets) || assets.length === 0) return [];

        // Cap the fan-out — a fleet user with 400+ sites otherwise turns
        // this into a 20-second per-site loop. First N is fine for a bell
        // count; deep visibility is a job for the Alerts page.
        const scoped = assets.slice(0, MAX_SITES_FOR_OFFLINE);
        const ids = scoped.map((a) => a.asset_id?.toString()).filter(Boolean);
        const freshness = await AmmpServices().getAllLastDataReceived(ids, token);
        const freshnessMap = Object.fromEntries(
            (freshness || []).map((f) => [f.asset_id, f.last_received])
        );

        const now = Date.now();
        const offline = [];
        for (const asset of scoped) {
            const ts = freshnessMap[asset.asset_id?.toString()];
            if (!ts) continue; // "Unknown" isn't the same as offline — skip
            const t = new Date(ts).getTime();
            if (isNaN(t)) continue;
            const ageMs = Math.max(0, now - t);
            if (ageMs >= OFFLINE_THRESHOLD_MS) {
                offline.push({
                    asset_id: asset.asset_id,
                    name: asset.long_name || asset.asset_name || 'Unnamed site',
                    lastReceived: ts,
                });
            }
        }
        return offline;
    } catch {
        return [];
    }
}

/**
 * Returns a compact notifications summary for the current user:
 *   { unresolvedTickets, recent, offlineSites, totalCount }
 *
 *   - unresolvedTickets: count of support queries not in "Resolved" status
 *     that the user can see (fleet-wide for admins/NOC, own customer only for
 *     Customer Users).
 *   - recent: up to 5 recent unresolved tickets.
 *   - offlineSites: array of up to 5 sites where AMMP hasn't heard from us
 *     in >1 hour. Empty for users who can't see any sites.
 *   - totalCount: convenience sum for the bell badge.
 *
 * Anonymous callers get zeroes — never rejects.
 */
export async function getNotificationsSummary() {
    const empty = {
        unresolvedTickets: 0,
        recent: [],
        offlineSites: [],
        dataUpdates: [],
        unreadDataUpdates: 0,
        providerAlerts: [],
        totalCount: 0,
    };

    try {
        const { user } = await verifyAuth();
        if (!user?.id) return empty;
        // Per-user cache — 60 s < the bell's 90 s poll, so the badge is
        // always ≤ 60 s stale but repeat calls within that window are
        // free. Also coalesces concurrent calls (withCache stores the
        // in-flight promise) — no more duplicate fan-outs during a single
        // render tree.
        return await withCache(
            `notifications-summary:${scopeKey(String(user.id))}`,
            SUMMARY_CACHE_TTL_MS,
            () => buildSummary(user, empty),
        );
    } catch {
        return empty;
    }
}

async function buildSummary(user, empty) {
    try {
        const fullUser = await db.User.findByPk(user.id, { raw: true });
        if (!fullUser) return empty;

        const roles = Array.isArray(fullUser.roles) ? fullUser.roles : [];
        const canSeeAll = roles.some((r) => FLEET_WIDE_ROLES.has(r?.name));

        // Find the "Resolved" status ID so we can exclude it.
        let resolvedId = null;
        try {
            const resolved = await db.SupportQueryStatus.findOne({
                where: { name: { [Op.iLike]: 'Resolved' } },
                raw: true,
            });
            resolvedId = resolved?.id ?? null;
        } catch { /* status table may not exist yet; treat as none-resolved */ }

        const where = {};
        if (resolvedId) where.status_id = { [Op.ne]: resolvedId };
        // Fleet-wide roles see every unresolved ticket; everyone else is
        // scoped to their own customer (or their own tickets if no customer).
        if (!canSeeAll) {
            if (fullUser.customer) where.customer = fullUser.customer;
            else where.user_id = user.id;
        }

        // Customer-role bells stay focused on things a customer actually
        // owns — their support tickets and their report updates. Offline
        // sites and raw provider alerts are Daystar-side operator concerns
        // and would just add noise / anxiety for a non-technical customer.
        const showFleetSignals = canSeeAll;

        const [unresolvedTickets, recentRows, offlineSitesAll, providerAlerts] = await Promise.all([
            db.SupportQuery.count({ where }),
            db.SupportQuery.findAll({
                where,
                order: [['updated_at', 'DESC']],
                limit: 5,
                raw: true,
            }),
            showFleetSignals ? collectOfflineSites(user.id) : Promise.resolve([]),
            showFleetSignals ? collectAlerts(user.id)      : Promise.resolve([]),
        ]);

        // Attach status names for each recent row.
        let statusesById = {};
        try {
            const statuses = await db.SupportQueryStatus.findAll({ raw: true });
            statusesById = Object.fromEntries(statuses.map((s) => [s.id, s.name]));
        } catch { /* no statuses table; leave blank */ }

        const recent = recentRows.map((row) => ({
            id: row.id,
            title: row.title,
            status: statusesById[row.status_id] || 'Open',
            updated_at: row.updated_at,
        }));

        const offlineSites = offlineSitesAll.slice(0, 5);

        // Data-updates notifications (report_ready, corrections, …) live in
        // the notifications table. Read the caller's unread + a few recent.
        let dataUpdates = [];
        let unreadDataUpdates = 0;
        try {
            const [unread, items] = await Promise.all([
                db.Notification.count({ where: { user_id: user.id, read_at: null } }),
                db.Notification.findAll({
                    where: { user_id: user.id },
                    order: [['created_at', 'DESC']],
                    limit: 5,
                    raw: true,
                }),
            ]);
            unreadDataUpdates = unread;
            dataUpdates = items;
        } catch { /* notifications table may not exist yet in some envs */ }

        const totalCount = unresolvedTickets + offlineSitesAll.length + unreadDataUpdates + providerAlerts.length;

        return {
            unresolvedTickets,
            recent,
            offlineSites,
            dataUpdates,
            unreadDataUpdates,
            providerAlerts,
            totalCount,
        };
    } catch {
        return empty;
    }
}
