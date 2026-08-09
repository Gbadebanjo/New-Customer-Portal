// Metadata about every cron the app exposes. Kept in a plain module (not a
// 'use server' file) so both server actions and pages can import the list
// without server-action export restrictions.
//
// Extend this list when new crons ship — the health dashboard walks it to
// decide what cards to render, even for crons that have never run yet.
export const KNOWN_CRONS = [
    {
        kind: 'sync_asset_groups',
        label: 'Sync asset groups → customer mapping',
        description: 'Refreshes the customer→sites authorization map from the data provider\'s asset groups. Must run before the daily ingestion.',
        expectedCadenceHours: 24,
        expectedRunTime: '≈ 03:30',
    },
    {
        kind: 'ingest_daily',
        label: 'Ingest daily report data',
        description: 'Pulls yesterday\'s per-site totals from the data provider into report_data as raw rows.',
        expectedCadenceHours: 24,
        expectedRunTime: '≈ 04:00',
    },
    {
        kind: 'notify_reports',
        label: 'Send report-ready notifications',
        description: 'Fires the in-app notification for users whose report-ready cadence is due.',
        expectedCadenceHours: 24,
        expectedRunTime: '≈ 05:00',
    },
];
