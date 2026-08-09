'use server'
import models from '@/database/models';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { encrypt } from '@/lib/auth/ercryptTOTP';
import { readLoginPending } from '@/lib/auth/loginPending';

export default async function startEnable2FA(userId) {
  if (!userId) throw new Error('Missing userId');

  // Gate: only continue if the login flow issued a `setup` pending
  // cookie for this exact userId. Without this check any authenticated
  // caller could point setup at any UUID with `totp_enabled = false`,
  // pull the TOTP secret out of our response, and then finish the
  // setup to obtain a session as the victim.
  const pending = await readLoginPending({ requiredPurpose: 'setup', expectedUserId: userId });
  if (!pending) throw new Error('Session expired. Please log in again.');

  const user = await models.User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const secret = authenticator.generateSecret();
  const appName = process.env.APP_NAME || 'Customer-Portal';
  const otpauth = authenticator.keyuri(user.email, appName, secret);
  const qrDataUrl = await qrcode.toDataURL(otpauth);

  await models.User.update({ totp_temp_secret: encrypt(secret) }, { where: { id: userId } });

  return { qrDataUrl, secret };
}