import crypto from 'crypto';
import db from '@/database/models';

// Prefix identifies environment at a glance without leaking the secret. Not
// used for auth — just for display.
const KEY_PREFIX = 'dsk_';

/** Compute the SHA-256 hash we store instead of the raw key. */
export function hashApiKey(raw) {
    return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

/** Generate a fresh key. Cryptographically random, URL-safe. */
export function generateApiKey() {
    // 32 bytes → 43 base64url chars. Plus 4-char prefix → 47 total.
    const random = crypto.randomBytes(32).toString('base64url');
    return `${KEY_PREFIX}${random}`;
}

/**
 * Return `{ customerId, scope, label, id }` if the raw key matches an active
 * (non-revoked) row. Bumps `last_used_at` as a side effect. Returns null for
 * unknown, revoked, or malformed keys.
 */
export async function lookupApiKey(rawKey) {
    if (!rawKey || typeof rawKey !== 'string') return null;
    if (!rawKey.startsWith(KEY_PREFIX)) return null;

    try {
        const row = await db.ApiKey.findOne({
            where: { key_hash: hashApiKey(rawKey) },
        });
        if (!row) return null;
        if (row.revoked_at) return null;

        // Best-effort last-used timestamp — don't block the request on it.
        row.update({ last_used_at: new Date() }).catch(() => { /* ignore */ });

        return {
            id: row.id,
            customerId: row.customer_id || null,
            scope: row.scope,
            label: row.label,
        };
    } catch (err) {
        console.error('lookupApiKey error', err);
        return null;
    }
}
