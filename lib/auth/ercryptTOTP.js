import crypto from 'crypto';

// Read + validate at module load time so a misconfigured key surfaces
// on server boot instead of at the moment a user tries to set up 2FA.
// The old error was `RangeError: Invalid key length` from deep inside
// createCipheriv, which gave no signal about what the actual size was.
// Now the message tells us exactly what runtime got.
const KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes base64
const KEY_BUF = KEY ? Buffer.from(KEY, 'base64') : null;

if (!KEY) {
  console.warn('ENCRYPTION_KEY not set; TOTP secrets will be stored unencrypted');
} else if (KEY_BUF.length !== 32) {
  // Deliberately loud: throwing at boot beats crashing on first 2FA attempt.
  throw new Error(
    `ENCRYPTION_KEY must be 32 bytes when base64-decoded (got ${KEY_BUF.length} bytes from a ${KEY.length}-char string). ` +
    `Check .env and restart the dev server so process.env is reloaded.`
  );
}

export function encrypt(text) {
  if (!KEY_BUF) return text;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY_BUF, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decrypt(payload) {
  if (!KEY_BUF) return payload;

  const [ivB64, tagB64, encryptedB64] = payload.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY_BUF, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
