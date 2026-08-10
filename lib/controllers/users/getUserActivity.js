'use server';
import { Op } from 'sequelize';
import sequelizeConnection from '@/db_connection';
import { QueryTypes } from 'sequelize';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';

const ADMIN_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin', 'System Admin']);

async function requireAdmin() {
    const { user } = await verifyAuth();
    if (!user?.id) return null;
    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    if (!roles.some((r) => ADMIN_ROLES.has(r?.name))) return null;
    return full;
}

/**
 * Merged activity timeline for a single user — combines security events
 * (logins, password resets, 2FA, lockouts) and audit events (admin
 * actions like create/delete/update). Ordered newest first.
 */
export async function getUserActivity(targetUserId, { limit = 100 } = {}) {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };
    if (!targetUserId) return { ok: false, error: 'targetUserId required' };

    const targetUser = await db.User.findByPk(targetUserId, { attributes: ['email', 'username'], raw: true });
    if (!targetUser) return { ok: false, error: 'User not found' };

    // Security events where this user is the subject.
    const security = await sequelizeConnection.query(
        `SELECT 'security' AS source, action AS name, client_ip_address AS ip, extra_properties, created_at
           FROM security_logs
          WHERE user_id = :id OR user_name = :name
       ORDER BY created_at DESC
          LIMIT :limit`,
        {
            replacements: { id: targetUserId, name: targetUser.email || targetUser.username || '', limit },
            type: QueryTypes.SELECT,
        }
    );

    // Audit events where the user was either the actor (user_name) or
    // the target (extra_properties contains their id). This is a text
    // match against JSON-stringified extras — cheap and gives us the
    // "actions taken ON this user" side of the story.
    const audit = await sequelizeConnection.query(
        `SELECT 'audit' AS source, name, client_ip_address AS ip, extra_properties, created_at
           FROM audit_logs
          WHERE user_name = :name
             OR extra_properties::text ILIKE :idLike
       ORDER BY created_at DESC
          LIMIT :limit`,
        {
            replacements: {
                name: targetUser.email || targetUser.username || '',
                idLike: `%${targetUserId}%`,
                limit,
            },
            type: QueryTypes.SELECT,
        }
    );

    // Merge, sort by created_at DESC, cap to `limit`.
    const merged = [...security, ...audit]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)
        .map((r) => ({
            source: r.source,
            name: r.name,
            ip: r.ip,
            extra: r.extra_properties,
            createdAt: r.created_at,
        }));

    return { ok: true, events: merged, targetEmail: targetUser.email };
}

/**
 * Active + expired sessions for the user. Admin can force-logout via
 * `forceLogoutUser` (see adminUserActions).
 */
export async function getUserSessions(targetUserId) {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };
    if (!targetUserId) return { ok: false, error: 'targetUserId required' };

    const now = new Date();
    const rows = await db.UserSession.findAll({
        where: { user_id: targetUserId },
        order: [['expires_at', 'DESC']],
        limit: 20,
        raw: true,
    });
    return {
        ok: true,
        sessions: rows.map((r) => ({
            id: r.id,
            expiresAt: r.expires_at,
            active: new Date(r.expires_at) > now,
            createdAt: r.created_at,
        })),
    };
}

/**
 * Count of LoginFailed events in the last 30 days — helps admin spot
 * accounts under attack.
 */
export async function getUserFailedLoginCount(targetUserId) {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };
    if (!targetUserId) return { ok: false, error: 'targetUserId required' };

    const targetUser = await db.User.findByPk(targetUserId, { attributes: ['email', 'username'], raw: true });
    if (!targetUser) return { ok: false, error: 'User not found' };

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = await db.SecurityLog.count({
        where: {
            action: 'LoginFailed',
            [Op.or]: [
                { user_id: targetUserId },
                { user_name: targetUser.email || targetUser.username || '' },
            ],
            created_at: { [Op.gte]: since },
        },
    });
    return { ok: true, count, windowDays: 30 };
}
