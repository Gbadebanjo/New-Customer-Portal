import crypto from 'node:crypto';

export function hashUserPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');

  const hashedPassword = crypto.scryptSync(password, salt, 64);
  return hashedPassword.toString('hex') + ':' + salt;
}

// Migrated accounts carry their original ASP.NET Core Identity password hash
// (base64: version byte + PRF id + iteration count + salt size + salt + subkey).
// Our own hashes are always "<hex>:<hex>", which base64 never produces, so the
// presence of ':' unambiguously tells the two formats apart.
export function isLegacyPasswordHash(storedPassword) {
  return typeof storedPassword === 'string' && !storedPassword.includes(':');
}

function verifyLegacyAspNetPassword(storedHash, suppliedPassword) {
  let decoded;
  try {
    decoded = Buffer.from(storedHash, 'base64');
  } catch {
    return false;
  }
  if (decoded.length < 13 || decoded[0] !== 0x01) return false;

  const prf = decoded.readUInt32BE(1);
  const iterCount = decoded.readUInt32BE(5);
  const saltSize = decoded.readUInt32BE(9);
  if (decoded.length < 13 + saltSize) return false;

  const salt = decoded.subarray(13, 13 + saltSize);
  const subkey = decoded.subarray(13 + saltSize);
  const prfName = { 0: 'sha1', 1: 'sha256', 2: 'sha512' }[prf] || 'sha256';

  const derivedKey = crypto.pbkdf2Sync(suppliedPassword, salt, iterCount, subkey.length, prfName);
  return derivedKey.length === subkey.length && crypto.timingSafeEqual(derivedKey, subkey);
}

export function verifyPassword(storedPassword, suppliedPassword) {
  if (isLegacyPasswordHash(storedPassword)) {
    return verifyLegacyAspNetPassword(storedPassword, suppliedPassword);
  }
  const [hashedPassword, salt] = storedPassword.split(':');
  const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
  const suppliedPasswordBuf = crypto.scryptSync(suppliedPassword, salt, 64);
  return crypto.timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}