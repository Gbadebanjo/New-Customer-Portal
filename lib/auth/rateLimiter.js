/**
 * Simple in-memory rate limiter.
 * NOTE: This is per-process. For multi-instance deployments, use Redis instead.
 */

const store = new Map(); // key → { count, resetAt }

/**
 * @param {string} key       - Usually the IP address
 * @param {number} maxAttempts
 * @param {number} windowMs  - Window in milliseconds
 * @returns {{ limited: boolean, retryAfterMs: number }}
 */
export function checkRateLimit(key, maxAttempts = 5, windowMs = 60 * 60 * 1000) {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { limited: false, retryAfterMs: 0 };
    }

    entry.count += 1;

    if (entry.count > maxAttempts) {
        return { limited: true, retryAfterMs: entry.resetAt - now };
    }

    return { limited: false, retryAfterMs: 0 };
}

/**
 * Clear a key's rate-limit counter. Called after a successful login so
 * that legitimate users on a shared IP (corporate NAT, families behind
 * one router) aren't penalised by unrelated colleagues typing wrong
 * passwords earlier.
 */
export function resetRateLimit(key) {
    store.delete(key);
}
