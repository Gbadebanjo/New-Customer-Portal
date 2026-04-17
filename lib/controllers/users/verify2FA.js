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

    return { valid: true };
}