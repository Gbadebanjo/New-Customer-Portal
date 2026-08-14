'use server';
import { Op, fn, col, literal } from 'sequelize';
import db from '@/database/models';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDayUTC(offsetDays = 0) {
    const now = Date.now();
    const d = new Date(now - offsetDays * DAY_MS);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Whole-app snapshot for the admin analytics page. Every section is
// wrapped in its own try so a missing table or a schema drift can't
// take down the entire dashboard. Fields default to zero/empty so the
// UI can render even in a fresh install with no data.
export async function getAdminAnalytics() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
    const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);

    // Engagement — active users derived from login events in security_logs.
    // We treat SecurityLogs as the DAU/WAU/MAU source of truth since it
    // records every successful login. User count is straight off the table.
    let totalUsers = 0;
    let activeUsers24h = 0, activeUsers7d = 0, activeUsers30d = 0;
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
                    action: 'LoginSucceeded',
                },
                raw: true,
            });
            return rows.length;
        };
        [activeUsers24h, activeUsers7d, activeUsers30d] = await Promise.all([
            distinctInWindow(dayAgo),
            distinctInWindow(sevenDaysAgo),
            distinctInWindow(thirtyDaysAgo),
        ]);
    } catch { /* security logs may not exist yet */ }

    // Login trend — successful logins per day for the last 7 days. Missing
    // days are back-filled with zero so the sparkline stays continuous.
    let loginTrend = [];
    try {
        const rows = await db.SecurityLogs.findAll({
            attributes: [
                [fn('date_trunc', 'day', col('created_at')), 'day'],
                [fn('COUNT', col('id')), 'count'],
            ],
            where: {
                created_at: { [Op.gte]: sevenDaysAgo },
                action: 'LoginSucceeded',
            },
            group: [literal('day')],
            order: [[literal('day'), 'ASC']],
            raw: true,
        });
        const byDay = new Map(
            rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)])
        );
        loginTrend = Array.from({ length: 7 }, (_, i) => {
            const d = startOfDayUTC(6 - i);
            const key = d.toISOString().slice(0, 10);
            return { day: key, count: byDay.get(key) ?? 0 };
        });
    } catch { /* leave empty */ }

    // Security posture — how safe the account population looks right now.
    // Everything a security-conscious admin would want at a glance:
    // failed logins in the last 24h, currently-locked accounts, users
    // without 2FA, and users who never confirmed their invitation.
    let failedLogins24h = 0;
    let lockedAccounts = 0;
    let usersWithout2fa = 0;
    let unverifiedUsers = 0;
    let adminCount = 0;
    let dcaCount = 0;
    let customerUserCount = 0;
    try {
        failedLogins24h = await db.SecurityLogs.count({
            where: {
                created_at: { [Op.gte]: dayAgo },
                action: { [Op.in]: ['LoginFailed', 'TwoFactorFailed', 'AccountLocked'] },
            },
        });
    } catch { /* leave zero */ }
    try {
        lockedAccounts = await db.User.count({ where: { is_locked_out: true } });
    } catch { /* leave zero */ }
    try {
        usersWithout2fa = await db.User.count({ where: { totp_enabled: false } });
    } catch { /* leave zero */ }
    try {
        unverifiedUsers = await db.User.count({ where: { email_confirmed: false } });
    } catch { /* leave zero */ }

    // Role breakdown — quick sanity check that the mix looks right.
    // Roles is a JSONB[] column so we do the counting in JS after
    // pulling minimal fields, which is cheap enough for the user table
    // sizes we deal with.
    try {
        const users = await db.User.findAll({ attributes: ['id', 'roles'], raw: true });
        for (const u of users) {
            const roleNames = Array.isArray(u.roles) ? u.roles.map((r) => r?.name) : [];
            if (roleNames.includes('Admin') || roleNames.includes('Daystar Portal Admin')) adminCount += 1;
            else if (roleNames.includes('Daystar Customer Admin')) dcaCount += 1;
            else customerUserCount += 1;
        }
    } catch { /* leave zeros */ }

    // Live sessions — how many user_sessions rows haven't expired. Also
    // by-role, so we can see who's actually online right now (admins vs
    // customers). Session cookie IDs aren't a UUID so we count on id.
    let activeSessions = 0;
    let activeAdminSessions = 0;
    let activeCustomerSessions = 0;
    try {
        activeSessions = await db.UserSession.count({
            where: { expires_at: { [Op.gt]: now } },
        });
        const rows = await db.UserSession.findAll({
            where: { expires_at: { [Op.gt]: now } },
            attributes: ['user_id'],
            raw: true,
        });
        const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
        if (ids.length > 0) {
            const users = await db.User.findAll({
                where: { id: { [Op.in]: ids } },
                attributes: ['id', 'roles'],
                raw: true,
            });
            for (const u of users) {
                const roleNames = Array.isArray(u.roles) ? u.roles.map((r) => r?.name) : [];
                if (roleNames.some((n) => DAYSTAR_ROLES.has(n))) activeAdminSessions += 1;
                else activeCustomerSessions += 1;
            }
        }
    } catch { /* leave zeros */ }

    // NOC throughput — support tickets. Median first-response was removed;
    // it's easily skewed on low volume and belongs in a dedicated support
    // drill-down rather than a top-level snapshot.
    let ticketsCreated30d = 0, ticketsResolved30d = 0, ticketsOpenNow = 0;
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

    // Pipeline health — cron_runs is the source of truth for our nightly
    // jobs (asset sync, ingestion, notifications). We show the last
    // successful run of each known kind + the last failure across all
    // kinds + a 7-day success rate. That's what actually answers "did
    // the pipeline run last night?".
    let lastSuccesses = {};
    let lastFailure = null;
    let cronSuccessRate7d = null;
    let cronRunsLast7d = 0;
    try {
        const rows = await db.CronRun.findAll({
            where: { status: 'ok' },
            order: [['finished_at', 'DESC']],
            raw: true,
        });
        const seen = new Set();
        for (const r of rows) {
            if (seen.has(r.kind)) continue;
            seen.add(r.kind);
            lastSuccesses[r.kind] = r.finished_at;
        }
    } catch { /* leave empty */ }
    try {
        const row = await db.CronRun.findOne({
            where: { status: 'failed' },
            order: [['finished_at', 'DESC']],
            raw: true,
        });
        if (row) {
            lastFailure = {
                kind: row.kind,
                at: row.finished_at || row.started_at,
                error: row.error_text || null,
            };
        }
    } catch { /* leave null */ }
    try {
        const total = await db.CronRun.count({
            where: {
                started_at: { [Op.gte]: sevenDaysAgo },
                status: { [Op.in]: ['ok', 'failed'] },
            },
        });
        cronRunsLast7d = total;
        if (total > 0) {
            const ok = await db.CronRun.count({
                where: {
                    started_at: { [Op.gte]: sevenDaysAgo },
                    status: 'ok',
                },
            });
            cronSuccessRate7d = ok / total;
        }
    } catch { /* leave null */ }

    // Fleet health — sites reporting today, report_data rows still
    // awaiting NOC verification, invitations still outstanding.
    let sitesReportingToday = 0;
    let reportsPendingApproval = 0;
    let outstandingInvitations = 0;
    let totalCustomers = 0;
    try {
        totalCustomers = await db.Customer.count();
    } catch { /* leave zero */ }
    try {
        const startOfTodayUtc = startOfDayUTC(0);
        const rows = await db.ReportData.findAll({
            attributes: [[fn('DISTINCT', col('site_id')), 'site_id']],
            where: { created_at: { [Op.gte]: startOfTodayUtc } },
            raw: true,
        });
        sitesReportingToday = rows.length;
    } catch { /* leave zero */ }
    try {
        reportsPendingApproval = await db.ReportData.count({
            where: { status: 'raw' },
        });
    } catch { /* leave zero */ }
    try {
        outstandingInvitations = await db.User.count({
            where: {
                email_confirmed: false,
                password: null,
            },
        });
    } catch { /* leave zero */ }

    // Growth — new users + customers created this week. Cheap counts.
    let newUsers7d = 0, newCustomers7d = 0;
    try {
        newUsers7d = await db.User.count({
            where: { created_at: { [Op.gte]: startOfWeek } },
        });
    } catch { /* leave zero */ }
    try {
        newCustomers7d = await db.Customer.count({
            where: { created_at: { [Op.gte]: startOfWeek } },
        });
    } catch { /* leave zero */ }

    return {
        generatedAt: now.toISOString(),
        engagement: {
            totalUsers,
            activeUsers24h,
            activeUsers7d,
            activeUsers30d,
            loginTrend,
            adminCount,
            dcaCount,
            customerUserCount,
        },
        security: {
            failedLogins24h,
            lockedAccounts,
            usersWithout2fa,
            unverifiedUsers,
        },
        sessions: {
            active: activeSessions,
            admin: activeAdminSessions,
            customer: activeCustomerSessions,
        },
        support: {
            ticketsCreated30d,
            ticketsResolved30d,
            ticketsOpenNow,
        },
        pipeline: {
            lastSuccesses,
            lastFailure,
            successRate7d: cronSuccessRate7d,
            runsLast7d: cronRunsLast7d,
        },
        fleet: {
            totalCustomers,
            sitesReportingToday,
            reportsPendingApproval,
            outstandingInvitations,
        },
        growth: {
            newUsers7d,
            newCustomers7d,
        },
    };
}
