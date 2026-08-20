// Central definition of every column the daily-report editor knows
// about. Both server and client import this so the table headers, the
// editable-fields whitelist, and the visibility toggle can never drift
// apart.
//
// `defaultVisibleFor`:
//   'always' → shown for every site, no toggle in the Columns menu
//   'hybrid' → shown by default when deriveSiteType() is hybrid or
//              battery-only. Solar-only sites hide it by default.
//              Always toggleable in the Columns menu.
//   'off'    → hidden by default for every site, but toggleable in the
//              Columns menu (used for niche columns like turbine).
//
// `dataType`:
//   'number' → stored as DOUBLE; UI renders numeric input; save-diff
//              normalises with `Number(v ?? 0)`.
//   'text'   → stored as STRING/TEXT; UI renders text input; save-diff
//              normalises with `(v ?? '').toString().trim()`.
//   'day'    → the row's day number (row header, non-editable).

export const REPORT_COLUMNS = [
    // ── Row header ────────────────────────────────────────────────────
    { id: 'day',                               label: 'Date',                                          unit: '',      dataType: 'day',    defaultVisibleFor: 'always' },

    // ── Consumption ───────────────────────────────────────────────────
    { id: 'total_daily_consumption',           label: 'Total Daily Consumption',                       unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'always' },
    { id: 'total_daytime_consumption',         label: 'Total Daytime Consumption (7AM to 5PM)',        unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'always' },
    { id: 'planned_daytime_consumption',       label: 'Planned Daytime Consumption (7AM to 5PM)',      unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'always' },

    // ── Detailed / Hybrid instrumentation ─────────────────────────────
    { id: 'actual_yield_lv',                   label: 'Actual Yield LV',                               unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'hybrid' },
    { id: 'daily_totalizer_pv_reading',        label: 'Daily Totalizer PV Reading',                    unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'hybrid' },
    { id: 'power_from_generator_to_charge_bess', label: 'Power from Generator to Charge BESS',         unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'hybrid' },
    { id: 'auxiliary_consumption',             label: 'Auxiliary Consumption',                         unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'hybrid' },
    { id: 'auxiliary_consumption_operator_room', label: 'Auxiliary Consumption (Operator room)',       unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'hybrid' },

    // ── Production ────────────────────────────────────────────────────
    { id: 'pv_production',                     label: 'PV Production',                                 unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'always' },
    { id: 'planned_pv_production',             label: 'Planned PV Production',                         unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'always' },
    { id: 'energy_from_grid',                  label: 'Energy Usage – Grid',                           unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'always' },
    { id: 'energy_production_diesel_generator',label: 'Energy Production – Generator',                 unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'always' },
    { id: 'energy_production_turbine',         label: 'Energy Production – Turbine',                   unit: 'kWh',   dataType: 'number', defaultVisibleFor: 'off' },

    // ── Displacement, capture, remarks ────────────────────────────────
    { id: 'daily_daytime_solar_displacement',  label: 'Daily Day-time Solar Displacement (7AM to 5PM)',unit: '',      dataType: 'text',   defaultVisibleFor: 'always' },
    { id: 'total_solar_displacement',          label: 'Total Solar Displacement (24 hour period)',     unit: '',      dataType: 'text',   defaultVisibleFor: 'always' },
    { id: 'data_capture_daytime',              label: 'Data Capture period (Daytime)',                 unit: '',      dataType: 'text',   defaultVisibleFor: 'always' },
    { id: 'data_capture_entire_day',           label: 'Data Capture period (Entire Day)',              unit: '',      dataType: 'text',   defaultVisibleFor: 'always' },
    { id: 'remarks',                           label: 'Remarks',                                       unit: '',      dataType: 'text',   defaultVisibleFor: 'always' },
];

// Every editable column id — used by saveReportData's EDITABLE_FIELDS
// diff loop so schema and save contract can't drift apart.
export const EDITABLE_COLUMN_IDS = REPORT_COLUMNS
    .filter((c) => c.dataType === 'number' || c.dataType === 'text')
    .map((c) => c.id);

// Text-column set the save-side normalisation uses to decide whether
// to `.trim()` a value.
export const TEXT_COLUMN_IDS = new Set(
    REPORT_COLUMNS.filter((c) => c.dataType === 'text').map((c) => c.id)
);

// Columns that appear as options in the Columns ▾ toggle menu. `always`
// columns are structural; the operator can't hide them.
export const OPTIONAL_COLUMN_IDS = REPORT_COLUMNS
    .filter((c) => c.defaultVisibleFor !== 'always')
    .map((c) => c.id);

/**
 * Produce the default visible-column set for a site based on its
 * derived type. Used both server-side (auto-derive when no user
 * override exists) and client-side (initial state before the
 * per-site pref loads).
 *
 *   siteKind: 'solar' | 'hybrid' | 'battery-only' | 'unknown'
 *
 * Returns an array of column ids.
 */
export function defaultVisibleForSiteKind(siteKind) {
    const isHybrid = siteKind === 'hybrid' || siteKind === 'battery-only';
    return REPORT_COLUMNS
        .filter((c) =>
            c.defaultVisibleFor === 'always' ||
            (isHybrid && c.defaultVisibleFor === 'hybrid')
        )
        .map((c) => c.id);
}
