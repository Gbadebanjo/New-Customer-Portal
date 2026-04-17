'use server';
// import User from '@/database/models/User';
import db from "@/database/models";

export default async function getUserByEmail(email) {
    return await db.User.findOne({ where: { email } });
}

