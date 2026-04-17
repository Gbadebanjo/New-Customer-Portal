import crypto from 'crypto';

const KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes base64
if (!KEY) {
  console.warn('ENCRYPTION_KEY not set; TOTP secrets will be stored unencrypted');
}

export function encrypt(text) {
  if (!KEY) return text;
  
  const key = Buffer.from(KEY, 'base64');
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decrypt(payload) {
  if (!KEY) return payload;

  const [ivB64, tagB64, encryptedB64] = payload.split('.');
  const key = Buffer.from(KEY, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
