'use server'
import UserRole from '@/database/models/UserRole';

export default async function addUserRole(userRoleData) {
    const newUserRole = await UserRole.create(userRoleData);
    return { userRole: newUserRole };
}
