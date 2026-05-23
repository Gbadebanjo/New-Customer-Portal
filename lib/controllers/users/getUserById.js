'use server'
// import User from '@/database/models/User';
import db from "@/database/models";

export default async function getUserById(userId) {
    const user = await db.User.findByPk(userId);
    return { user: user ? user.toJSON() : null };
}
