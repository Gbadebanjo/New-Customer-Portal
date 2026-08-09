'use server';

import db from "@/database/models";
import { hashUserPassword, verifyPassword } from "@/lib/auth/hash";
import { validatePassword } from "@/utils/passwordValidation";
import { verifyAuth } from "@/lib/auth/auth";

export async function changePassword(userId, { currentPassword, newPassword }) {
    // Only the account owner may change their own password.
    const { user: caller } = await verifyAuth();
    if (!caller?.id || caller.id !== userId) {
        return { success: false, message: 'Not authenticated.' };
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
        return { success: false, message: 'User not found.' };
    }

    const isValid = verifyPassword(user.password, currentPassword);
    if (!isValid) {
        return { success: false, message: 'Current password is incorrect.' };
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
        return { success: false, message: passwordError };
    }

    const hashedPassword = hashUserPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    return { success: true, message: 'Password changed successfully.' };
}
