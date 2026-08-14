import classes from './analytics.module.css';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import CopyRight from '@/components/ui/CopyRight/copyright';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import { getAdminAnalytics } from '@/lib/controllers/analytics/getAdminAnalytics';
import { getRecentActivity } from '@/lib/controllers/analytics/getRecentActivity';
import ActivityFeed from './ActivityFeed';

function fmtNumber(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('en-US').format(n);
}

function fmtPercent(x) {
    if (x == null) return '—';
    return `${Math.round(x * 100)}%`;
}

function fmtTimeAgo(iso) {
    if (!iso) return 'Never';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return 'Never';
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

function StatCard({ label, value, hint, tooltip, tone }) {
    const toneClass = tone === 'danger' ? classes.statCardDanger
        : tone === 'warn' ? classes.statCardWarn
        : '';
    return (
        <div className={`${classes.statCard} ${toneClass}`}>
            <div className={classes.statLabel}>
                {label}
                {tooltip && <InfoTooltip title={label} placement="bottom">{tooltip}</InfoTooltip>}
            </div>
            <div className={classes.statValue}>{value}</div>
            {hint && <div className={classes.statHint}>{hint}</div>}
        </div>
    );
}

// Inline dependency-free sparkline. Chart libs would pull ~40kb + a
// client bundle for what's a 40px trend line.
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

const KNOWN_CRON_LABELS = {
    sync_asset_groups: 'Asset group sync',
    ingest_daily: 'Daily ingestion',
    notify_reports: 'Report-ready notifications',
};

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
                            hint={`${data.engagement.adminCount} admin · ${data.engagement.dcaCount} DCA · ${data.engagement.customerUserCount} customer`}
                        />
                        <StatCard
                            label="Active last 24h"
                            value={fmtNumber(data.engagement.activeUsers24h)}
                            tooltip="Distinct users who successfully logged in in the last 24 hours."
                        />
                        <StatCard
                            label="Active last 7d"
                            value={fmtNumber(data.engagement.activeUsers7d)}
                        />
                        <StatCard
                            label="Active last 30d"
                            value={fmtNumber(data.engagement.activeUsers30d)}
                        />
                    </div>
                    <div className={classes.trendCard}>
                        <div className={classes.statLabel}>Successful logins — last 7 days</div>
                        <Sparkline data={data.engagement.loginTrend} />
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Live sessions</h2>
                    <div className={classes.statGrid}>
                        <StatCard
                            label="Active sessions"
                            value={fmtNumber(data.sessions.active)}
                            hint="Non-expired session rows"
                        />
                        <StatCard
                            label="Admin online"
                            value={fmtNumber(data.sessions.admin)}
                            tooltip="Distinct Daystar-role users with a live session."
                        />
                        <StatCard
                            label="Customers online"
                            value={fmtNumber(data.sessions.customer)}
                        />
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Security posture</h2>
                    <div className={classes.statGrid}>
                        <StatCard
                            label="Failed logins (24h)"
                            value={fmtNumber(data.security.failedLogins24h)}
                            tone={data.security.failedLogins24h > 0 ? 'warn' : undefined}
                            tooltip="LoginFailed + TwoFactorFailed + AccountLocked events in the last 24 hours."
                        />
                        <StatCard
                            label="Locked accounts"
                            value={fmtNumber(data.security.lockedAccounts)}
                            tone={data.security.lockedAccounts > 0 ? 'danger' : undefined}
                        />
                        <StatCard
                            label="Users without 2FA"
                            value={fmtNumber(data.security.usersWithout2fa)}
                            tone={data.security.usersWithout2fa > 0 ? 'warn' : undefined}
                            tooltip="Accounts that haven't set up their authenticator app yet."
                        />
                        <StatCard
                            label="Unverified accounts"
                            value={fmtNumber(data.security.unverifiedUsers)}
                            tooltip="Invited users who haven't completed their first login."
                        />
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Pipeline health</h2>
                    <div className={classes.statGrid}>
                        <StatCard
                            label="Cron success (7d)"
                            value={fmtPercent(data.pipeline.successRate7d)}
                            hint={`${data.pipeline.runsLast7d} run${data.pipeline.runsLast7d === 1 ? '' : 's'}`}
                            tone={data.pipeline.successRate7d != null && data.pipeline.successRate7d < 0.8 ? 'warn' : undefined}
                        />
                        <StatCard
                            label="Last failure"
                            value={data.pipeline.lastFailure ? fmtTimeAgo(data.pipeline.lastFailure.at) : 'None'}
                            hint={data.pipeline.lastFailure?.kind || undefined}
                            tone={data.pipeline.lastFailure ? 'danger' : undefined}
                        />
                    </div>
                    <div className={classes.trendCard}>
                        <div className={classes.statLabel}>Last successful run per job</div>
                        <ul className={classes.topList}>
                            {Object.keys(KNOWN_CRON_LABELS).map((kind) => (
                                <li key={kind} className={classes.topListRow}>
                                    <span>{KNOWN_CRON_LABELS[kind]}</span>
                                    <span className={classes.topListCount}>
                                        {fmtTimeAgo(data.pipeline.lastSuccesses[kind])}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Fleet health</h2>
                    <div className={classes.statGrid}>
                        <StatCard
                            label="Total customers"
                            value={fmtNumber(data.fleet.totalCustomers)}
                        />
                        <StatCard
                            label="Sites reporting today"
                            value={fmtNumber(data.fleet.sitesReportingToday)}
                            tooltip="Distinct sites with a report_data row ingested since UTC midnight."
                        />
                        <StatCard
                            label="Reports pending approval"
                            value={fmtNumber(data.fleet.reportsPendingApproval)}
                            tone={data.fleet.reportsPendingApproval > 0 ? 'warn' : undefined}
                            tooltip="Raw report_data rows awaiting NOC verification."
                        />
                        <StatCard
                            label="Outstanding invitations"
                            value={fmtNumber(data.fleet.outstandingInvitations)}
                            tooltip="Users invited but who haven't set a password yet."
                        />
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Growth (7d)</h2>
                    <div className={classes.statGrid}>
                        <StatCard
                            label="New users"
                            value={fmtNumber(data.growth.newUsers7d)}
                        />
                        <StatCard
                            label="New customers"
                            value={fmtNumber(data.growth.newCustomers7d)}
                        />
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Support</h2>
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
                            tone={data.support.ticketsOpenNow > 0 ? 'warn' : undefined}
                        />
                    </div>
                </section>

                <section className={classes.section}>
                    <h2 className={classes.sectionTitle}>Recent activity</h2>
                    <ActivityFeed initial={activity} />
                </section>

            </div>
            <CopyRight />
        </div>
    );
}
