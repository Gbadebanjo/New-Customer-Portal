'use server';

import db from "@/database/models";
import { hashUserPassword, verifyPassword } from "@/lib/auth/hash";

export async function changePassword(userId, currentPassword, newPassword) {
    const user = await db.User.findByPk(userId);

    if (!user) {
        return { success: false, message: 'User not found.' };
    }

    const isValid = verifyPassword(user.password, currentPassword);
    if (!isValid) {
        return { success: false, message: 'Current password is incorrect.' };
    }

    const hashedPassword = hashUserPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    return { success: true, message: 'Password changed successfully.' };
}
