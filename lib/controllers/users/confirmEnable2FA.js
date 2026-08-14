'use server'
import models from '@/database/models';
import { authenticator } from 'otplib';
import { decrypt } from '@/lib/auth/ercryptTOTP';
import { logSecurityEvent } from '@/lib/services/logging/logSecurityEvent';
import { getRequestContext } from '@/lib/services/logging/requestContext';

export default async function confirmEnable2FA(userId, token) {
  if (!userId || !token) throw new Error('Missing inputs');
  const ctx = await getRequestContext();

  const user = await models.User.findByPk(userId);
  if (!user || !user.totp_temp_secret) {
    return { success: false, message: 'Setup not started' };
  }

  const secret = decrypt(user.totp_temp_secret);
  const valid = authenticator.check(token, secret);

  if (!valid) return { success: false, message: 'Invalid code' };

  await models.User.update(
    { totp_secret: user.totp_temp_secret, totp_temp_secret: null, totp_enabled: true },
    { where: { id: userId } }
  );

  await logSecurityEvent({ action: 'TwoFactorEnabled', userId: String(userId), userName: user.email, ip: ctx.ip, browserInfo: ctx.browserInfo });

  return { success: true };
}
