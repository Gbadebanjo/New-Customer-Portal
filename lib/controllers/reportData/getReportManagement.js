'use server';
import { Op, QueryTypes } from 'sequelize';
import db from '@/database/models';
import sequelizeConnection from '@/db_connection';
import { verifyAuth } from '@/lib/auth/auth';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';
import AmmpServices from '@/lib/services/ammp/AmmpServices';

// Reports-management view is a Daystar-side operational tool — only
// Admin / Portal Admin / DCA are allowed to see it. Customer users
// never call this action.
const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

/**
 * Roll-up of every (site, month, year) tuple in `report_data`, split
 * by status. Powers both the Admin Analytics "Reports management"
 * section and the Fleet screen's reports pipeline card.
 *
 * Uses raw SQL rather than Sequelize's aggregation builder — the
 * builder chokes on `fn('COUNT', literal(...))` on some 6.x versions
 * with `attr[0].includes is not a function` (which is what the fleet
 * page was hitting).
 *
 * Returns:
 *   {
 *     ok: true,
 *     totals: { rawSites, pendingSites, sentSites },
 *     items: [{
 *       siteId, customerId, year, month,
 *       raw, inProgress, verified,
 *       status: 'sent' | 'pending' | 'raw' | 'mixed',
 *       lastActivity: ISO string | null,
 *     }]
 *   }
 */
export async function getReportManagement({ limit = 200 } = {}) {
    const { user } = await verifyAuth();
    if (!user?.id) return { ok: false, error: 'Not authenticated.' };

    const caller = await db.User.findByPk(user.id, {
        attributes: ['id', 'roles'],
        raw: true,
    });
    const roles = Array.isArray(caller?.roles) ? caller.roles : [];
    if (!roles.some((r) => DAYSTAR_ROLES.has(r?.name))) {
        return { ok: false, error: 'Not authorised.' };
    }

    try {
        const rows = await sequelizeConnection.query(
            `SELECT
                site_id                                                 AS site_id,
                customer_id                                             AS customer_id,
                report_year                                             AS year,
                report_month                                            AS month,
                SUM(CASE WHEN status = 'raw'         THEN 1 ELSE 0 END) AS raw_count,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
                SUM(CASE WHEN status = 'verified'    THEN 1 ELSE 0 END) AS verified_count,
                MAX(updated_at)                                         AS last_activity
             FROM report_data
             GROUP BY site_id, customer_id, report_year, report_month
             ORDER BY MAX(updated_at) DESC NULLS LAST
             LIMIT :lim`,
            { replacements: { lim: Number(limit) }, type: QueryTypes.SELECT }
        );

        // Resolve site codes (asset_name, e.g. `DAY_LAG_001`) from
        // AMMP + customer display names from our DB, so the UI can show
        // human labels instead of raw UUIDs. Both lookups are keyed by
        // id and applied per row below.
        const siteCodeById = new Map();
        try {
            const { access_token } = await getAmmpToken();
            if (access_token) {
                const assets = await AmmpServices().getAssets(access_token);
                for (const a of Array.isArray(assets) ? assets : []) {
                    if (a?.asset_id) {
                        siteCodeById.set(String(a.asset_id), {
                            code: a.asset_name || '',
                            longName: a.long_name || '',
                        });
                    }
                }
            }
        } catch { /* leave siteCodeById empty — UI falls back to the id */ }

        const customerNameById = new Map();
        const customerIds = Array.from(new Set(rows.map((r) => r.customer_id).filter(Boolean)));
        if (customerIds.length > 0) {
            try {
                const customers = await db.Customer.findAll({
                    where: { id: { [Op.in]: customerIds } },
                    attributes: ['id', 'company_name'],
                    raw: true,
                });
                for (const c of customers) customerNameById.set(c.id, c.company_name || '');
            } catch { /* leave map empty */ }
        }

        const items = rows
            .map((r) => {
                const raw = Number(r.raw_count) || 0;
                const inProgress = Number(r.in_progress_count) || 0;
                const verified = Number(r.verified_count) || 0;
                let status;
                if (inProgress > 0) {
                    // Any in-progress work outstanding → awaiting send,
                    // even when some days have already been sent. The
                    // admin still has something to publish for this
                    // (site, month) tuple.
                    status = 'pending';
                } else if (verified > 0) {
                    status = 'sent';
                } else {
                    // raw-only tuples represent untouched ingested data — no
                    // NOC involvement yet, nothing to track in the pipeline.
                    status = 'raw';
                }
                const site = siteCodeById.get(String(r.site_id)) || {};
                return {
                    siteId: r.site_id,
                    siteCode: site.code || '',
                    siteName: site.longName || '',
                    customerId: r.customer_id || '',
                    customerName: r.customer_id ? (customerNameById.get(r.customer_id) || '') : '',
                    year: Number(r.year),
                    month: Number(r.month),
                    raw,
                    inProgress,
                    verified,
                    status,
                    lastActivity: r.last_activity ? new Date(r.last_activity).toISOString() : null,
                };
            })
            // Only surface tuples the NOC has actually touched. Raw-only
            // rows are ingested provider data with no admin activity —
            // they don't belong in a pipeline of "reports the team is
            // handling".
            .filter((it) => it.inProgress > 0 || it.verified > 0);

        // Site-level rollups — distinct sites in each bucket for the
        // header chip on both surfaces.
        const distinctSitesIn = (predicate) => {
            const s = new Set();
            for (const it of items) if (predicate(it)) s.add(it.siteId);
            return s.size;
        };

        return {
            ok: true,
            totals: {
                pendingSites: distinctSitesIn((it) => it.inProgress > 0),
                sentSites: distinctSitesIn((it) => it.verified > 0 && it.inProgress === 0),
            },
            items,
        };
    } catch (err) {
        console.error('getReportManagement error:', err);
        return { ok: false, error: 'Failed to load reports management.' };
    }
}
