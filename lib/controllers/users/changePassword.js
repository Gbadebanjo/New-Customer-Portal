'use server';

import db from "@/database/models";
import { hashUserPassword, verifyPassword } from "@/lib/auth/hash";
<<<<<<< HEAD
import { validatePassword } from "@/utils/passwordValidation";

export async function changePassword(userId, { currentPassword, newPassword }) {
=======

export async function changePassword(userId, currentPassword, newPassword) {
>>>>>>> ed6e1d734f80e55eb2825f399e1f8e77dcf82bd8
    const user = await db.User.findByPk(userId);

    if (!user) {
        return { success: false, message: 'User not found.' };
    }

    const isValid = verifyPassword(user.password, currentPassword);
    if (!isValid) {
        return { success: false, message: 'Current password is incorrect.' };
    }

<<<<<<< HEAD
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
        return { success: false, message: passwordError };
    }

=======
>>>>>>> ed6e1d734f80e55eb2825f399e1f8e77dcf82bd8
    const hashedPassword = hashUserPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    return { success: true, message: 'Password changed successfully.' };
}
