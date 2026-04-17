import getUserById from '@/lib/controllers/users/getUserById';
import AmmpServices from '@/lib/services/ammp/AmmpServices';

/**
 * Resolves the AMMP bearer token for a given user.
 * Fetches the user's stored ammp_api_key from the DB and exchanges it for a token.
 * Falls back to the global env key if no per-user key exists.
 */
export async function getAmmpToken(userId) {
    try {
        const { user } = await getUserById(userId);
        const { access_token } = await AmmpServices().getAuthToken(user?.ammp_api_key || null);
        return { access_token: access_token ?? null };
    } catch {
        return { access_token: null };
    }
}
