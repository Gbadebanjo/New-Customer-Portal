'use server'
import models from "@/database/models";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/services/logging/logAuditEvent";
import { verifyAuth } from "@/lib/auth/auth";

export default async function deleteUserById(userId) {
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
        redirect('/admin/identity/users');

        return { deletedUser };
    } catch (err) {
        // allow Next's redirect control flow to propagate — must check BEFORE rollback
        if (err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
            throw err;
        }

        if (tx) {
            try { await tx.rollback(); } catch (_) { /* already committed or rolled back */ }
        }

        console.error("Error deleting user:", err);
        return { error: "Failed to delete user" };
    }
}
