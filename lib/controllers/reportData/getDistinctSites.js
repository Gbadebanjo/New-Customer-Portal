'use server'
import sequelizeConnection from '@/db_connection';
import { QueryTypes } from 'sequelize';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Daystar-side only — enumerating every site in `report_data` is a
// fleet-wide operation. Customer users have no legitimate use for it.
export default async function getDistinctSites() {
  try {
    const { user } = await verifyAuth();
    if (!user?.id) return [];
    const caller = await db.User.findByPk(user.id, { attributes: ['roles'], raw: true });
    const roles = Array.isArray(caller?.roles) ? caller.roles : [];
    if (!roles.some((r) => DAYSTAR_ROLES.has(r?.name))) return [];

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
