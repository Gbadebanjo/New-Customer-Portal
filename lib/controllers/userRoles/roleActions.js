'use server';
import getUserRoleById from './getUserRoleById';
import updateUserRoleById from './updateUserRoleById';

export async function fetchRoleById(id) {
    return getUserRoleById(id);
}

export async function saveRoleById(id, data) {
    return updateUserRoleById(id, data);
}
