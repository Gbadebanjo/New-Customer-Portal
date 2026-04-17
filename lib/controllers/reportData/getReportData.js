'use server'
import ReportData from '@/database/models/ReportData';

export default async function getReportData(siteId, month, year, customerId = '') {
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
