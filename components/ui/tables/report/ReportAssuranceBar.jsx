'use client';
import { useMemo, useState, useTransition } from 'react';
import { verifyReportDays, unverifyReportDays } from '@/lib/controllers/reportData/verifyReportDays';
import { refreshReportFromSource } from '@/lib/controllers/reportData/refreshFromSource';

/**
 * Sits directly above the editable Reports grid. Shows a coverage summary
 * (raw / verified counts for the loaded month), plus NOC actions:
 *   - Verify all rows with data
 *   - Unverify all
 *   - Refresh from source (pulls fresh raw snapshot, protects verified rows)
 *
 * Non-NOC callers (isCustomerOnly) get the coverage summary only, no buttons.
 */
export default function ReportAssuranceBar({
    rows,
    siteId,
    year,
    month,
    isCustomerOnly,
    onChanged,           // callback → parent should reload data
}) {
    const [pending, startTransition] = useTransition();
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const summary = useMemo(() => {
        let verified = 0, raw = 0, withData = 0;
        for (const r of rows) {
            const hasNums =
                (r.pv_production || 0) !== 0 ||
                (r.total_daily_consumption || 0) !== 0 ||
                (r.energy_production_diesel_generator || 0) !== 0;
            if (!hasNums) continue;
            withData++;
            if (r.status === 'verified') verified++;
            else raw++;
        }
        return { verified, raw, withData };
    }, [rows]);

    const daysWithDataUnverified = useMemo(() => {
        return rows
            .filter((r) =>
                r.status !== 'verified' && (
                    (r.pv_production || 0) !== 0 ||
                    (r.total_daily_consumption || 0) !== 0 ||
                    (r.energy_production_diesel_generator || 0) !== 0
                )
            )
            .map((r) => r.day);
    }, [rows]);

    const daysVerified = useMemo(
        () => rows.filter((r) => r.status === 'verified').map((r) => r.day),
        [rows]
    );

    const disabled = !siteId || pending;

    const run = async (fn, successText) => {
        setMsg(''); setErr('');
        startTransition(async () => {
            try {
                const res = await fn();
                if (res?.ok) {
                    setMsg(successText);
                    onChanged?.();
                } else {
                    setErr(res?.error || 'Action failed');
                }
            } catch (e) {
                setErr(e?.message || 'Action failed');
            }
        });
    };

    const pill = (label, count, color) => (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem',
            fontWeight: 600, textTransform: 'uppercase',
            background: `${color}20`, border: `1px solid ${color}55`, color,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
            {count} {label}
        </span>
    );

    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '12px 16px',
            margin: '12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
        }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {pill('Verified', summary.verified, '#4caf50')}
                {pill(isCustomerOnly ? 'Awaiting review' : 'Pending', summary.raw, '#ff9800')}
                {summary.withData === 0 && (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                        No data yet for this month.
                    </span>
                )}
                {isCustomerOnly && summary.withData > 0 && (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginLeft: 4 }}>
                        {summary.verified === summary.withData
                            ? 'All days signed off by our team.'
                            : `${summary.verified} of ${summary.withData} day${summary.withData === 1 ? '' : 's'} reviewed so far.`}
                    </span>
                )}
            </div>

            {!isCustomerOnly && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        disabled={disabled || daysWithDataUnverified.length === 0}
                        onClick={() => run(
                            () => verifyReportDays({ siteId, year, month, days: daysWithDataUnverified }),
                            `Verified ${daysWithDataUnverified.length} day${daysWithDataUnverified.length === 1 ? '' : 's'}.`
                        )}
                        style={btn('#4caf50')}
                    >
                        Verify all pending
                    </button>
                    <button
                        type="button"
                        disabled={disabled || daysVerified.length === 0}
                        onClick={() => run(
                            () => unverifyReportDays({ siteId, year, month, days: daysVerified }),
                            `Unverified ${daysVerified.length} day${daysVerified.length === 1 ? '' : 's'}.`
                        )}
                        style={btn('#ff9800')}
                    >
                        Unverify all
                    </button>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => run(
                            () => refreshReportFromSource({ siteId, year, month }),
                            'Fresh source data pulled — verified rows preserved.'
                        )}
                        style={btn('#60a5fa')}
                    >
                        Refresh from source
                    </button>
                </div>
            )}

            {(msg || err) && (
                <div style={{
                    width: '100%',
                    color: err ? '#ff7d70' : '#4caf50',
                    fontSize: '0.78rem',
                    marginTop: 4,
                }}>
                    {err || msg}
                </div>
            )}
        </div>
    );
}

function btn(accent) {
    return {
        padding: '6px 12px',
        borderRadius: 6,
        border: `1px solid ${accent}55`,
        background: `${accent}15`,
        color: accent,
        fontSize: '0.78rem',
        fontWeight: 600,
        cursor: 'pointer',
    };
}
