'use server';
import db from '@/database/models';
import sequelizeConnection from '@/db_connection';
import { requireWriteAdminAuth } from '@/lib/auth/requireAdminAuth';
import { logAuditEvent } from '@/lib/services/logging/logAuditEvent';
import { logSecurityEvent } from '@/lib/services/logging/logSecurityEvent';
import { getRequestContext } from '@/lib/services/logging/requestContext';
import { generateLink } from '@/lib/auth/verificationActions';
import { revalidatePath } from 'next/cache';

// Every action here is admin-only and writes to a specific user.
// All gated by requireWriteAdminAuth (Admin + Daystar Portal Admin);
// Daystar Customer Admin is deliberately excluded.

async function loadTarget(userId) {
    if (!userId) return null;
    return await db.User.findByPk(userId, { raw: true });
}

/**
 * Kill every user_sessions row for this user. On their next request
 * their cookie no longer maps to a valid session and they're bounced
 * to /login.
 */
export async function forceLogoutUser(userId) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { ok: false, error: gate.error };
    const target = await loadTarget(userId);
    if (!target) return { ok: false, error: 'User not found' };

    const [affected] = await sequelizeConnection.query(
        'DELETE FROM user_sessions WHERE user_id = :id RETURNING id',
        { replacements: { id: userId } }
    );

    await logAuditEvent({
        name: 'User Force-Logged-Out',
        userName: gate.user.username || gate.user.email || 'Admin',
        url: `/admin/identity/users/${userId}`,
        method: 'DELETE',
        extra: { targetUserId: userId, targetEmail: target.email, killed: affected?.length ?? 0 },
    });

    revalidatePath(`/admin/identity/users/${userId}`);
    return { ok: true, killed: affected?.length ?? 0 };
}

/**
 * Wipe TOTP state so the user must re-enroll 2FA on their next login.
 * Useful when someone loses their authenticator app OR their TOTP
 * secret was encrypted with a rotated ENCRYPTION_KEY they can no
 * longer decrypt.
 */
export async function resetUserTwoFactor(userId) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { ok: false, error: gate.error };
    const target = await loadTarget(userId);
    if (!target) return { ok: false, error: 'User not found' };

    await sequelizeConnection.query(
        'UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_temp_secret = NULL WHERE id = :id',
        { replacements: { id: userId } }
    );

    const ctx = await getRequestContext();

    await logAuditEvent({
        name: 'User 2FA Reset',
        userName: gate.user.username || gate.user.email || 'Admin',
        url: `/admin/identity/users/${userId}`,
        method: 'PATCH',
        extra: { targetUserId: userId, targetEmail: target.email },
    });
    await logSecurityEvent({
        action: 'TwoFactorResetByAdmin',
        userId: userId,
        userName: target.email,
        ip: ctx.ip,
        browserInfo: ctx.browserInfo,
        extra: { by: gate.user.email || gate.user.username },
    });

    revalidatePath(`/admin/identity/users/${userId}`);
    return { ok: true };
}

/**
 * Flip is_locked_out on the target user. Unlocking also clears
 * failed_login_attempts / lockout_until / lockout_started_at so the
 * user can immediately log in with their current password.
 */
export async function toggleUserLocked(userId, locked) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { ok: false, error: gate.error };
    const target = await loadTarget(userId);
    if (!target) return { ok: false, error: 'User not found' };

    if (locked) {
        await sequelizeConnection.query(
            'UPDATE users SET is_locked_out = true, lockout_started_at = NOW() WHERE id = :id',
            { replacements: { id: userId } }
        );
    } else {
        await sequelizeConnection.query(
            'UPDATE users SET is_locked_out = false, failed_login_attempts = 0, lockout_until = NULL, lockout_started_at = NULL, last_failed_login_at = NULL WHERE id = :id',
            { replacements: { id: userId } }
        );
    }

    await logAuditEvent({
        name: locked ? 'User Locked' : 'User Unlocked',
        userName: gate.user.username || gate.user.email || 'Admin',
        url: `/admin/identity/users/${userId}`,
        method: 'PATCH',
        extra: { targetUserId: userId, targetEmail: target.email },
    });

    revalidatePath(`/admin/identity/users/${userId}`);
    return { ok: true };
}

/**
 * Send the target user a password-reset link. Uses the same short-lived
 * (10 min) token machinery that /forgot-password uses. Doesn't reveal
 * whether the email delivered — just fires and returns ok.
 */
export async function sendPasswordResetForUser(userId) {
    const gate = await requireWriteAdminAuth();
    if (!gate.ok) return { ok: false, error: gate.error };
    const target = await loadTarget(userId);
    if (!target) return { ok: false, error: 'User not found' };
    if (!target.email) return { ok: false, error: 'User has no email on file.' };

    const ctx = await getRequestContext();
    await generateLink(target.id, target.email);

    await logAuditEvent({
        name: 'Password Reset Email Sent',
        userName: gate.user.username || gate.user.email || 'Admin',
        url: `/admin/identity/users/${userId}`,
        method: 'POST',
        extra: { targetUserId: userId, targetEmail: target.email },
    });
    await logSecurityEvent({
        action: 'PasswordResetRequestedByAdmin',
        userId: userId,
        userName: target.email,
        ip: ctx.ip,
        browserInfo: ctx.browserInfo,
        extra: { by: gate.user.email || gate.user.username },
    });

    return { ok: true };
}
