'use server'

import { createInviteLink, createLink, createVerificationCode, verifyCode } from "../controllers/mail/verificationCode";
import { MailTypes, sendEmailByType } from "../services/mail/sendMail";
import { createAuthSession } from "./auth";
import { checkRateLimit } from "./rateLimiter";
import { readLoginPending, clearLoginPending } from "./loginPending";
import db from "@/database/models";

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Email-code fallback for users who can't get a TOTP code (lost their
// authenticator app, etc.). Two changes vs the original:
//
//   1. Email is looked up from the DB by userId — NEVER trusted from
//      the client. Previously the client passed the address to send to,
//      which meant an attacker who knew a victim's UUID could pass
//      their own address, receive the OTP, and hand it back to
//      validateCode to log in as the victim.
//   2. Gated behind the signed login-pending cookie so a caller must
//      have actually passed the password check in `login()` first.
//
// `email` parameter is accepted only for backwards compatibility with
// existing callers, and is ignored.
export async function generateCode(userId /*, email — ignored */) {
    // Gate: only allow if login() set a pending cookie for this userId.
    const pending = await readLoginPending({ requiredPurpose: '2fa', expectedUserId: userId });
    if (!pending) return { success: false, reason: 'session_expired', message: 'Session expired. Please log in again.' };

    const { limited, retryAfterMs } = checkRateLimit(`otp-resend:${userId}`, 3, 15 * 60 * 1000);
    if (limited) {
        const minutes = Math.ceil(retryAfterMs / 60000);
        return { success: false, message: `Too many resend attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` };
    }

    // Look up the destination address from the DB — never trust the
    // client-supplied one.
    const user = await db.User.findByPk(userId, { attributes: ['email'], raw: true });
    if (!user?.email) return { success: false, message: 'User has no email on file.' };

    const code = await createVerificationCode(userId);
    await sendEmailByType(MailTypes.VERIFICATION_CODE, user.email, { code });

    return { success: true };
}

export async function generateLink(userId, email) {
    const code = await createLink(userId);
    const rawBase = process.env.NEXT_PUBLIC_BASE_URL || '';
    const base = process.env.NODE_ENV === 'production' ? rawBase.replace(/^http:\/\//, 'https://') : rawBase;
    const link = `${base}/reset-password/${code}`;
    await sendEmailByType(MailTypes.PASSWORD_RESET, email, { link });
    return { success: true };
}

export async function generateInviteLink(userId, email) {
    // 30-day expiry (vs 10 min for password reset) — invitees may not
    // check their mailbox immediately.
    const code = await createInviteLink(userId);
    const rawBase = process.env.NEXT_PUBLIC_BASE_URL || '';
    const base = process.env.NODE_ENV === 'production' ? rawBase.replace(/^http:\/\//, 'https://') : rawBase;
    const link = `${base}/reset-password/${code}`;
    await sendEmailByType(MailTypes.INVITATION, email, { link });
    return { success: true };
}

export async function validateCode(userId, inputCode) {
    // Same gate as verify2FA — refuse unless login() issued a pending
    // cookie for this userId. Otherwise anyone with a valid OTP (e.g.
    // one they generated themselves after `getUserById` leaked another
    // user's info) could sidestep the password check entirely.
    const pending = await readLoginPending({ requiredPurpose: '2fa', expectedUserId: userId });
    if (!pending) return { success: false, reason: 'session_expired', message: 'Session expired. Please log in again.' };

    const { limited, retryAfterMs } = checkRateLimit(`otp-verify:${userId}`, 5, 15 * 60 * 1000);
    if (limited) {
        const minutes = Math.ceil(retryAfterMs / 60000);
        return { success: false, message: `Too many attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` };
    }

    const result = await verifyCode(userId, inputCode);
    if (!result.success) {
        return { success: false, message: result.message };
    }

    await createAuthSession(userId);
    // Cookie is single-use — new session supersedes it.
    await clearLoginPending();

    // Same principle as verify2FA / enable2FAAndLogin: compute the landing
    // URL server-side so Daystar-role users skip the /dashboard → /fleet
    // redirect hop, and return the user payload so the client doesn't need
    // a second getUserById() roundtrip.
    const user = await db.User.findByPk(userId);
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
    const redirectTo = isDaystar ? '/fleet' : '/dashboard';

    return {
        success: true,
        redirectTo,
        user: user ? {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            surname: user.surname,
            roles: user.roles,
            customer: user.customer,
            timezone: user.timezone,
            totp_enabled: user.totp_enabled,
        } : null,
    };
}
