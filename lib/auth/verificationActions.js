'use server'

import { createLink, createVerificationCode, verifyCode } from "../controllers/mail/verificationCode";
import { MailTypes, sendEmailByType } from "../services/mail/sendMail";
import { createAuthSession } from "./auth";
import { checkRateLimit } from "./rateLimiter";

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
    const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/^http:\/\//, 'https://');
    const link = `${base}/reset-password/${code}`;
    await sendEmailByType(MailTypes.PASSWORD_RESET, email, { link });
    return { success: true };
}

export async function generateInviteLink(userId, email) {
    const code = await createLink(userId);
    const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/^http:\/\//, 'https://');
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

    return { success: true };
}
