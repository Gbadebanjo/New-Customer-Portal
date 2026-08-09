'use server'
import sequelizeConnection from '@/db_connection';
import { QueryTypes } from 'sequelize';

export default async function getDistinctSites() {
  try {
    const sites = await sequelizeConnection.query(
      `SELECT DISTINCT site_id FROM report_data ORDER BY site_id ASC`,
      { type: QueryTypes.SELECT }
    );
    return sites.map((s) => s.site_id).sort();
  } catch (e) {
    console.error('getDistinctSites failed:', e?.message);
    return [];
  }
}
