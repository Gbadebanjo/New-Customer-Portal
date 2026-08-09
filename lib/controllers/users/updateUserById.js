'use server'
import db from "@/database/models";
import { revalidatePath } from "next/cache";
import AddUserToCustomerUserArray from "@/lib/controllers/customers/AddUserToCustomerUserArray";
import { logAuditEvent } from "@/lib/services/logging/logAuditEvent";
import { verifyAuth } from "@/lib/auth/auth";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function updateUserById(userId, newData) {
    try {
        const gate = await requireWriteAdminAuth();
        if (!gate.ok) return { error: gate.error };

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
            if (oldCustomerId) {
                const oldCustomer = await db.Customer.findByPk(oldCustomerId);
                if (oldCustomer) {
                    const updatedUsers = (oldCustomer.users || []).filter(u => u.userId !== userId);
                    await db.Customer.update({ users: updatedUsers }, { where: { id: oldCustomerId } });
                }
            }
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
        return { updatedRowsCount };
    } catch (err) {
        console.error("Error updating user:", err);
        return { error: "Failed to update user. Please try again." };
    }
}
