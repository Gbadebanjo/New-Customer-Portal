'use server';

import db from "@/database/models";

export async function updateProfile(userId, profileData) {
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

    await db.User.update(updateData, { where: { id: userId } });

    // Fetch updated user to return fresh data
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
