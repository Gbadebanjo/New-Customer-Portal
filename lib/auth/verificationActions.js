'use server'

import { createInviteLink, createLink, createVerificationCode, verifyCode } from "../controllers/mail/verificationCode";
import { MailTypes, sendEmailByType } from "../services/mail/sendMail";
import { createAuthSession } from "./auth";
import { checkRateLimit } from "./rateLimiter";
import db from "@/database/models";

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

export async function generateCode(userId, email) {
    const { limited, retryAfterMs } = checkRateLimit(`otp-resend:${userId}`, 3, 15 * 60 * 1000);
    if (limited) {
        const minutes = Math.ceil(retryAfterMs / 60000);
        return { success: false, message: `Too many resend attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` };
    }

    const code = await createVerificationCode(userId);
    await sendEmailByType(MailTypes.VERIFICATION_CODE, email, { code });

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
