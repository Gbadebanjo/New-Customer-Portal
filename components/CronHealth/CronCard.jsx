'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { triggerCron } from '@/lib/controllers/cronRuns/triggerCron';
import classes from './cronHealth.module.css';

function fmtDuration(ms) {
    if (ms == null || isNaN(ms)) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = ms / 60_000;
    if (mins < 60) return `${mins.toFixed(1)}m`;
    return `${(mins / 60).toFixed(1)}h`;
}

function fmtWhen(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const diff = Date.now() - d.getTime();
    const abs = Math.abs(diff);
    if (abs < 60_000) return diff >= 0 ? 'just now' : 'in seconds';
    const mins = Math.floor(abs / 60_000);
    if (mins < 60) return diff >= 0 ? `${mins} min ago` : `in ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return diff >= 0 ? `${hours}h ago` : `in ${hours}h`;
    return d.toLocaleString();
}

function statusStyle(status) {
    switch (status) {
        case 'ok':      return { bg: 'rgba(76,175,80,0.15)',  border: 'rgba(76,175,80,0.45)',  color: '#4caf50' };
        case 'failed':  return { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.45)',  color: '#ef4444' };
        case 'running': return { bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.45)', color: '#60a5fa' };
        default:        return { bg: 'rgba(200,200,200,0.12)', border: 'rgba(200,200,200,0.35)', color: '#888' };
    }
}

function StatusPill({ status }) {
    const s = statusStyle(status);
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 999,
            background: s.bg,
            border: `1px solid ${s.border}`,
            color: s.color,
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
        }}>{status || 'never run'}</span>
    );
}

export default function CronCard({ cron }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const handleRun = () => {
        setMsg(''); setErr('');
        startTransition(async () => {
            const res = await triggerCron(cron.kind);
            if (res?.ok) {
                setMsg('Run finished. Refreshing…');
                router.refresh();
            } else {
                setErr(res?.error || 'Run failed');
            }
        });
    };

    const lr = cron.lastRun;
    const lastDurationMs = lr?.finished_at && lr?.started_at
        ? new Date(lr.finished_at).getTime() - new Date(lr.started_at).getTime()
        : null;

    return (
        <div className={classes.card}>
            <div className={classes.cardHeader}>
                <div style={{ minWidth: 0 }}>
                    <h3 className={classes.cardTitle}>{cron.label}</h3>
                    <p className={classes.cardDescription}>{cron.description}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <StatusPill status={lr?.status} />
                    <button
                        type="button"
                        onClick={handleRun}
                        disabled={isPending}
                        className={classes.runBtn}
                    >
                        {isPending ? 'Running…' : 'Run now'}
                    </button>
                </div>
            </div>

            <div className={classes.metricsRow}>
                <div>
                    <div className={classes.metricLabel}>Last run</div>
                    <div className={classes.metricValue}>{fmtWhen(lr?.started_at)}</div>
                </div>
                <div>
                    <div className={classes.metricLabel}>Last duration</div>
                    <div className={classes.metricValue}>{fmtDuration(lastDurationMs)}</div>
                </div>
                <div>
                    <div className={classes.metricLabel}>Avg duration (10)</div>
                    <div className={classes.metricValue}>{fmtDuration(cron.avgDurationMs)}</div>
                </div>
                <div>
                    <div className={classes.metricLabel}>Failed (30d)</div>
                    <div className={classes.metricValue} style={{ color: cron.failuresLast30d > 0 ? '#ef4444' : undefined }}>
                        {cron.failuresLast30d}
                    </div>
                </div>
                <div>
                    <div className={classes.metricLabel}>Expected</div>
                    <div className={classes.metricValue}>{cron.expectedRunTime}</div>
                </div>
            </div>

            {(msg || err) && (
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: err ? '#ef4444' : '#4caf50' }}>
                    {err || msg}
                </div>
            )}

            {lr?.error_text && (
                <details className={classes.details}>
                    <summary style={{ color: '#ef4444', cursor: 'pointer' }}>Last error</summary>
                    <pre className={classes.pre}>{lr.error_text}</pre>
                </details>
            )}

            {lr?.summary && (
                <details className={classes.details}>
                    <summary style={{ cursor: 'pointer' }}>Last summary</summary>
                    <pre className={classes.pre}>{JSON.stringify(lr.summary, null, 2)}</pre>
                </details>
            )}

            {cron.recentRuns && cron.recentRuns.length > 1 && (
                <details className={classes.details}>
                    <summary style={{ cursor: 'pointer' }}>Recent runs ({cron.recentRuns.length})</summary>
                    <table className={classes.recentTable}>
                        <thead>
                            <tr>
                                <th>Started</th>
                                <th>Status</th>
                                <th>Duration</th>
                                <th>Triggered by</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cron.recentRuns.map((r) => {
                                const dur = r.finished_at && r.started_at
                                    ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
                                    : null;
                                return (
                                    <tr key={r.id}>
                                        <td>{fmtWhen(r.started_at)}</td>
                                        <td><StatusPill status={r.status} /></td>
                                        <td>{fmtDuration(dur)}</td>
                                        <td>{r.triggered_by_user_id ? 'manual' : 'scheduled'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </details>
            )}
        </div>
    );
}
