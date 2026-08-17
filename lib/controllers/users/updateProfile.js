'use server';

import db from "@/database/models";
import { verifyAuth } from "@/lib/auth/auth";
import { sanitizeTimezone } from "@/lib/utils/timezone";

// Roles allowed to edit ANY user's profile. Everyone else can only
// edit their own row.
const ADMIN_WRITE_ROLES = new Set(['Admin', 'System Admin', 'Daystar Portal Admin']);

export async function updateProfile(userId, profileData) {
    // Authorisation gate: only the user themself, or a write-tier admin,
    // may update a profile. Without this, any authenticated user could
    // pass someone else's userId to overwrite their email and then
    // trigger a password reset to their own inbox.
    const { user: caller } = await verifyAuth();
    if (!caller?.id) {
        return { success: false, message: 'Not authenticated.' };
    }

    let allowed = caller.id === userId;
    if (!allowed) {
        const callerRow = await db.User.findByPk(caller.id, { raw: true });
        const roles = Array.isArray(callerRow?.roles) ? callerRow.roles : [];
        allowed = roles.some((r) => ADMIN_WRITE_ROLES.has(r?.name));
    }
    if (!allowed) {
        return { success: false, message: 'You do not have permission to edit this profile.' };
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
        return { success: false, message: 'User not found.' };
    }

    const allowedFields = ['username', 'name', 'surname', 'email', 'timezone'];
    const updateData = {};
    for (const field of allowedFields) {
        if (profileData[field] !== undefined) {
            updateData[field] = profileData[field];
        }
    }
    // Normalise email the same way write paths (AddUser, seeder) do, so
    // profile edits don't accidentally break future lookups.
    if (typeof updateData.email === 'string') {
        updateData.email = updateData.email.trim().toLowerCase();
    }
    if ('timezone' in updateData) {
        updateData.timezone = sanitizeTimezone(updateData.timezone);
    }

    await db.User.update(updateData, { where: { id: userId } });

    const updatedUser = await db.User.findByPk(userId);
    return {
        success: true,
        message: 'Profile updated successfully.',
        user: {
            id: updatedUser.id,
            username: updatedUser.username,
            name: updatedUser.name,
            surname: updatedUser.surname,
            email: updatedUser.email,
            timezone: updatedUser.timezone,
            totp_enabled: updatedUser.totp_enabled,
            roles: updatedUser.roles,
            customer: updatedUser.customer,
        },
    };
}
