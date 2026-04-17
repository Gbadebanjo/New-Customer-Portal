'use server'
import Report from '@/database/models/Report';

export default async function getReportById(reportId) {
    const report = await Report.findByPk(reportId, { raw: true });
    return { report };
}
