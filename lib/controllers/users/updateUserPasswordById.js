import db from "@/database/models";

export async function updateUserPasswordById(userId, hashedPassword) {
    const user = await db.User.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }
    user.password = hashedPassword;
    await user.save();
}
