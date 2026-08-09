import classes from './analytics.module.css';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import CopyRight from '@/components/ui/CopyRight/copyright';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import { getAdminAnalytics } from '@/lib/controllers/analytics/getAdminAnalytics';
import { getRecentActivity } from '@/lib/controllers/analytics/getRecentActivity';

function fmtNumber(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('en-US').format(n);
}

function fmtHours(h) {
    if (h == null) return '—';
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h < 24) return `${Math.round(h * 10) / 10} hr`;
    return `${Math.round((h / 24) * 10) / 10} d`;
}

function StatCard({ label, value, hint, tooltip }) {
    return (
        <div className={classes.statCard}>
            <div className={classes.statLabel}>
                {label}
                {tooltip && <InfoTooltip title={label} placement="bottom">{tooltip}</InfoTooltip>}
            </div>
            <div className={classes.statValue}>{value}</div>
            {hint && <div className={classes.statHint}>{hint}</div>}
        </div>
    );
}

// Minimal inline SVG sparkline — no dependency, no client component needed.
function Sparkline({ data }) {
    if (!data || data.length === 0) {
        return <div className={classes.sparklineEmpty}>No data yet</div>;
    }
    const w = 200;
    const h = 40;
    const max = Math.max(1, ...data.map((d) => d.count));
    const step = data.length > 1 ? w / (data.length - 1) : 0;
    const points = data
        .map((d, i) => `${i * step},${h - (d.count / max) * h}`)
        .join(' ');
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={classes.sparkline}>
            <polyline
                points={points}
                fill="none"
                stroke="var(--ds-accent, #ff7d70)"
                strokeWidth="1.6"
            />
        </svg>
    );
}

function relTime(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const diff = Date.now() - t;
    if (diff < 60_000) return 'just now';
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

function eventDot(outcome) {
    const c = outcome === 'failed' ? '#ef4444'
        : outcome === 'running' ? '#60a5fa'
        : outcome === 'info' ? '#f4a742'
        : '#4caf50';
    return <span style={{
        display: 'inline-block',
        width: 8, height: 8,
        borderRadius: '50%',
        background: c,
        flexShrink: 0,
        marginTop: 6,
    }} />;
}

function eventKindPill(kind) {
    const map = {
        audit:        { label: 'Audit',     bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
        cron:         { label: 'Cron',      bg: 'rgba(255,152,0,0.12)',  color: '#ff9800' },
        notification: { label: 'Alert',     bg: 'rgba(255,125,112,0.12)',color: '#ff7d70' },
    };
    const c = map[kind] || { label: kind, bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)' };
    return (
        <span style={{
            padding: '1px 8px',
            borderRadius: 999,
            background: c.bg,
            color: c.color,
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
        }}>{c.label}</span>
    );
}

export default async function AnalyticsScreen() {
    const [data, activity] = await Promise.all([
        getAdminAnalytics(),
        getRecentActivity({ limit: 25 }),
    ]);
    const generatedAt = new Date(data.generatedAt);

    return (
        <div className={classes.content}>
            <PageHeader crumbs={['Admin', 'Analytics']} />
            <div className={classes.topCenter}>
                <p className={classes.title}>Portal Analytics</p>
                <span className={classes.generatedAt}>
                    Generated {generatedAt.toLocaleString()}
                </span>
            </div>
            <div className={classes.centerContent}>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Engagement</h2>
                    <div className={classes.statGrid}>
                        <StatCard
                            label="Total users"
                            value={fmtNumber(data.engagement.totalUsers)}
                            hint="All registered accounts"
                        />
                        <StatCard
                            label="Active last 24h"
                            value={fmtNumber(data.engagement.activeUsers24h)}
                            tooltip="Distinct users who logged in in the last 24 hours (from security logs)."
                        />
                        <StatCard
                            label="Active last 7d"
                            value={fmtNumber(data.engagement.activeUsers7d)}
                            tooltip="Distinct users who logged in in the last 7 days."
                        />
                        <StatCard
                            label="Active last 30d"
                            value={fmtNumber(data.engagement.activeUsers30d)}
                            tooltip="Distinct users who logged in in the last 30 days."
                        />
                    </div>
                    <div className={classes.trendCard}>
                        <div className={classes.statLabel}>Logins — last 7 days</div>
                        <Sparkline data={data.engagement.loginTrend} />
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>NOC throughput</h2>
                    <div className={classes.statGrid}>
                        <StatCard
                            label="Tickets created (30d)"
                            value={fmtNumber(data.support.ticketsCreated30d)}
                        />
                        <StatCard
                            label="Tickets resolved (30d)"
                            value={fmtNumber(data.support.ticketsResolved30d)}
                        />
                        <StatCard
                            label="Open now"
                            value={fmtNumber(data.support.ticketsOpenNow)}
                            hint="Everything not yet Resolved"
                        />
                        <StatCard
                            label="Median first response"
                            value={fmtHours(data.support.medianResponseHours)}
                            tooltip="Time from ticket creation to first NOC reply, across tickets created in the last 30 days."
                        />
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Fleet</h2>
                    <div className={classes.statGrid}>
                        <StatCard
                            label="Total customers"
                            value={fmtNumber(data.fleet.totalCustomers)}
                        />
                    </div>
                    <div className={classes.trendCard}>
                        <div className={classes.statLabel}>Top customers by user count</div>
                        {data.fleet.topCustomers.length === 0 ? (
                            <div className={classes.emptyRow}>No customer assignments yet.</div>
                        ) : (
                            <ul className={classes.topList}>
                                {data.fleet.topCustomers.map((c) => (
                                    <li key={c.customer} className={classes.topListRow}>
                                        <span>{c.customer}</span>
                                        <span className={classes.topListCount}>{c.count} user{c.count === 1 ? '' : 's'}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Recent activity</h2>
                    <div className={classes.trendCard}>
                        {activity.events.length === 0 ? (
                            <div className={classes.emptyRow}>No activity yet.</div>
                        ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {activity.events.map((e) => (
                                    <li key={e.id} style={{
                                        display: 'flex',
                                        gap: 10,
                                        padding: '10px 12px',
                                        borderRadius: 6,
                                        background: 'rgba(255,255,255,0.02)',
                                    }}>
                                        {eventDot(e.outcome)}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                                                {eventKindPill(e.kind)}
                                                <strong style={{ fontSize: '0.86rem', color: '#e2e8f0' }}>{e.title}</strong>
                                                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#94a3b8' }}>{relTime(e.at)}</span>
                                            </div>
                                            {e.subtitle && (
                                                <div style={{
                                                    marginTop: 2,
                                                    fontSize: '0.78rem',
                                                    color: '#94a3b8',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>{e.subtitle}</div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

            </div>
            <CopyRight />
        </div>
    );
}
