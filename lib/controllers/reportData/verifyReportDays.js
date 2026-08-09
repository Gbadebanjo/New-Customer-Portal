'use server';
import { Op } from 'sequelize';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';
import { invalidatePrefix } from '@/lib/services/cache/memoryCache';

const NOC_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

async function currentNocUser() {
    const { user } = await verifyAuth();
    if (!user?.id) return null;
    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    if (!roles.some((r) => NOC_ROLES.has(r?.name))) return null;
    return full;
}

/**
 * Mark one or more days as verified for the given site/month/year.
 * Only NOC roles (Admin / Portal Admin / Customer Admin) can call.
 */
export async function verifyReportDays({ siteId, year, month, days }) {
    const user = await currentNocUser();
    if (!user) return { ok: false, error: 'Not authorised' };
    if (!siteId || !year || !month || !Array.isArray(days) || days.length === 0) {
        return { ok: false, error: 'Missing arguments' };
    }

    const [affected] = await db.ReportData.update(
        {
            status: 'verified',
            verified_at: new Date(),
            verified_by_user_id: user.id,
        },
        {
            where: {
                site_id: siteId,
                report_year: year,
                report_month: month,
                day: { [Op.in]: days },
            },
        }
    );

    // Downstream charts read verified rows through the resolver's 5-min
    // cache; bust that immediately so the flip is visible on next paint.
    if (affected > 0) invalidatePrefix('resolver:');
    return { ok: true, verified: affected };
}

/**
 * Flip a previously-verified row back to raw. Used when NOC realises they
 * verified prematurely; corrections after publication should go through
 * a normal edit + re-verify + note flow instead.
 */
export async function unverifyReportDays({ siteId, year, month, days }) {
    const user = await currentNocUser();
    if (!user) return { ok: false, error: 'Not authorised' };
    const [affected] = await db.ReportData.update(
        { status: 'raw', verified_at: null, verified_by_user_id: null },
        { where: {
            site_id: siteId,
            report_year: year,
            report_month: month,
            day: { [Op.in]: days },
        } }
    );
    if (affected > 0) invalidatePrefix('resolver:');
    return { ok: true, unverified: affected };
}

