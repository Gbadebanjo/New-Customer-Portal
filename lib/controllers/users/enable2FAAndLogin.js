'use server'
import models from '@/database/models';
import { authenticator } from 'otplib';
import { decrypt } from '@/lib/auth/ercryptTOTP';
import { createAuthSession } from '@/lib/auth/auth';
import { logSecurityEvent } from '@/lib/services/logging/logSecurityEvent';
import { readLoginPending, clearLoginPending } from '@/lib/auth/loginPending';

// First-time-login 2FA enroll: confirms the setup code, flips
// `totp_enabled`, and starts the auth session so the user proceeds
// straight to the app. Called from LoginScreen's setup2FA step after
// `login()` returns `requireSetup2FA: true`.
export default async function enable2FAAndLogin(userId, token) {
    if (!userId || !token) return { success: false, message: 'Missing inputs' };

    // Same gate as startEnable2FA — refuse if the caller can't prove
    // (via signed cookie) that they actually completed a login for
    // this userId in the last 10 minutes.
    const pending = await readLoginPending({ requiredPurpose: 'setup', expectedUserId: userId });
    if (!pending) return { success: false, message: 'Session expired. Please log in again.' };

    const user = await models.User.findByPk(userId);
    if (!user) return { success: false, message: 'User not found' };

    // If 2FA is somehow already enabled, this action is not valid.
    if (user.totp_enabled) return { success: false, message: '2FA is already enabled' };

    if (!user.totp_temp_secret) {
        return { success: false, message: 'Setup not started' };
    }

    const secret = decrypt(user.totp_temp_secret);
    const valid = authenticator.check(token, secret);
    if (!valid) {
        await logSecurityEvent({ action: 'TwoFactorSetupFailed', userId: String(userId), userName: user.email });
        return { success: false, message: 'Invalid code' };
    }

    await models.User.update(
        { totp_secret: user.totp_temp_secret, totp_temp_secret: null, totp_enabled: true },
        { where: { id: userId } }
    );

    await createAuthSession(userId);
    // Session is live — the pending cookie is single-use.
    await clearLoginPending();

    await logSecurityEvent({ action: 'TwoFactorEnabled', userId: String(userId), userName: user.email });
    await logSecurityEvent({ action: 'LoginSucceeded', userId: String(userId), userName: user.email, extra: { method: '2FA-setup' } });

    // Return the correct landing URL + user payload so the client doesn't
    // need to make a second server call to fetch the user and doesn't hop
    // through /dashboard for Daystar-role accounts.
    const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
    const redirectTo = isDaystar ? '/fleet' : '/dashboard';

    return {
        success: true,
        redirectTo,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            surname: user.surname,
            roles: user.roles,
            customer: user.customer,
            timezone: user.timezone,
            totp_enabled: true,
        },
    };
}
