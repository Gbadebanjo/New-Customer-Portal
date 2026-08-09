'use server'
import models from '@/database/models';
import { authenticator } from 'otplib';
import { decrypt } from '@/lib/auth/ercryptTOTP';
import { createAuthSession } from '@/lib/auth/auth';
import { logSecurityEvent } from '@/lib/services/logging/logSecurityEvent';

export default async function verify2FA(userId, token) {
    if (!userId || !token) throw new Error('Missing inputs');
    const user = await models.User.findByPk(userId);

    if (!user || !user.totp_enabled || !user.totp_secret) {
        return { valid: false };
    }
    const secret = decrypt(user.totp_secret);
    const valid = authenticator.check(token, secret);
    if (!valid) {
        await logSecurityEvent({ action: 'TwoFactorFailed', userId, userName: user.email });
        return { valid: false };
    }

    await createAuthSession(userId);
    await logSecurityEvent({ action: 'LoginSucceeded', userId, userName: user.email, extra: { method: '2FA' } });

    // Compute the landing URL server-side so the client can push once
    // instead of hopping through /dashboard → server redirect → /fleet
    // (which added ~3s of blank screen for Daystar-role users).
    const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
    const redirectTo = isDaystar ? '/fleet' : '/dashboard';

    return {
        valid: true,
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
            totp_enabled: user.totp_enabled,
        },
    };
}