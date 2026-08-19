'use server'
import ReportData from '@/database/models/ReportData';
import { verifyAuth } from '@/lib/auth/auth';
import { canAccessSite } from '@/lib/services/authz/getAuthorizedSiteIds';

export default async function getReportData(siteId, month, year, customerId = '') {
  // Every caller must have a live session AND be authorised to see the
  // requested site. Without this, any authenticated user (or an
  // unauthenticated attacker who can reach the server-action id) could
  // enumerate the report for any customer just by supplying their siteId.
  const { user } = await verifyAuth();
  if (!user) return [];
  if (!siteId) return [];
  // Pass just the id string — `verifyAuth` returns a lucia user with
  // only { id }, so the authz helper must re-query the row for roles
  // and customer_id.
  if (!(await canAccessSite(user.id, siteId))) return [];

  const where = {
    site_id: siteId,
    report_month: month,
    report_year: year,
  };

  if (customerId) {
    where.customer_id = customerId;
  }

  const rows = await ReportData.findAll({
    where,
    order: [['day', 'ASC']],
    raw: true,
  });
  return JSON.parse(JSON.stringify(rows));
}
