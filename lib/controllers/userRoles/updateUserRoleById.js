import UserRole from '@/database/models/UserRole';

export default async function updateUserRoleById(userRoleId, newData) {
    const [updatedRowsCount] = await UserRole.update(newData, {
        where: {
            id: userRoleId
        }
    });
    return { updatedRowsCount };
}
