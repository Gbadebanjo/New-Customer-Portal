'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAuth, createAuthSession } from '@/lib/auth/auth';
import getUserById from '@/lib/controllers/users/getUserById';
import { requireAdminAuth } from '@/lib/auth/requireAdminAuth';
import sequelizeConnection from '@/db_connection';

const IMPERSONATOR_COOKIE = 'impersonator_session_id';

/**
 * Start impersonating a user. Only admins can call this.
 */
export async function impersonateUser(targetUserId) {
    await requireAdminAuth();

    const { session } = await verifyAuth();
    if (!session) redirect('/');

    const { user: targetUser } = await getUserById(targetUserId);
    if (!targetUser) {
        return { error: 'User not found' };
    }

    const isCustomerUser = Array.isArray(targetUser.roles) && targetUser.roles.some(role => role?.name === 'Customer');
    if (!isCustomerUser) {
        return { error: 'Can only impersonate customer users.' };
    }

    // Store the admin's session ID so we can restore it later
    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATOR_COOKIE, session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
    });

    // Create a new session as the target user
    await createAuthSession(targetUserId);

    redirect('/dashboard');
}

/**
 * Exit impersonation. Destroys the impersonated session and restores the
 * admin's original session cookie.
 */
export async function exitImpersonation() {
    const cookieStore = await cookies();
    const originalSessionId = cookieStore.get(IMPERSONATOR_COOKIE)?.value;

    // Invalidate the impersonated session directly via DB — avoids using
    // destroySession() which would blank auth_session before we can restore it
    const { session } = await verifyAuth();
    if (session) {
        try {
            await sequelizeConnection.query(
                'DELETE FROM user_sessions WHERE id = :id',
                { replacements: { id: session.id } }
            );
        } catch (err) {
            console.error('exitImpersonation: failed to delete session', err);
        }
    }

    if (originalSessionId) {
        // Restore the admin's original session cookie
        cookieStore.set('auth_session', originalSessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });
        cookieStore.delete(IMPERSONATOR_COOKIE);
    }

    // Land back on the impersonator's home (/fleet — every role that can
    // impersonate is Daystar-side, and /fleet is where they normally live).
    // Previously we sent them to /admin/identity/users, which surprised
    // read-only admins (like Daystar Customer Admin) by dumping them
    // straight into the admin area they'd stepped out of.
    redirect('/fleet');
}

/**
 * Returns true if the current request is in an impersonation session.
 */
export async function getImpersonationState() {
    const cookieStore = await cookies();
    const originalSessionId = cookieStore.get(IMPERSONATOR_COOKIE)?.value;
    if (!originalSessionId) return { isImpersonating: false, adminSessionId: null };

    const { user } = await verifyAuth();
    return {
        isImpersonating: !!user,
        adminSessionId: originalSessionId,
        impersonatedUser: user,
    };
}
