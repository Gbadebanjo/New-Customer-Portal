'use server'
import { verifyAuth } from '@/lib/auth/auth';
import getUserById from '@/lib/controllers/users/getUserById';
import { redirect } from 'next/navigation';

const ADMIN_ROLES = ['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin'];

/**
 * Verifies the session and checks that the user has an admin role.
 * Redirects to '/' if not authenticated, or '/dashboard' if authenticated but not admin.
 * Returns { user, session } on success.
 */
export async function requireAdminAuth() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }

    const { user } = await getUserById(result.user.id);

    const roles = user?.roles || [];
    const isAdmin = roles.some(role => ADMIN_ROLES.includes(role?.name));

    if (!isAdmin) {
        return redirect('/dashboard');
    }

    return { user: result.user, session: result.session };
}
