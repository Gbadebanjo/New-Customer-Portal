'use server'
import models from "@/database/models";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/services/logging/logAuditEvent";
import { verifyAuth } from "@/lib/auth/auth";
import getUserById from "@/lib/controllers/users/getUserById";

// User deletion is the single most destructive account action — reserved
// for the top-tier `Admin` role only. Portal Admin can lock, reset
// 2FA, force logout, and email a reset link, but cannot destroy the row.
// DCA is read + impersonate only.
export default async function deleteUserById(userId) {
    const auth = await verifyAuth();
    if (!auth?.user?.id) return { ok: false, error: 'Not authenticated.' };

    const { user: caller } = await getUserById(auth.user.id);
    const callerRoles = Array.isArray(caller?.roles) ? caller.roles : [];
    const isAdmin = callerRoles.some((r) => r?.name === 'Admin');
    if (!isAdmin) {
        return { ok: false, error: 'Only the Admin role can delete users.' };
    }

    // Never let an admin delete their own row — a self-delete locks the
    // last admin out of the platform. They can be removed by another
    // Admin instead.
    if (String(userId) === String(auth.user.id)) {
        return { ok: false, error: 'You cannot delete your own account.' };
    }

    const sequelize = models.sequelize;
    let tx;

    try {
        tx = await sequelize.transaction();

        // remove dependent rows that reference the user to avoid FK violations
        await models.VerificationCode.destroy({ where: { user_id: userId }, transaction: tx });

        if (models.UserSession) {
            await models.UserSession.destroy({ where: { user_id: userId }, transaction: tx });
        } else {
            await sequelize.query(
                'DELETE FROM user_sessions WHERE user_id = :id',
                { replacements: { id: userId }, transaction: tx }
            );
        }

        // now safe to delete user
        const deletedUser = await models.User.destroy({ where: { id: userId }, transaction: tx });

        // update customers' users arrays if needed
        if (deletedUser) {
            const customers = await models.Customer.findAll({ transaction: tx });
            for (const customer of customers) {
                const users = customer.users || [];
                const updatedUsers = users.filter(u => u.userId !== userId);
                if (updatedUsers.length !== users.length) {
                    await models.Customer.update(
                        { users: updatedUsers },
                        { where: { id: customer.id }, transaction: tx }
                    );
                }
            }
        }

        await tx.commit();

        try {
            const { user: actor } = await verifyAuth();
            await logAuditEvent({
                name: 'User Deleted',
                userName: actor?.username || actor?.email || 'Unknown',
                url: `/admin/identity/users/${userId}`,
                method: 'DELETE',
                extra: { deletedUserId: userId },
            });
        } catch { /* non-fatal */ }

        revalidatePath('/admin/identity/users');
        revalidatePath('/customers');
        revalidatePath('/customers/[id]', 'page');
        return { ok: true, deletedUser };
    } catch (err) {
        if (tx) {
            try { await tx.rollback(); } catch (_) { /* already committed or rolled back */ }
        }

        console.error("Error deleting user:", err);
        return { ok: false, error: "Failed to delete user" };
    }
}
