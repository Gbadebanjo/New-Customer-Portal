'use server';
import { Op } from 'sequelize';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';

const ADMIN_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

/**
 * Non-admin users with no customer assigned. Under the master-key model
 * these users will see no data at all — this list is the "clean me up
 * before we cut over" audit.
 */
export async function listUsersWithoutCustomer() {
    const { user } = await verifyAuth();
    if (!user?.id) return { ok: false, error: 'Not authenticated' };

    const rows = await db.User.findAll({
        where: { customer: { [Op.or]: [null, ''] }, not_active: { [Op.not]: true } },
        attributes: ['id', 'username', 'email', 'name', 'surname', 'roles', 'created_at'],
        order: [['created_at', 'DESC']],
        raw: true,
    });

    // Drop admin users — they legitimately have no customer.
    const nonAdmin = rows.filter((u) => {
        const roles = Array.isArray(u.roles) ? u.roles : [];
        return !roles.some((r) => ADMIN_ROLES.has(r?.name));
    });

    return {
        ok: true,
        users: nonAdmin.map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: [u.name, u.surname].filter(Boolean).join(' '),
            roles: Array.isArray(u.roles) ? u.roles.map((r) => r.name).filter(Boolean) : [],
            createdAt: u.created_at,
        })),
    };
}
