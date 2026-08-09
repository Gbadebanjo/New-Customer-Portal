/**
 * Process-local, promise-aware TTL cache.
 *
 * - Concurrent requests for the same key share one in-flight fetch
 *   (request coalescing — no thundering herd on cold misses).
 * - Successful results are cached for `ttlMs`.
 * - Failures are NOT cached — the next caller retries.
 * - Survives across React renders within one Node process. On Vercel and
 *   other multi-instance deploys each process has its own cache — that's
 *   fine, we still cut per-instance AMMP traffic proportionally.
 *
 * IMPORTANT: In Next.js DEV mode the module state can be wiped on every
 * request as Turbopack re-instantiates modules. Attach the store to
 * `globalThis` so it survives module reloads within a single Node process.
 *
 * NOT a distributed cache. Move to Redis if we ever need shared state.
 */
const G = globalThis;
if (!G.__daystarMemoryCache) {
    G.__daystarMemoryCache = new Map();
}
const store = G.__daystarMemoryCache; // key -> { value | promise, expiresAt }

// Toggle on/off with CACHE_DEBUG=1 in .env. Server-side only.
const DEBUG = process.env.CACHE_DEBUG === '1';

/**
 * Wrap an async fetch with caching.
 *
 *   const assets = await withCache('ammp:assets', 5 * 60_000, () => getAssets(token));
 *
 * @param {string} key      Unique cache key.
 * @param {number} ttlMs    How long to keep the result fresh, in ms.
 * @param {() => Promise<any>} fetcher  Function that produces the value.
 */
export async function withCache(key, ttlMs, fetcher) {
    const now = Date.now();
    const hit = store.get(key);

    if (hit && hit.expiresAt > now) {
        if (DEBUG) console.log(`[cache HIT ] ${key} — ${Math.round((hit.expiresAt - now) / 1000)}s remaining`);
        return hit.value;
    }

    const t0 = Date.now();
    const promise = Promise.resolve().then(fetcher);
    store.set(key, { value: promise, expiresAt: now + ttlMs });

    try {
        const result = await promise;
        if (DEBUG) console.log(`[cache MISS] ${key} — fetched in ${Date.now() - t0}ms`);
        store.set(key, { value: result, expiresAt: now + ttlMs });
        return result;
    } catch (err) {
        if (DEBUG) console.log(`[cache FAIL] ${key} — after ${Date.now() - t0}ms`);
        if (store.get(key)?.value === promise) store.delete(key);
        throw err;
    }
}

/** Drop a single key. */
export function invalidate(key) {
    store.delete(key);
}

/** Drop every key that starts with `prefix`. */
export function invalidatePrefix(prefix) {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
    }
}

/** Wipe the cache — useful for tests. */
export function clearAll() {
    store.clear();
}

/** Cache stats — how many entries live in the store right now. */
export function stats() {
    return { size: store.size };
}

/**
 * Turn an arbitrary string (typically an AMMP bearer token) into a short,
 * stable identifier suitable for use as a cache-key prefix. Two different
 * customers with different AMMP API keys receive different tokens, so their
 * cached responses stay in separate scopes — no more cross-customer leakage
 * during impersonation.
 *
 * DJB hash → base-36. Non-cryptographic; collision probability at our scale
 * is negligible.
 */
export function scopeKey(input) {
    if (!input) return 'anon';
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
        h = ((h << 5) + h) ^ input.charCodeAt(i);
    }
    return (h >>> 0).toString(36);
}
