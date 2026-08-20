'use server'
import ReportData from '@/database/models/ReportData';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';
import { invalidatePrefix } from '@/lib/services/cache/memoryCache';
import { revalidatePath } from "next/cache";
import { EDITABLE_COLUMN_IDS, TEXT_COLUMN_IDS } from '@/lib/reports/columnConfig';

// Saved rows are held in the `in_progress` bucket — the customer sees
// nothing until an admin/DPA hits "Send Report" on the report screen,
// which flips the batch to `verified` (via sendReportToCustomer.js)
// and fires the customer notification/email.
const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// The set of columns that participate in the diff check + the payload
// build both come from the central column config so schema and save
// contract can't drift.
const EDITABLE_FIELDS = EDITABLE_COLUMN_IDS;

function normalise(v, field) {
    // Text columns are trimmed & default to '', number columns to 0.
    // Keeps `'0' === 0` style mismatches from being flagged as a diff.
    if (TEXT_COLUMN_IDS.has(field)) return (v ?? '').toString().trim();
    return Number(v ?? 0);
}

function hasActualData(row) {
    for (const f of EDITABLE_FIELDS) {
        const n = normalise(row[f], f);
        if (typeof n === 'number' ? n !== 0 : n !== '') return true;
    }
    return false;
}

function rowMatchesExisting(row, existing, plannedMonthlyKwh) {
    if (!existing) return false;
    for (const f of EDITABLE_FIELDS) {
        if (normalise(row[f], f) !== normalise(existing[f], f)) return false;
    }
    // Planned monthly kWh is a per-report knob (not per-day) but it's
    // written back on every row alongside the day data, so a change to
    // just that value should still bump every existing row.
    if (Number(plannedMonthlyKwh ?? 0) !== Number(existing.planned_monthly_kwh ?? 0)) return false;
    return true;
}

// Build the persisted row from the incoming client row, using the
// central column config as the field allowlist so no unknown key ever
// reaches the DB and no maintained column is ever forgotten.
function buildPersistedRow(row, { siteId, customerId, month, year, plannedMonthlyKwh }) {
    const data = {
        customer_id: customerId,
        site_id: siteId,
        report_month: month,
        report_year: year,
        day: row.day,
        planned_monthly_kwh: plannedMonthlyKwh || 0,
        status: 'in_progress',
        verified_at: null,
        verified_by_user_id: null,
    };
    for (const f of EDITABLE_FIELDS) {
        data[f] = TEXT_COLUMN_IDS.has(f)
            ? (row[f] || '')
            : (row[f] || 0);
    }
    return data;
}

export default async function saveReportData(siteId, month, year, rows, plannedMonthlyKwh, customerId = '') {
    try {
        // Only Daystar users can write.
        const { user } = await verifyAuth();
        if (!user?.id) return { success: false, error: 'Not authenticated' };
        const full = await db.User.findByPk(user.id, { raw: true });
        const roles = Array.isArray(full?.roles) ? full.roles : [];
        const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
        if (!isDaystar) return { success: false, error: 'Not authorised' };

        // Only consider rows that carry real data. Then, on top of that,
        // only WRITE rows that actually differ from the DB — otherwise
        // untouched verified days from earlier saves would get flipped
        // back to `in_progress` any time the operator adds a new day.
        const rowsWithData = rows.filter(hasActualData);
        let writes = 0;
        for (const row of rowsWithData) {
            const where = {
                site_id: siteId,
                report_month: month,
                report_year: year,
                day: row.day,
            };

            const existing = await ReportData.findOne({ where });

            // No-op guard: identical row → skip. Preserves the existing
            // `status` (verified rows stay sent, in_progress rows stay
            // pending) and the `verified_at` / `verified_by_user_id`
            // signoff on already-sent days that weren't touched this
            // save cycle.
            if (rowMatchesExisting(row, existing, plannedMonthlyKwh)) {
                continue;
            }

            // Any actual change bumps the row back to `in_progress` —
            // a re-send is required to publish the new value to the
            // customer. verified_at / verified_by_user_id are cleared
            // in the helper so the next Send stamps a fresh signoff.
            const data = buildPersistedRow(row, {
                siteId, customerId, month, year, plannedMonthlyKwh,
            });

            if (existing) {
                await existing.update(data);
            } else {
                await ReportData.create(data);
            }
            writes++;
        }

        // Bust the resolver's per-window cache so downstream displays
        // reflect the change on next paint. Only if we actually wrote
        // anything — a no-op save doesn't need to nuke caches.
        if (writes > 0) {
            invalidatePrefix('resolver:');
            revalidatePath('/reports');
        }

        // Deliberately NO customer notification here — the Send Report
        // action is what publishes rows to the customer.
        return { success: true, saved: writes };
    } catch (error) {
        console.error('Error saving report data:', error);
        return { success: false, error: error.message };
    }
}
