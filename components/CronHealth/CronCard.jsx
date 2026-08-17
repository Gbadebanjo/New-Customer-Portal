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

function StatusPill({ status }) {
    const cls = status === 'ok' ? classes.pillOk
        : status === 'failed' ? classes.pillFailed
        : status === 'running' ? classes.pillRunning
        : classes.pillNever;
    return <span className={`${classes.statusPill} ${cls}`}>{status || 'never run'}</span>;
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
                <div className={classes.cardHeaderMain}>
                    <h3 className={classes.cardTitle}>{cron.label}</h3>
                    <p className={classes.cardDescription}>{cron.description}</p>
                </div>
                <div className={classes.cardHeaderAside}>
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
                    <div className={cron.failuresLast30d > 0 ? classes.metricValueAlert : classes.metricValue}>
                        {cron.failuresLast30d}
                    </div>
                </div>
                <div>
                    <div className={classes.metricLabel}>Expected</div>
                    <div className={classes.metricValue}>{cron.expectedRunTime}</div>
                </div>
            </div>

            {(msg || err) && (
                <div className={err ? classes.flashError : classes.flashSuccess}>
                    {err || msg}
                </div>
            )}

            {lr?.error_text && (
                <details className={classes.details}>
                    <summary className={classes.summaryDanger}>Last error</summary>
                    <pre className={classes.pre}>{lr.error_text}</pre>
                </details>
            )}

            {lr?.summary && (
                <details className={classes.details}>
                    <summary className={classes.summary}>Last summary</summary>
                    <pre className={classes.pre}>{JSON.stringify(lr.summary, null, 2)}</pre>
                </details>
            )}

            {cron.recentRuns && cron.recentRuns.length > 1 && (
                <details className={classes.details}>
                    <summary className={classes.summary}>
                        Recent runs ({cron.recentRuns.length})
                    </summary>
                    <div className={classes.recentTableWrap}>
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
                    </div>
                </details>
            )}
        </div>
    );
}
