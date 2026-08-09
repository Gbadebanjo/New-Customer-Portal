'use server';
import { Op, fn, col, literal } from 'sequelize';
import db from '@/database/models';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDayUTC(offsetDays = 0) {
    const now = Date.now();
    const d = new Date(now - offsetDays * DAY_MS);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Portal Admin analytics — engagement, NOC throughput, fleet rollups.
 * Returns a compact JSON payload ready for the dashboard. Guarded internally
 * so a missing table (e.g. sessions in some environments) can't break the
 * whole page.
 */
export async function getAdminAnalytics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
    const twentyFourHoursAgo = new Date(now.getTime() - DAY_MS);

    // Engagement — active users (unique user_ids seen in security-logs).
    // Security logs record logins; using them as our proxy for MAU/DAU/WAU.
    let activeUsers24h = 0, activeUsers7d = 0, activeUsers30d = 0, totalUsers = 0;
    try {
        totalUsers = await db.User.count();
    } catch { /* leave zero */ }

    try {
        const distinctInWindow = async (since) => {
            const rows = await db.SecurityLogs.findAll({
                attributes: [[fn('DISTINCT', col('user_id')), 'user_id']],
                where: {
                    user_id: { [Op.ne]: null },
                    created_at: { [Op.gte]: since },
                    action: { [Op.iLike]: '%login%' },
                },
                raw: true,
            });
            return rows.length;
        };
        [activeUsers24h, activeUsers7d, activeUsers30d] = await Promise.all([
            distinctInWindow(twentyFourHoursAgo),
            distinctInWindow(sevenDaysAgo),
            distinctInWindow(thirtyDaysAgo),
        ]);
    } catch { /* security logs may not exist yet */ }

    // Login trend — count per day for the last 7 days.
    let loginTrend = [];
    try {
        const rows = await db.SecurityLogs.findAll({
            attributes: [
                [fn('date_trunc', 'day', col('created_at')), 'day'],
                [fn('COUNT', col('id')), 'count'],
            ],
            where: {
                created_at: { [Op.gte]: sevenDaysAgo },
                action: { [Op.iLike]: '%login%' },
            },
            group: [literal('day')],
            order: [[literal('day'), 'ASC']],
            raw: true,
        });
        // Fill any missing days with 0 so the sparkline is continuous.
        const byDay = new Map(
            rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)])
        );
        loginTrend = Array.from({ length: 7 }, (_, i) => {
            const d = startOfDayUTC(6 - i);
            const key = d.toISOString().slice(0, 10);
            return { day: key, count: byDay.get(key) ?? 0 };
        });
    } catch { /* leave empty */ }

    // NOC throughput — tickets created / resolved / open in the last 30 days,
    // plus median time-to-first-response (from support_query_messages).
    let ticketsCreated30d = 0, ticketsResolved30d = 0, ticketsOpenNow = 0;
    let medianResponseHours = null;
    let resolvedStatusId = null;
    try {
        const resolved = await db.SupportQueryStatus.findOne({
            where: { name: { [Op.iLike]: 'Resolved' } },
            raw: true,
        });
        resolvedStatusId = resolved?.id ?? null;
    } catch { /* no status table */ }

    try {
        ticketsCreated30d = await db.SupportQuery.count({
            where: { created_at: { [Op.gte]: thirtyDaysAgo } },
        });
    } catch { /* leave zero */ }
    try {
        const openWhere = {};
        if (resolvedStatusId) openWhere.status_id = { [Op.ne]: resolvedStatusId };
        ticketsOpenNow = await db.SupportQuery.count({ where: openWhere });
    } catch { /* leave zero */ }
    if (resolvedStatusId) {
        try {
            ticketsResolved30d = await db.SupportQuery.count({
                where: {
                    status_id: resolvedStatusId,
                    updated_at: { [Op.gte]: thirtyDaysAgo },
                },
            });
        } catch { /* leave zero */ }
    }

    // Median first response — earliest reply from someone other than the
    // original submitter, per ticket, then median across the last 30 days.
    try {
        const tickets = await db.SupportQuery.findAll({
            where: { created_at: { [Op.gte]: thirtyDaysAgo } },
            attributes: ['id', 'user_id', 'created_at'],
            raw: true,
        });
        if (tickets.length > 0) {
            const ticketIds = tickets.map((t) => t.id);
            const firstReplies = await db.SupportQueryMessage.findAll({
                where: { support_query_id: { [Op.in]: ticketIds } },
                attributes: ['support_query_id', 'user_id', 'created_at'],
                raw: true,
            });
            const byTicket = new Map();
            for (const m of firstReplies) {
                const t = tickets.find((x) => x.id === m.support_query_id);
                if (!t) continue;
                if (m.user_id === t.user_id) continue; // own message doesn't count
                const existing = byTicket.get(m.support_query_id);
                if (!existing || new Date(m.created_at) < new Date(existing.created_at)) {
                    byTicket.set(m.support_query_id, m);
                }
            }
            const gaps = [];
            for (const [ticketId, msg] of byTicket) {
                const t = tickets.find((x) => x.id === ticketId);
                if (!t) continue;
                const hours = (new Date(msg.created_at).getTime() - new Date(t.created_at).getTime()) / (60 * 60 * 1000);
                if (hours >= 0) gaps.push(hours);
            }
            if (gaps.length > 0) {
                gaps.sort((a, b) => a - b);
                const mid = Math.floor(gaps.length / 2);
                medianResponseHours = gaps.length % 2 === 0
                    ? (gaps[mid - 1] + gaps[mid]) / 2
                    : gaps[mid];
            }
        }
    } catch { /* leave null */ }

    // Fleet rollups — customers, users per customer top 5.
    let totalCustomers = 0;
    let topCustomers = [];
    try {
        totalCustomers = await db.Customer.count();
    } catch { /* leave zero */ }
    try {
        const rows = await db.User.findAll({
            attributes: ['customer', [fn('COUNT', col('id')), 'count']],
            where: { customer: { [Op.ne]: null } },
            group: ['customer'],
            order: [[literal('count'), 'DESC']],
            limit: 5,
            raw: true,
        });
        topCustomers = rows.map((r) => ({ customer: r.customer, count: Number(r.count) }));
    } catch { /* leave empty */ }

    return {
        generatedAt: now.toISOString(),
        engagement: {
            totalUsers,
            activeUsers24h,
            activeUsers7d,
            activeUsers30d,
            loginTrend,
        },
        support: {
            ticketsCreated30d,
            ticketsResolved30d,
            ticketsOpenNow,
            medianResponseHours,
        },
        fleet: {
            totalCustomers,
            topCustomers,
        },
    };
}
