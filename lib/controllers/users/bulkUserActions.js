'use server';
import db from '@/database/models';
import { revalidatePath } from 'next/cache';
import { verifyAuth } from '@/lib/auth/auth';
import { logAuditEvent } from '@/lib/services/logging/logAuditEvent';
import deleteUserById from './deleteUserById';

const ADMIN_ROLES = new Set(['Admin', 'Daystar Portal Admin']);

async function requireAdmin() {
    const { user } = await verifyAuth();
    if (!user?.id) return null;
    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    if (!roles.some((r) => ADMIN_ROLES.has(r?.name))) return null;
    return full;
}

/**
 * Flip is_locked_out on every listed user in one transactional update.
 * Locking sets it to true; unlocking to false and also resets
 * failed_login_attempts / lockout_until so the user can immediately log in.
 */
export async function bulkSetLocked(userIds, locked) {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };
    if (!Array.isArray(userIds) || userIds.length === 0) return { ok: false, error: 'No users selected' };

    const updates = locked
        ? { is_locked_out: true }
        : { is_locked_out: false, failed_login_attempts: 0, lockout_until: null };

    const [affected] = await db.User.update(updates, { where: { id: userIds } });

    try {
        await logAuditEvent({
            name: locked ? 'Bulk Users Locked' : 'Bulk Users Unlocked',
            userName: admin.username || admin.email || 'Admin',
            url: '/admin/identity/users',
            method: 'PATCH',
            extra: { userIds, affected },
        });
    } catch { /* non-fatal */ }

    revalidatePath('/admin/identity/users');
    return { ok: true, affected };
}

/**
 * Delete every user in the list. Runs them one at a time through the
 * existing single-user delete controller so all its foreign-key cleanup
 * runs per user (cheaper than reimplementing the transaction in bulk).
 */
export async function bulkDeleteUsers(userIds) {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: 'Not authorised' };
    if (!Array.isArray(userIds) || userIds.length === 0) return { ok: false, error: 'No users selected' };

    let deleted = 0;
    const errors = [];
    for (const id of userIds) {
        try {
            const res = await deleteUserById(id);
            if (res?.deletedUser) deleted++;
            else if (res?.error) errors.push({ id, error: res.error });
        } catch (err) {
            errors.push({ id, error: err?.message || 'Unknown error' });
        }
    }

    revalidatePath('/admin/identity/users');
    return { ok: true, deleted, errors };
}
