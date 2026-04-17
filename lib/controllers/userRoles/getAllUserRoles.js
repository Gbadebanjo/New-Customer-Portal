import UserRole from '@/database/models/UserRole';

export const dynamic = "force dynamic";

export default async function getAllUserRoles(){
    const userRoles = await UserRole.findAll({ raw: true })
    return {userRoles};
}

