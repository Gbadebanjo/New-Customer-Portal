'use server'
import ReportNote from '@/database/models/ReportNote';
import { v4 as uuidv4 } from 'uuid';

const tableReady = ReportNote.sync({ force: false }).catch(err =>
  console.error('ReportNote sync failed:', err)
);

export default async function saveReportNote(siteId, month, year, day, customerId, note, editedBy) {
  await tableReady;
  await ReportNote.create({
    id: uuidv4(),
    site_id: siteId,
    customer_id: customerId || '',
    report_day: day || null,
    report_month: month,
    report_year: year,
    note,
    edited_by: editedBy,
  });
  return { success: true };
}