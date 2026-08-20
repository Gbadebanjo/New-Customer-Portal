'use server';

// Short-lived signed cookie that carries the userId of a login flow
// between the credential-check step and the 2FA setup/verify step.
//
// Without this, `startEnable2FA(userId)`, `enable2FAAndLogin(userId,
// code)`, and `verify2FA(userId, code)` all accept a client-provided
// userId — meaning an attacker who knows any UUID can (for accounts
// that haven't set up 2FA yet) start the setup for THEM, receive the
// TOTP secret in the response, and finish the setup to obtain a valid
// session as the victim.
//
// The cookie is HTTP-only, HMAC-signed (constant-time compared), and
// expires after 10 minutes. It's set inside `login()` when password
// verification succeeds and cleared after a session is created.

import { cookies } from 'next/headers';
import crypto from 'node:crypto';

const COOKIE_NAME = 'login_pending';
const TTL_MS = 10 * 60 * 1000;

// Prefer a dedicated secret; fall back to the shared internal secret.
// In production, if NONE of the three env vars is configured we FAIL
// CLOSED — the sign/verify functions throw and the login flow aborts.
// The old string fallback allowed a fresh prod deployment to sign
// login-pending cookies with a value that lives in this repo, which
// would let anyone with a victim's UUID forge a valid pending cookie
// and bypass the password step. In development the fallback is kept
// (with a loud warning) so local dev doesn't need env plumbing.
const DEV_FALLBACK_SECRET = 'insecure-development-only-secret';
let devFallbackWarned = false;

function getSigningSecret() {
    const configured = process.env.LOGIN_PENDING_SECRET
        || process.env.INTERNAL_LOG_SECRET
        || process.env.SESSION_SECRET;
    if (configured) return configured;

    if (process.env.NODE_ENV === 'production') {
        // Fail closed. Caller catches → login/verify actions treat the
        // pending cookie as invalid and the user is bounced to /login.
        throw new Error(
            '[loginPending] No signing secret configured. Set LOGIN_PENDING_SECRET (or INTERNAL_LOG_SECRET / SESSION_SECRET) in the production environment.'
        );
    }

    if (!devFallbackWarned) {
        devFallbackWarned = true;
        console.warn('[loginPending] Using DEV fallback signing secret. Set LOGIN_PENDING_SECRET in .env to silence this warning.');
    }
    return DEV_FALLBACK_SECRET;
}

function sign(payload) {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', getSigningSecret()).update(b64).digest('base64url');
    return `${b64}.${sig}`;
}

function verify(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const [b64, sig] = token.split('.');
    let expected;
    try {
        // getSigningSecret() throws in prod when no secret is set — we
        // treat that as "cookie is invalid" so downstream callers
        // (verify2FA, validateCode) return their session-expired
        // signal and the user is bounced to /login rather than 500ing.
        expected = crypto.createHmac('sha256', getSigningSecret()).update(b64).digest('base64url');
    } catch (err) {
        console.error('[loginPending] verify() aborted:', err?.message);
        return null;
    }
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    try {
        const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
        if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

// `purpose` is 'setup' when the user must enrol 2FA, '2fa' when they
// already have 2FA and need to enter a TOTP code, or 'email' when they
// asked for the email-code fallback.
export async function setLoginPending(userId, purpose) {
    const token = sign({ userId, purpose, exp: Date.now() + TTL_MS });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(TTL_MS / 1000),
    });
}

// Returns { userId, purpose, exp } if the cookie is present, valid, and
// unexpired. Otherwise null. Optionally checks `requiredPurpose` and
// `expectedUserId` so callers get a single go/no-go answer.
export async function readLoginPending({ requiredPurpose, expectedUserId } = {}) {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    const payload = verify(raw);
    if (!payload) return null;
    if (requiredPurpose && payload.purpose !== requiredPurpose) return null;
    if (expectedUserId && payload.userId !== expectedUserId) return null;
    return payload;
}

export async function clearLoginPending() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}
