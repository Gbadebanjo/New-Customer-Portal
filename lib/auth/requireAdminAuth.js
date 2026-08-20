'use server'
import { verifyAuth } from '@/lib/auth/auth';
import getUserById from '@/lib/controllers/users/getUserById';
import { redirect } from 'next/navigation';

// Roles that can READ admin surfaces (users list, customers list, etc.).
// Daystar Customer Admin belongs here because they need to see users to
// impersonate them — but they cannot write.
const ADMIN_ROLES = ['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin'];

// Roles that can WRITE — create / update / delete customers and users.
// DCA is deliberately excluded: they only read and impersonate.
const WRITE_ADMIN_ROLES = ['Admin', 'Daystar Portal Admin'];

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

/**
 * Non-redirecting write-permission check for server actions on
 * customer/user records. Returns `{ ok: true, user }` for Admin /
 * Daystar Portal Admin; `{ ok: false, error }` for anyone else
 * (including Daystar Customer Admin, who is read-only). Server actions
 * should return the `error` verbatim to the client so buttons that
 * shouldn't have been reachable at all still fail gracefully.
 */
export async function requireWriteAdminAuth() {
    const result = await verifyAuth();
    if (!result.user) return { ok: false, error: 'Not authenticated.' };

    const { user } = await getUserById(result.user.id);
    const roles = user?.roles || [];
    const canWrite = roles.some(role => WRITE_ADMIN_ROLES.includes(role?.name));

    if (!canWrite) {
        return { ok: false, error: 'You do not have permission to make this change.' };
    }
    return { ok: true, user };
}

/**
 * Client-facing role check helper — pages that render Admin/Customer
 * management UIs use this to decide whether to show create/edit/delete
 * buttons. Server actions still gate independently.
 */
export async function currentUserCanWrite() {
    const check = await requireWriteAdminAuth();
    return check.ok;
}

/**
 * Redirecting gate reserved for the top-tier `Admin` role. Used by the
 * Cron Health and Audit Logs pages — infrastructure/observability
 * surfaces that Portal Admin and DCA should not see. Non-Admin callers
 * are bounced to `/dashboard`.
 */
export async function requireSuperAdminAuth() {
    const result = await verifyAuth();
    if (!result.user) return redirect('/');

    const { user } = await getUserById(result.user.id);
    const roles = user?.roles || [];
    const isAdmin = roles.some((r) => r?.name === 'Admin');
    if (!isAdmin) return redirect('/dashboard');

    return { user: result.user, session: result.session };
}
