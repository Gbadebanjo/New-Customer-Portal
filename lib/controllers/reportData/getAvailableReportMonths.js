'use server';
import { QueryTypes } from 'sequelize';
import sequelizeConnection from '@/db_connection';

/**
 * Returns the distinct (year, month) pairs that have any report_data rows
 * for a given site, newest first. Used by the site details "Downloads"
 * block to list which months customers can export.
 */
export async function getAvailableReportMonths(siteId) {
    if (!siteId) return [];
    try {
        const rows = await sequelizeConnection.query(
            `SELECT report_year AS year, report_month AS month, COUNT(*) AS row_count,
                    SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified_count
               FROM report_data
              WHERE site_id = :siteId
              GROUP BY report_year, report_month
              ORDER BY report_year DESC, report_month DESC`,
            {
                replacements: { siteId: String(siteId) },
                type: QueryTypes.SELECT,
            }
        );
        return rows.map((r) => ({
            year: Number(r.year),
            month: Number(r.month),
            rowCount: Number(r.row_count),
            verifiedCount: Number(r.verified_count),
        }));
    } catch (err) {
        console.error('getAvailableReportMonths error:', err);
        return [];
    }
}
