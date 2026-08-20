'use server';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';
import { canAccessSite } from '@/lib/services/authz/getAuthorizedSiteIds';
import { REPORT_COLUMNS, OPTIONAL_COLUMN_IDS } from '@/lib/reports/columnConfig';

// Column ids we consider valid input from the client. Server never
// trusts the incoming array — it filters against the known set + drops
// any duplicates.
const VALID_COLUMN_IDS = new Set(REPORT_COLUMNS.map((c) => c.id));
const OPTIONAL = new Set(OPTIONAL_COLUMN_IDS);

/**
 * Returns the visible-column pref this user has saved for `siteId`.
 * `{ ok: true, visibleColumns: string[] | null }` — `null` when there
 * is no pref row (the caller should fall back to the site-type
 * default from `defaultVisibleForSiteKind()`).
 */
export async function getReportColumnPref(siteId) {
    const { user } = await verifyAuth();
    if (!user?.id) return { ok: false, error: 'Not authenticated.' };
    if (!siteId) return { ok: false, error: 'Missing siteId.' };
    if (!(await canAccessSite(user.id, siteId))) {
        return { ok: false, error: 'Not authorised for this site.' };
    }

    try {
        const row = await db.ReportColumnPref.findOne({
            where: { user_id: user.id, site_id: String(siteId) },
            raw: true,
        });
        if (!row) return { ok: true, visibleColumns: null };
        return {
            ok: true,
            visibleColumns: Array.isArray(row.visible_columns) ? row.visible_columns : null,
        };
    } catch (err) {
        console.error('getReportColumnPref failed:', err?.message);
        return { ok: false, error: 'Failed to load column preferences.' };
    }
}

/**
 * Upsert the per-(user, site) visible-column list. The client sends
 * the full desired visible-column array; server sanitises against the
 * known column ids and only stores optional-column choices (structural
 * `always` columns are implied and don't need persisting).
 */
export async function saveReportColumnPref(siteId, columnIds) {
    const { user } = await verifyAuth();
    if (!user?.id) return { ok: false, error: 'Not authenticated.' };
    if (!siteId) return { ok: false, error: 'Missing siteId.' };
    if (!Array.isArray(columnIds)) return { ok: false, error: 'columnIds must be an array.' };
    if (!(await canAccessSite(user.id, siteId))) {
        return { ok: false, error: 'Not authorised for this site.' };
    }

    // Sanitise: drop unknown ids, keep only optional ones, dedupe.
    const seen = new Set();
    const clean = [];
    for (const id of columnIds) {
        const key = String(id);
        if (!VALID_COLUMN_IDS.has(key)) continue;
        if (!OPTIONAL.has(key)) continue; // always-visible cols don't need to be persisted
        if (seen.has(key)) continue;
        seen.add(key);
        clean.push(key);
    }

    try {
        const [row, created] = await db.ReportColumnPref.findOrCreate({
            where: { user_id: user.id, site_id: String(siteId) },
            defaults: { visible_columns: clean },
        });
        if (!created) {
            await row.update({ visible_columns: clean });
        }
        return { ok: true, visibleColumns: clean };
    } catch (err) {
        console.error('saveReportColumnPref failed:', err?.message);
        return { ok: false, error: 'Failed to save column preferences.' };
    }
}
