import db from '@/database/models';
export const dynamic = "force dynamic";

export default async function getAllUsers(){
    const users = await db.User.findAll({
        order: [['created_at', 'DESC']],
        raw: true
    });
    return {users};
}
