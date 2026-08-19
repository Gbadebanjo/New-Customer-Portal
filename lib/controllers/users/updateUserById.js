'use server'
import db from "@/database/models";
import { revalidatePath } from "next/cache";
import AddUserToCustomerUserArray from "@/lib/controllers/customers/AddUserToCustomerUserArray";
import { logAuditEvent } from "@/lib/services/logging/logAuditEvent";
import { verifyAuth } from "@/lib/auth/auth";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";
import { sanitizeTimezone } from "@/lib/utils/timezone";

// Every column an admin edit is allowed to overwrite. Anything else in
// the incoming payload is silently stripped — this closes a mass-
// assignment path where a malicious or hijacked admin session could
// clear `totp_secret`/`totp_enabled` to disable 2FA, set `password` to
// a known scrypt hash to take over the account, or flip `is_external`
// / `id` / other privileged columns.
const ALLOWED_UPDATE_FIELDS = [
    'username',
    'name',
    'surname',
    'email',
    'phone_number',
    'timezone',
    'customer',
    'roles',
    'is_locked_out',
    'not_active',
    'email_confirmed',
];

export default async function updateUserById(userId, newData) {
    try {
        const gate = await requireWriteAdminAuth();
        if (!gate.ok) return { error: gate.error };

        // Strict whitelist. Fields not in ALLOWED_UPDATE_FIELDS are
        // dropped before ever reaching the DB.
        const clean = {};
        for (const key of ALLOWED_UPDATE_FIELDS) {
            if (newData && Object.prototype.hasOwnProperty.call(newData, key)) {
                clean[key] = newData[key];
            }
        }

        const { customer: newCustomerId } = clean;

        // Every user MUST have a real timezone in the DB. If the edit
        // modal ever sends a blank/junk value, coerce it to the default
        // rather than persisting the junk.
        if ('timezone' in clean) {
            clean.timezone = sanitizeTimezone(clean.timezone);
        }
        if (typeof clean.email === 'string') {
            clean.email = clean.email.trim().toLowerCase();
        }

        const oldUser = await db.User.findByPk(userId);
        if (!oldUser) {
            return { error: "User not found." };
        }
        const { customer: oldCustomerId } = oldUser;

        const [updatedRowsCount] = await db.User.update(clean, {
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
                extra: { targetUserId: userId, targetEmail: clean.email },
            });
        } catch { /* non-fatal */ }

        revalidatePath('/admin/identity/users');
        return { updatedRowsCount };
    } catch (err) {
        console.error("Error updating user:", err);
        return { error: "Failed to update user. Please try again." };
    }
}
