'use server'
import db from "@/database/models";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import AddUserToCustomerUserArray from "@/lib/controllers/customers/AddUserToCustomerUserArray";
import { logAuditEvent } from "@/lib/services/logging/logAuditEvent";
import { verifyAuth } from "@/lib/auth/auth";

export default async function updateUserById(userId, newData) {
    try {
        const { customer: newCustomerId } = newData;

        const oldUser = await db.User.findByPk(userId);
        if (!oldUser) {
            return { error: "User not found." };
        }
        const { customer: oldCustomerId } = oldUser;

        const [updatedRowsCount] = await db.User.update(newData, {
            where: { id: userId }
        });

        if (oldCustomerId !== newCustomerId) {
            await AddUserToCustomerUserArray(userId, newCustomerId);
        }

        try {
            const { user: actor } = await verifyAuth();
            await logAuditEvent({
                name: 'User Updated',
                userName: actor?.username || actor?.email || 'Unknown',
                url: `/admin/identity/users/${userId}`,
                method: 'PUT',
                extra: { targetUserId: userId, targetEmail: newData.email },
            });
        } catch { /* non-fatal */ }

        revalidatePath('/admin/identity/users');
        redirect('/admin/identity/users');

        return { updatedRowsCount };
    } catch (err) {
        if (err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
            throw err;
        }
        console.error("Error updating user:", err);
        return { error: "Failed to update user. Please try again." };
    }
}
