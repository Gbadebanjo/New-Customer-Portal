import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import VerificationCode from "@/database/models/VerificationCode";
import { getSettings } from "@/lib/services/settings/settingsStore";

// The verification_codes table has UNIQUE(user_id) — only one pending
// code per user at a time. Every writer below therefore deletes any
// existing row for the user before inserting a fresh one. Cleaner than
// updating in place: no stale metadata, no partial-column-write risk,
// same wire behaviour (still exactly one row per user).

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_INVITE_DAYS = 30;

// Read the admin-configured invite expiry (Settings → Security → Invitation
// Link Expiry). Falls back to 30 days if unset or invalid so a new user
// invite always has a sane lifetime.
function readInviteTtlMs() {
    const s = getSettings()?.security || {};
    const d = Number(s.inviteExpiryDays);
    const days = Number.isFinite(d) && d >= 1 ? d : DEFAULT_INVITE_DAYS;
    return days * ONE_DAY;
}

async function replaceCodeForUser(userId, code, ttlMs) {
    await VerificationCode.destroy({ where: { user_id: userId } });
    await VerificationCode.create({
        user_id: userId,
        code,
        expires_at: new Date(Date.now() + ttlMs),
    });
}

// 6-digit numeric OTP for email-verification flows.
export async function createVerificationCode(userId) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await replaceCodeForUser(userId, code, TEN_MINUTES);
    return code;
}

// UUID link token for password-reset emails — short-lived for security.
export async function createLink(userId) {
    const token = uuidv4();
    await replaceCodeForUser(userId, token, TEN_MINUTES);
    return token;
}

// UUID link token for account invitations — the invitee may not check
// their mailbox for a while, so give them the admin-configured window
// (default 30 days) to activate before an admin needs to re-issue.
export async function createInviteLink(userId) {
    const token = uuidv4();
    await replaceCodeForUser(userId, token, readInviteTtlMs());
    return token;
}

export async function verifyCode(userId, inputCode) {
    const record = await VerificationCode.findOne({ where: { user_id: userId } });
    if (!record) {
        return { success: false, message: 'Verification code not found.' };
    }
    if (new Date() > record.expires_at) {
        return { success: false, message: 'Code has expired.' };
    }
    if (record.code !== inputCode) {
        return { success: false, message: 'Incorrect verification code.' };
    }
    return { success: true, message: 'Code is valid.' };
}

// Clean up expired codes (used by a cleanup pass; safe to invoke ad-hoc).
export async function cleanupExpiredCodes() {
    return VerificationCode.destroy({
        where: { expires_at: { [Op.lt]: new Date() } },
    });
}
