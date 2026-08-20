'use server';
import { Op } from 'sequelize';
import db from '@/database/models';
import { KNOWN_CRONS } from '@/lib/services/cronRuns/knownCrons';
import { verifyAuth } from '@/lib/auth/auth';

/**
 * Health payload for the admin cron dashboard. Super-admin only —
 * `recentRuns` includes internal error strings that could aid an
 * attacker mapping the infrastructure. Matches the /admin/cron-health
 * page-level gate.
 */
export async function getCronHealth() {
    const { user } = await verifyAuth();
    if (!user?.id) return { crons: [] };
    const caller = await db.User.findByPk(user.id, { attributes: ['roles'], raw: true });
    const roles = Array.isArray(caller?.roles) ? caller.roles : [];
    if (!roles.some((r) => r?.name === 'Admin')) return { crons: [] };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const perCron = await Promise.all(KNOWN_CRONS.map(async (meta) => {
        try {
            // One query grabs everything we need. `recentRuns` doubles as the
            // sample the average duration is computed from — the last 10
            // finished ones — so we don't need a separate aggregate query
            // (which was mixing AVG with ORDER BY and tripping Postgres).
            const [lastRun, recentRuns, failuresLast30d] = await Promise.all([
                db.CronRun.findOne({
                    where: { kind: meta.kind },
                    order: [['started_at', 'DESC']],
                    raw: true,
                }),
                db.CronRun.findAll({
                    where: { kind: meta.kind },
                    order: [['started_at', 'DESC']],
                    limit: 10,
                    raw: true,
                }),
                db.CronRun.count({
                    where: {
                        kind: meta.kind,
                        status: 'failed',
                        started_at: { [Op.gte]: thirtyDaysAgo },
                    },
                }),
            ]);

            const durations = recentRuns
                .filter((r) => r.status === 'ok' && r.finished_at && r.started_at)
                .map((r) => new Date(r.finished_at).getTime() - new Date(r.started_at).getTime())
                .filter((ms) => ms >= 0 && Number.isFinite(ms));
            const avgDurationMs = durations.length
                ? durations.reduce((a, b) => a + b, 0) / durations.length
                : null;

            return {
                ...meta,
                lastRun,
                recentRuns,
                failuresLast30d,
                avgDurationMs,
            };
        } catch (err) {
            console.error(`getCronHealth failed for ${meta.kind}:`, err);
            return { ...meta, lastRun: null, recentRuns: [], failuresLast30d: 0, avgDurationMs: null };
        }
    }));

    return { crons: perCron };
}
