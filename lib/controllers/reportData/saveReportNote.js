'use server'
import ReportNote from '@/database/models/ReportNote';
import { v4 as uuidv4 } from 'uuid';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';
import { canAccessSite } from '@/lib/services/authz/getAuthorizedSiteIds';

const tableReady = ReportNote.sync({ force: false }).catch(err =>
  console.error('ReportNote sync failed:', err)
);

// `editedByIgnored` is a legacy positional parameter kept for backwards
// compatibility with the existing client call sites. It is deliberately
// ignored — authorship is derived from the authenticated session so a
// caller can't spoof another user's identity in the audit column.
export default async function saveReportNote(siteId, month, year, day, customerId, note, editedByIgnored) {
  const { user } = await verifyAuth();
  if (!user) return { success: false, error: 'Not authenticated.' };
  if (!siteId) return { success: false, error: 'Missing siteId.' };
  // `verifyAuth` returns a Lucia user with only { id } — pass the id so
  // the authz helper re-fetches the full row with roles/customer_id.
  if (!(await canAccessSite(user.id, siteId))) {
    return { success: false, error: 'You do not have permission to note this site.' };
  }

  // Resolve a friendly audit label. Falling back to the id keeps the
  // row traceable even if the profile row somehow disappears.
  const actor = await db.User.findByPk(user.id, {
    attributes: ['username', 'email'],
    raw: true,
  });

  await tableReady;
  await ReportNote.create({
    id: uuidv4(),
    site_id: siteId,
    customer_id: customerId || '',
    report_day: day || null,
    report_month: month,
    report_year: year,
    note,
    edited_by: actor?.username || actor?.email || String(user.id),
  });
  return { success: true };
}
