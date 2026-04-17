import UserRole from '@/database/models/UserRole';

export default async function deleteUserRoleById(userRoleId) {
    const deletedUserRole = await UserRole.destroy({
        where: {
            id: userRoleId
        }
    });
    return { deletedUserRole };
}
