'use server'
import ReportData from '@/database/models/ReportData';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';
import { invalidatePrefix } from '@/lib/services/cache/memoryCache';
import { revalidatePath } from "next/cache";
import { MailTypes, sendEmailByType } from '@/lib/services/mail/sendMail';

// Rows the caller entered / edited in the UI are treated as verified —
// a Daystar user reviewing and saving a row IS the verification step.
// Only Daystar roles reach saveReportData; customers view the table
// read-only.
const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

function hasActualData(row) {
  return (
    (row.total_daily_consumption || 0) !== 0 ||
    (row.total_daytime_consumption || 0) !== 0 ||
    (row.planned_daytime_consumption || 0) !== 0 ||
    (row.pv_production || 0) !== 0 ||
    (row.planned_pv_production || 0) !== 0 ||
    (row.energy_production_turbine || 0) !== 0 ||
    (row.energy_production_diesel_generator || 0) !== 0 ||
    (row.daily_daytime_solar_displacement || '').trim() !== '' ||
    (row.total_solar_displacement || '').trim() !== '' ||
    (row.data_capture_daytime || '').trim() !== '' ||
    (row.data_capture_entire_day || '').trim() !== '' ||
    (row.remarks || '').trim() !== ''
  );
}

export default async function saveReportData(siteId, month, year, rows, plannedMonthlyKwh, customerId = '') {
  try {
    // Only Daystar users can write. Also lets us stamp verified_at with
    // an authenticated timestamp rather than trusting the client.
    const { user } = await verifyAuth();
    if (!user?.id) return { success: false, error: 'Not authenticated' };
    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
    if (!isDaystar) return { success: false, error: 'Not authorised' };

    const nowIso = new Date();
    // Only process rows that actually have data entered
    const rowsWithData = rows.filter(hasActualData);
    for (const row of rowsWithData) {
      const where = {
        site_id: siteId,
        report_month: month,
        report_year: year,
        day: row.day,
      };

      const data = {
        customer_id: customerId,
        site_id: siteId,
        report_month: month,
        report_year: year,
        day: row.day,
        total_daily_consumption: row.total_daily_consumption || 0,
        total_daytime_consumption: row.total_daytime_consumption || 0,
        planned_daytime_consumption: row.planned_daytime_consumption || 0,
        pv_production: row.pv_production || 0,
        planned_pv_production: row.planned_pv_production || 0,
        energy_production_turbine: row.energy_production_turbine || 0,
        energy_production_diesel_generator: row.energy_production_diesel_generator || 0,
        daily_daytime_solar_displacement: row.daily_daytime_solar_displacement || '',
        total_solar_displacement: row.total_solar_displacement || '',
        data_capture_daytime: row.data_capture_daytime || '',
        data_capture_entire_day: row.data_capture_entire_day || '',
        remarks: row.remarks || '',
        planned_monthly_kwh: plannedMonthlyKwh || 0,
        // Saving through the UI = editing = curated → mark verified so
        // customers immediately see the corrected numbers.
        status: 'verified',
        verified_at: nowIso,
        verified_by_user_id: user.id,
      };

      const existing = await ReportData.findOne({ where });

      if (existing) {
        await existing.update(data);
      } else {
        await ReportData.create(data);
      }
    }

    // Bust the resolver's per-window cache so any Compare / Dashboard
    // widget reading verified data sees the change on next paint.
    if (rowsWithData.length > 0) invalidatePrefix('resolver:');
    revalidatePath('/reports');

    // Fan out an in-app notification + a "you have a new report" email to
    // every customer user attached to this customer. Best-effort — never
    // fails the save. Skips notify when customerId is empty (a Daystar
    // user editing an un-mapped site).
    if (rowsWithData.length > 0 && customerId) {
      notifyCustomerOfNewReport({
        customerId,
        siteId,
        month,
        year,
        verifiedCount: rowsWithData.length,
      }).catch((err) => console.error('notifyCustomerOfNewReport failed:', err?.message));
    }

    return { success: true, verified: rowsWithData.length };
  } catch (error) {
    console.error('Error saving report data:', error);
    return { success: false, error: error.message };
  }
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

async function notifyCustomerOfNewReport({ customerId, siteId, month, year, verifiedCount }) {
  const users = await db.User.findAll({ where: { customer: customerId }, raw: true });
  if (users.length === 0) return;

  // Site name is only useful for a friendlier email subject. The old
  // `reports` table that held site labels has been dropped; leaving
  // this null means the email template falls back to "your site".
  const siteName = null;

  const periodLabel = MONTHS[(month || 1) - 1] ? `${MONTHS[(month || 1) - 1]} ${year}` : '';
  const href = `/reports?site=${encodeURIComponent(siteId)}&month=${month}&year=${year}`;
  const title = 'A new report is ready';
  const body = verifiedCount === 1
    ? `1 new verified day is available${siteName ? ` for ${siteName}` : ''}${periodLabel ? ` (${periodLabel})` : ''}.`
    : `${verifiedCount} new verified days are available${siteName ? ` for ${siteName}` : ''}${periodLabel ? ` (${periodLabel})` : ''}.`;

  // In-app notifications — one row per user
  const rows = users.map((u) => ({
    user_id: u.id,
    kind: 'report_ready',
    title,
    body,
    href,
    metadata: { siteId, month, year, verifiedCount, customerId },
  }));
  try {
    await db.Notification.bulkCreate(rows);
  } catch (err) {
    console.error('notifyCustomerOfNewReport: bulkCreate failed:', err?.message);
  }

  // Email — "You have a new report" per customer user.
  const rawBase = process.env.NEXT_PUBLIC_BASE_URL || '';
  const base = process.env.NODE_ENV === 'production'
    ? rawBase.replace(/^http:\/\//, 'https://')
    : rawBase;
  const link = `${base}${href}`;
  await Promise.all(users.filter((u) => u.email).map((u) =>
    sendEmailByType(MailTypes.REPORT_READY, u.email, {
      name: u.name || 'there',
      siteName: siteName || '',
      periodLabel,
      link,
    }).catch((err) => console.error('REPORT_READY mail failed:', u.email, err?.message))
  ));
}
