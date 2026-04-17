'use server'

import { createLink, createVerificationCode, verifyCode } from "../controllers/mail/verificationCode";
import { MailTypes, sendEmailByType } from "../services/mail/sendMail";
import { createAuthSession } from "./auth";

export async function generateCode(userId, email) {
    const code = await createVerificationCode(userId);
    console.log(`Generated verification code: ${code}`);
    await sendEmailByType(MailTypes.VERIFICATION_CODE, email, { code });

    return { success: true, code };
}

export async function generateLink(userId, email) {
    console.log(`Generating reset link for user ID: ${userId} and email: ${email}`);
    const code = await createLink(userId);
    const link = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password/${code}`;
    console.log(`Generated link: ${link}`);
    await sendEmailByType(MailTypes.PASSWORD_RESET, email, { link });
    return { success: true, link };
}

export async function generateInviteLink(userId, email) {
    const code = await createLink(userId);
    const link = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password/${code}`;
    await sendEmailByType(MailTypes.INVITATION, email, { link });
    return { success: true, link };
}

export async function validateCode(userId, inputCode) {
    const result = await verifyCode(userId, inputCode);
    if (!result.success) {
        return { success: false, message: result.message };
    }
    
    await createAuthSession(userId);

    return { success: true };
}
