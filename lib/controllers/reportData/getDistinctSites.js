'use server'
import sequelizeConnection from '@/db_connection';
import { QueryTypes } from 'sequelize';

export default async function getDistinctSites() {
  let sites = [];
  let siteDetailSites = [];

  try {
    sites = await sequelizeConnection.query(
      `SELECT DISTINCT site_id FROM report_data ORDER BY site_id ASC`,
      { type: QueryTypes.SELECT }
    );
  } catch (e) {
    console.log('report_data table not available:', e.message);
  }

  try {
    siteDetailSites = await sequelizeConnection.query(
      `SELECT DISTINCT site_id FROM site_details ORDER BY site_id ASC`,
      { type: QueryTypes.SELECT }
    );
  } catch (e) {
    console.log('site_details table not available:', e.message);
  }

  // Merge unique site_ids from both tables
  const allSiteIds = new Set([
    ...sites.map(s => s.site_id),
    ...siteDetailSites.map(s => s.site_id),
  ]);

  return Array.from(allSiteIds).sort();
}
