'use server';
import { Op } from 'sequelize';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';

const ADMIN_ROLES = new Set(['Admin', 'Daystar Portal Admin']);

// Everything the admin overview needs, in one call. Each individual count
// is wrapped in a try/catch so a single missing table (older env, mid-
// migration) doesn't take down the whole page.
async function safe(fn) { try { return await fn(); } catch { return null; } }

function emptyOverview() {
    return {
        generatedAt: new Date().toISOString(),
        users: { total: 0, active: 0, withoutCustomer: 0 },
        customers: { total: 0 },
        support: { openTickets: 0 },
        activity: { auditsLast24h: 0, cronRunsLast24h: 0, cronFailures30d: 0 },
        api: { keysActive: 0 },
        reports: { pendingRows: 0, verifiedRows: 0 },
    };
}

export async function getAdminOverview() {
    // Admin + Portal Admin only. DCA / customer users get an empty
    // payload (never a throw) so their pages render cleanly.
    const { user } = await verifyAuth();
    if (!user?.id) return emptyOverview();
    const caller = await db.User.findByPk(user.id, { attributes: ['roles'], raw: true });
    const roles = Array.isArray(caller?.roles) ? caller.roles : [];
    if (!roles.some((r) => ADMIN_ROLES.has(r?.name))) return emptyOverview();

    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
        userCount,
        activeUsers,
        customerCount,
        openTickets,
        recentAudits,
        cronRunsLast24h,
        cronFailures30d,
        apiKeysActive,
        pendingReportRows,
        verifiedReportRows,
        usersWithoutCustomer,
    ] = await Promise.all([
        safe(() => db.User.count()),
        safe(() => db.User.count({ where: { not_active: { [Op.not]: true } } })),
        safe(() => db.Customer.count()),
        safe(async () => {
            // Non-resolved tickets — mirrors the notification bell's definition.
            let resolvedId = null;
            try {
                const r = await db.SupportQueryStatus.findOne({
                    where: { name: { [Op.iLike]: 'Resolved' } }, raw: true,
                });
                resolvedId = r?.id ?? null;
            } catch {/* no status table */}
            const where = resolvedId ? { status_id: { [Op.ne]: resolvedId } } : {};
            return db.SupportQuery.count({ where });
        }),
        safe(() => db.AuditLog.count({ where: { created_at: { [Op.gte]: twentyFourHoursAgo } } })),
        safe(() => db.CronRun.count({ where: { started_at: { [Op.gte]: twentyFourHoursAgo } } })),
        safe(() => db.CronRun.count({ where: { status: 'failed', started_at: { [Op.gte]: thirtyDaysAgo } } })),
        safe(() => db.ApiKey.count({ where: { revoked_at: null } })),
        safe(() => db.ReportData.count({ where: { status: 'raw' } })),
        safe(() => db.ReportData.count({ where: { status: 'verified' } })),
        // Non-admin users with no customer id assigned — a data-hygiene flag.
        // Users are considered admin if any of their roles matches.
        safe(async () => {
            const users = await db.User.findAll({
                where: { customer: null, not_active: { [Op.not]: true } },
                attributes: ['id', 'roles'],
                raw: true,
            });
            const ADMIN_NAMES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);
            return users.filter((u) => {
                const roles = Array.isArray(u.roles) ? u.roles : [];
                return !roles.some((r) => ADMIN_NAMES.has(r?.name));
            }).length;
        }),
    ]);

    return {
        generatedAt: new Date().toISOString(),
        users: {
            total: userCount ?? 0,
            active: activeUsers ?? 0,
            withoutCustomer: usersWithoutCustomer ?? 0,
        },
        customers: {
            total: customerCount ?? 0,
        },
        support: {
            openTickets: openTickets ?? 0,
        },
        activity: {
            auditsLast24h: recentAudits ?? 0,
            cronRunsLast24h: cronRunsLast24h ?? 0,
            cronFailures30d: cronFailures30d ?? 0,
        },
        api: {
            keysActive: apiKeysActive ?? 0,
        },
        reports: {
            pendingRows: pendingReportRows ?? 0,
            verifiedRows: verifiedReportRows ?? 0,
        },
    };
}
