'use server';
import { verifyAuth } from '@/lib/auth/auth';
import { getUserPrefs, updateUserPrefs } from '@/lib/services/userPrefs/userPrefsStore';
import { buildWeeklyDigest } from '@/lib/services/digest/buildWeeklyDigest';
import { renderWeeklyDigest } from '@/lib/services/digest/renderWeeklyDigest';
import { sendMail } from '@/lib/services/mail/sendMail';
import db from '@/database/models';

async function currentUserId() {
    const { user } = await verifyAuth();
    return user?.id ?? null;
}

export async function getMyPrefs() {
    const userId = await currentUserId();
    if (!userId) return null;
    return getUserPrefs(userId);
}

export async function setWeeklyDigestEnabled(enabled) {
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: 'Not authenticated' };
    const prefs = updateUserPrefs(userId, { weeklyDigestEnabled: Boolean(enabled) });
    return { ok: true, prefs };
}

export async function setFavoriteSites(favoriteSites) {
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: 'Not authenticated' };
    const safeList = Array.isArray(favoriteSites)
        ? [...new Set(favoriteSites.map(String))]
        : [];
    const prefs = updateUserPrefs(userId, { favoriteSites: safeList });
    return { ok: true, prefs };
}

const VALID_FREQUENCIES = new Set(['off', 'daily', 'weekly', 'monthly']);

/**
 * How often to send the "your verified data is ready" notification.
 * 'off' silences these; 'daily/weekly/monthly' triggers on their cadence.
 */
export async function setReportNotifyFrequency(frequency) {
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: 'Not authenticated' };
    if (!VALID_FREQUENCIES.has(frequency)) {
        return { ok: false, error: 'Invalid frequency' };
    }
    const prefs = updateUserPrefs(userId, { reportNotifyFrequency: frequency });
    return { ok: true, prefs };
}

/**
 * Sends the caller a copy of the digest as it would look right now. Useful
 * for a "preview" button next to the opt-in toggle. Non-fatal — returns
 * a status message either way.
 */
export async function sendMyDigestPreview() {
    const userId = await currentUserId();
    if (!userId) return { ok: false, error: 'Not authenticated' };

    const user = await db.User.findByPk(userId, { raw: true });
    if (!user?.email) return { ok: false, error: 'No email on file' };

    const digest = await buildWeeklyDigest(userId);
    if (!digest || digest.siteCount === 0) {
        return { ok: false, error: 'No sites available to summarise' };
    }

    const portalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const html = renderWeeklyDigest({
        digest,
        userName: user.name || user.username,
        portalBaseUrl,
    });
    await sendMail({
        to: user.email,
        subject: '[Preview] Your weekly solar summary',
        html,
        text: 'Preview of your weekly solar summary.',
    });
    return { ok: true, sentTo: user.email };
}
