'use server'
import models from '@/database/models';
import { verifyPassword } from '@/lib/auth/hash';
import { verifyAuth } from '@/lib/auth/auth';

export default async function disable2FA(userId, password) {
  if (!userId || !password) throw new Error('Missing inputs');

  // Only the account owner may disable their own 2FA. Requiring the
  // current password on top of session ownership means an XSS on the
  // profile page still can't disable 2FA silently.
  const { user: caller } = await verifyAuth();
  if (!caller?.id || caller.id !== userId) {
    return { success: false, message: 'Not authorised' };
  }

  const user = await models.User.findByPk(userId);
  if (!user) return { success: false, message: 'User not found' };

  const isValid = verifyPassword(user.password, password);
  if (!isValid) return { success: false, message: 'Incorrect password' };

  await models.User.update(
    { totp_enabled: false, totp_secret: null, totp_temp_secret: null },
    { where: { id: userId } }
  );

  return { success: true };
}
