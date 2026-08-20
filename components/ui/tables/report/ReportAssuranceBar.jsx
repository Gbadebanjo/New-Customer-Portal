'use client';
import { useMemo, useState, useTransition } from 'react';
import { sendReportToCustomer } from '@/lib/controllers/reportData/sendReportToCustomer';
import ConfirmModal from '@/components/ui/modals/customAlertModal/ConfirmModal';

/**
 * Sits directly above the editable Reports grid. Shows a coverage
 * summary (raw / in-progress / sent counts) and the primary NOC
 * publish action:
 *
 *   Send Report → publishes in-progress days to the customer
 *
 * The Send action is reserved for Admin + Portal Admin (enforced in
 * `sendReportToCustomer.js`); the UI still shows the button to DCA,
 * but the server refuses with a friendly error.
 *
 * Non-NOC callers (isCustomerOnly) get the coverage summary only —
 * only 'Sent' is visible, framed as review progress.
 */
export default function ReportAssuranceBar({
    rows,
    siteId,
    year,
    month,
    customerId,
    isCustomerOnly,
    onChanged,           // callback → parent should reload data
}) {
    const [pending, startTransition] = useTransition();
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [confirmSend, setConfirmSend] = useState(false);

    const summary = useMemo(() => {
        let verified = 0, inProgress = 0, raw = 0, withData = 0;
        for (const r of rows) {
            const hasNums =
                (r.pv_production || 0) !== 0 ||
                (r.total_daily_consumption || 0) !== 0 ||
                (r.energy_production_diesel_generator || 0) !== 0;
            if (!hasNums) continue;
            withData++;
            if (r.status === 'verified') verified++;
            else if (r.status === 'in_progress') inProgress++;
            else raw++;
        }
        return { verified, inProgress, raw, withData };
    }, [rows]);

    const disabled = !siteId || pending;

    const run = async (fn, successText) => {
        setMsg(''); setErr('');
        startTransition(async () => {
            try {
                const res = await fn();
                if (res?.ok) {
                    setMsg(successText || 'Done.');
                    onChanged?.();
                } else {
                    setErr(res?.error || 'Action failed');
                }
            } catch (e) {
                setErr(e?.message || 'Action failed');
            }
        });
    };

    const handleSend = () => {
        setConfirmSend(false);
        run(
            () => sendReportToCustomer({ siteId, month, year, customerId }),
            `Report sent — ${summary.inProgress} day${summary.inProgress === 1 ? '' : 's'} now visible to the customer.`
        );
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
                {pill('Sent', summary.verified, '#4caf50')}
                {!isCustomerOnly && pill('In progress', summary.inProgress, '#60a5fa')}
                {!isCustomerOnly && pill('Raw', summary.raw, '#ff9800')}
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
                        disabled={disabled || summary.inProgress === 0}
                        onClick={() => setConfirmSend(true)}
                        style={btnFilled('#4caf50')}
                        title={summary.inProgress === 0
                            ? 'Nothing in progress to send'
                            : `Publish ${summary.inProgress} in-progress day${summary.inProgress === 1 ? '' : 's'} to the customer`}
                    >
                        Send Report ({summary.inProgress})
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

            <ConfirmModal
                open={confirmSend}
                message={`Send this report to the customer? ${summary.inProgress} in-progress day${summary.inProgress === 1 ? '' : 's'} will become visible to them and a "new report" email will be sent.`}
                confirmLabel="Send Report"
                tone="default"
                onConfirm={handleSend}
                onCancel={() => setConfirmSend(false)}
            />
        </div>
    );
}

function btnFilled(accent) {
    return {
        padding: '6px 12px',
        borderRadius: 6,
        border: `1px solid ${accent}`,
        background: accent,
        color: '#0d202f',
        fontSize: '0.78rem',
        fontWeight: 700,
        cursor: 'pointer',
    };
}
