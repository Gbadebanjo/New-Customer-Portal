'use server'
import models from '@/database/models';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { encrypt } from '@/lib/auth/ercryptTOTP';

export default async function startEnable2FA(userId) {
  console.log('Starting 2FA enable for userId:', userId);
  if (!userId) throw new Error('Missing userId');
  const user = await models.User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const secret = authenticator.generateSecret();
  const appName = process.env.APP_NAME || 'Customer-Portal';
  const otpauth = authenticator.keyuri(user.email, appName, secret);
  const qrDataUrl = await qrcode.toDataURL(otpauth);

  // store temp secret encrypted
  await models.User.update({ totp_temp_secret: encrypt(secret) }, { where: { id: userId } });

  return { qrDataUrl, secret };
}