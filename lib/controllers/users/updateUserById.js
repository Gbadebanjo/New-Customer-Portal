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

// Roles that grant write privileges. Only the top-tier `Admin` role
// may assign or revoke these — a Portal Admin editing another user
// cannot elevate them (or themselves) to Admin/Portal Admin. The
// server enforces this even when the client UI hides the checkboxes.
const ELEVATED_ROLE_NAMES = new Set(['Admin', 'Daystar Portal Admin']);

function elevatedRoleSet(roles) {
    if (!Array.isArray(roles)) return new Set();
    const out = new Set();
    for (const r of roles) {
        const n = r?.name;
        if (n && ELEVATED_ROLE_NAMES.has(n)) out.add(n);
    }
    return out;
}

export default async function updateUserById(userId, newData) {
    try {
        const gate = await requireWriteAdminAuth();
        if (!gate.ok) return { error: gate.error };

        const callerRoles = Array.isArray(gate.user?.roles) ? gate.user.roles : [];
        const callerIsAdmin = callerRoles.some((r) => r?.name === 'Admin');

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

        // Elevation guard. If the roles field is being touched, only a
        // top-tier Admin may add or remove Admin / Portal Admin membership.
        // Compare against the target's current roles to detect any change
        // (either direction — grant OR revoke are both privileged ops).
        if ('roles' in clean && !callerIsAdmin) {
            const before = elevatedRoleSet(oldUser.roles);
            const after = elevatedRoleSet(clean.roles);
            const changed = before.size !== after.size
                || [...after].some((n) => !before.has(n))
                || [...before].some((n) => !after.has(n));
            if (changed) {
                return { error: 'Only an Admin can assign or remove the Admin or Daystar Portal Admin role.' };
            }
        }

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
