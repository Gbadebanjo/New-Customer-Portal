'use server'
import ReportData from '@/database/models/ReportData';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';
import { canAccessSite } from '@/lib/services/authz/getAuthorizedSiteIds';

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

export default async function getReportData(siteId, month, year, customerId = '') {
    // Auth + per-site authorization. `verifyAuth` returns a lucia user
    // with only { id }, so the authz helper must re-query the row for
    // roles and customer_id.
    const { user } = await verifyAuth();
    if (!user) return [];
    if (!siteId) return [];
    if (!(await canAccessSite(user.id, siteId))) return [];

    // Customer-facing callers see ONLY sent (verified) days. Daystar
    // roles see every row — raw / in_progress / verified — so the NOC
    // can review pending work and hit "Send Report" when ready.
    const full = await db.User.findByPk(user.id, {
        attributes: ['id', 'roles'],
        raw: true,
    });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));

    const where = {
        site_id: siteId,
        report_month: month,
        report_year: year,
    };
    if (customerId) where.customer_id = customerId;
    if (!isDaystar) where.status = 'verified';

    const rows = await ReportData.findAll({
        where,
        order: [['day', 'ASC']],
        raw: true,
    });
    return JSON.parse(JSON.stringify(rows));
}
