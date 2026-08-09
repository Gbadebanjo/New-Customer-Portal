'use client';
import { useEffect, useState } from 'react';
import { getAvailableReportMonths } from '@/lib/controllers/reportData/getAvailableReportMonths';
import getReportData from '@/lib/controllers/reportData/getReportData';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';

const MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// Column keys → human labels. Only report_data fields relevant to a
// customer's monthly PDF are exposed; internal metadata (id, timestamps,
// status flags) is filtered out so the export is clean.
const CSV_COLUMNS = [
    ['day', 'Day'],
    ['pv_production', 'Solar production (kWh)'],
    ['planned_pv_production', 'Planned solar (kWh)'],
    ['total_daily_consumption', 'Total consumption (kWh)'],
    ['total_daytime_consumption', 'Daytime consumption (kWh)'],
    ['planned_daytime_consumption', 'Planned daytime (kWh)'],
    ['energy_production_diesel_generator', 'Generator energy (kWh)'],
    ['energy_production_turbine', 'Turbine energy (kWh)'],
    ['daily_daytime_solar_displacement', 'Daytime solar displacement'],
    ['total_solar_displacement', 'Total solar displacement'],
    ['data_capture_daytime', 'Daytime data capture'],
    ['data_capture_entire_day', 'Full-day data capture'],
    ['remarks', 'Remarks'],
];

function toCsv(rows) {
    const header = CSV_COLUMNS.map(([, label]) => `"${label}"`).join(',');
    const body = rows.map((r) =>
        CSV_COLUMNS.map(([key]) => {
            const v = r[key];
            if (v == null) return '';
            const s = String(v).replace(/"/g, '""');
            return `"${s}"`;
        }).join(',')
    );
    return [header, ...body].join('\n');
}

function downloadBlob(name, mime, content) {
    const blob = new Blob([content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Customer-facing downloads block on the site details page. Lists months
 * that have any report_data rows for this site, with a per-month CSV
 * export button. Verified-vs-raw counts are surfaced so customers know
 * whether a month is finalized (NOC has signed off) or still provisional.
 */
export default function DownloadsBlock({ assetId, siteName }) {
    const [months, setMonths] = useState(null);
    const [error, setError] = useState(null);
    const [busyKey, setBusyKey] = useState(null);

    useEffect(() => {
        if (!assetId) return;
        (async () => {
            try {
                const list = await getAvailableReportMonths(assetId);
                setMonths(list);
            } catch (err) {
                setError(err?.message || 'Could not load months.');
                setMonths([]);
            }
        })();
    }, [assetId]);

    async function handleDownload(year, month) {
        const key = `${year}-${month}`;
        setBusyKey(key);
        try {
            // Server-side query. Prefers verified rows implicitly — the
            // report_data table's row for a given day is a single row that
            // NOC either verified or left as raw; both come through here.
            const rows = await getReportData(assetId, month, year);
            if (!Array.isArray(rows) || rows.length === 0) {
                alert('No data available for the selected month.');
                return;
            }
            const csv = toCsv(rows);
            const safeSite = (siteName || assetId).replace(/[^a-z0-9]+/gi, '_');
            const monthLabel = MONTH_LABELS[month - 1];
            downloadBlob(`${safeSite}_${monthLabel}_${year}.csv`, 'text/csv', csv);
        } catch (err) {
            console.error('DownloadsBlock: export failed', err);
            alert('Sorry, that export failed. Please try again.');
        } finally {
            setBusyKey(null);
        }
    }

    if (months === null) {
        return (
            <div style={{ padding: '0 20px', marginTop: 20, color: 'rgba(255,255,255,0.6)' }}>
                Loading downloads…
            </div>
        );
    }

    return (
        <div style={{ padding: '0 20px', marginTop: 20 }}>
            <h2 style={{
                color: '#4b7a9c', fontSize: '1.5rem', fontWeight: 600, marginBottom: 12,
                fontFamily: 'Kanit, sans-serif',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                Downloads
                <InfoTooltip title="Downloads">
                    Monthly performance data for this site — the same figures our team publishes. Each CSV opens cleanly in Excel or Google Sheets.
                </InfoTooltip>
            </h2>
            {error && (
                <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: 12 }}>
                    {error}
                </div>
            )}
            {months.length === 0 ? (
                <div style={{
                    padding: '18px 20px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.9rem',
                }}>
                    No report data has been published for this site yet. Once our team finalizes a month, it will appear here.
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 12,
                }}>
                    {months.map(({ year, month, rowCount, verifiedCount }) => {
                        const key = `${year}-${month}`;
                        const busy = busyKey === key;
                        const isFinal = verifiedCount > 0 && verifiedCount >= rowCount;
                        return (
                            <div key={key} style={{
                                padding: '14px 16px',
                                borderRadius: 12,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>
                                        {MONTH_LABELS[month - 1]} {year}
                                    </span>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        letterSpacing: 0.4,
                                        textTransform: 'uppercase',
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        background: isFinal ? 'rgba(76,175,80,0.12)' : 'rgba(255,152,0,0.12)',
                                        color: isFinal ? '#4caf50' : '#ff9800',
                                        border: `1px solid ${isFinal ? 'rgba(76,175,80,0.35)' : 'rgba(255,152,0,0.35)'}`,
                                    }}>
                                        {isFinal ? 'Final' : 'Provisional'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                                    {rowCount} day{rowCount === 1 ? '' : 's'} of data
                                    {verifiedCount > 0 && verifiedCount < rowCount && (
                                        <> · {verifiedCount} verified</>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDownload(year, month)}
                                    disabled={busy}
                                    style={{
                                        marginTop: 6,
                                        alignSelf: 'flex-start',
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        border: '1px solid rgba(255,125,112,0.4)',
                                        background: busy ? 'rgba(255,125,112,0.08)' : 'rgba(255,125,112,0.14)',
                                        color: '#ff9770',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        cursor: busy ? 'wait' : 'pointer',
                                    }}
                                >
                                    {busy ? 'Preparing…' : 'Download CSV'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
