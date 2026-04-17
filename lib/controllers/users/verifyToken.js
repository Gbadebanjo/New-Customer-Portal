import VerificationCode from "@/database/models/VerificationCode";

export default async function verifyToken(token) {

    const record = await VerificationCode.findOne({
        where : { code : token }
    });

    if (!record) {
        return { success: false, message: 'Verification token not found.' };
    }

    if (new Date() > record.expires_at) {
        return { success: false, message: 'Token has expired.' };
    }

    return { success: true, message: 'Token is valid.' , userId: record.user_id };
}
