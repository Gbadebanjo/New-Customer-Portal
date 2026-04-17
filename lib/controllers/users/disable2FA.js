'use server'
import models from '@/database/models';
import { verifyPassword } from '@/lib/auth/hash';

export default async function disable2FA(userId, password) {
  if (!userId || !password) throw new Error('Missing inputs');

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
