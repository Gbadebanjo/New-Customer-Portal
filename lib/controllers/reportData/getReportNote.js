'use server'
import ReportNote from '@/database/models/ReportNote';

const tableReady = ReportNote.sync({ force: false }).catch(err =>
  console.error('ReportNote sync failed:', err)
);

export default async function getReportNotes(siteId, month, year, day = null, customerId = '') {
  await tableReady;
  const where = {
    site_id: siteId,
    report_month: month,
    report_year: year,
  };

  if (day !== null) where.report_day = day;
  if (customerId) where.customer_id = customerId;

  const notes = await ReportNote.findAll({
    where,
    order: [['created_at', 'DESC']],
    raw: true,
  });

  return notes.map(n => JSON.parse(JSON.stringify(n)));
}