import { Suspense } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import CopyRight from '@/components/ui/CopyRight/copyright';
import FleetTable from '@/components/AdminFleet/FleetTable';
import DashboardSkeleton from '@/components/Dashboard/DashboardSkeleton';
import ReportIcon from '@/components/ui/icons/ReportIcon';
import AlertBellIcon from '@/components/ui/icons/AlertBellIcon';
import ChartIcon from '@/components/ui/icons/ChartIcon';
import { getAuthorizedAssets } from '@/lib/services/ammp/getAuthorizedAssets';
import { deriveSiteType } from '@/lib/services/siteType/deriveSiteType';
import { countryName } from '@/utils/countryNames';
import { getReportManagement } from '@/lib/controllers/reportData/getReportManagement';
import ReportsManagement from '@/components/Analytics/ReportsManagement';
import classes from '@/components/Dashboard/dashboardLanding.module.css';

// Fleet landing (Daystar-only). Renders a KPI band, quick-access tiles
// for the deeper workflows, and a filterable/virtualised site table.
// No per-site historic fetches — those would fan-out to hundreds of
// AMMP calls for a Daystar user with fleet-wide access.
function formatCapacity(totalKw) {
    if (!Number.isFinite(totalKw) || totalKw <= 0) return '—';
    if (totalKw >= 1000) return `${(totalKw / 1000).toFixed(1)} MW`;
    return `${Math.round(totalKw).toLocaleString()} kW`;
}

async function FleetBody({ userId }) {
    const [{ assets }, reportsMgmt] = await Promise.all([
        getAuthorizedAssets(userId),
        // Same source of truth as the Admin Analytics enrichment. Any
        // caller who reaches /fleet is a Daystar role, so the auth
        // gate inside `getReportManagement` will pass.
        getReportManagement({ limit: 150 }),
    ]);
    const list = Array.isArray(assets) ? assets : [];
    const reportsItems = reportsMgmt?.ok ? reportsMgmt.items : [];
    const reportsTotals = reportsMgmt?.ok ? reportsMgmt.totals : { pendingSites: 0, sentSites: 0, rawSites: 0 };

    const enriched = list.map((a) => {
        const type = deriveSiteType(a);
        const code = a.country_code || '';
        return {
            id: a.asset_id,
            name: a.long_name || a.asset_name || a.asset_id,
            country: code,                    // filter key (ISO code)
            countryName: countryName(code),   // display label
            region: a.region || '',
            place: a.place || '',
            capacityKw: typeof a.total_pv_power === 'number'
                ? Math.round(a.total_pv_power / 1000)
                : null,
            typeKind: type.kind,
            typeLabel: type.displayLabel,
            product: type.productLabel || '',
            customer: (a.tags?.customer) || '',
            engineer: (a.tags?.field_service_engineer) || '',
        };
    });

    const totalCapacityKw = enriched.reduce((n, s) => n + (s.capacityKw || 0), 0);
    const distinctCountries = new Set(enriched.map((s) => s.country).filter(Boolean)).size;
    const distinctCustomers = new Set(enriched.map((s) => s.customer).filter(Boolean)).size;

    const tiles = [
        { href: '/alerts', title: 'Alerts', description: 'Open issues and site-down notifications.', Icon: AlertBellIcon },
        { href: '/reports', title: 'Reports', description: 'Monthly performance reports and history.', Icon: ReportIcon },
        { href: '/planned-vs-actual', title: 'Planned vs Actual', description: 'Compare planned production against real output.', Icon: ChartIcon },
        { href: '/dashboard/compare', title: 'Compare sites', description: 'Side-by-side comparison across selected sites.', Icon: ChartIcon },
    ];

    return (
        <>
            <PageHeader crumbs={['Fleet']} showBackButton={false} />
            <div className={classes.wrapper}>
                <h1 className={classes.title}>Fleet</h1>
                <p className={classes.subtitle}>
                    Every site your account can see. Jump into a workflow below or drill into a specific site from the table.
                </p>

                <div className={classes.kpiRow}>
                    <div className={classes.kpiCard}>
                        <span className={classes.kpiLabel}>Sites</span>
                        <span className={classes.kpiValue}>{enriched.length.toLocaleString()}</span>
                        <span className={classes.kpiHint}>across the fleet</span>
                    </div>
                    <div className={classes.kpiCard}>
                        <span className={classes.kpiLabel}>PV capacity</span>
                        <span className={classes.kpiValue}>{formatCapacity(totalCapacityKw)}</span>
                        <span className={classes.kpiHint}>installed nameplate</span>
                    </div>
                    <div className={classes.kpiCard}>
                        <span className={classes.kpiLabel}>Countries</span>
                        <span className={classes.kpiValue}>{distinctCountries || '—'}</span>
                        <span className={classes.kpiHint}>with active sites</span>
                    </div>
                    <div className={classes.kpiCard}>
                        <span className={classes.kpiLabel}>Customers</span>
                        <span className={classes.kpiValue}>{distinctCustomers || '—'}</span>
                        <span className={classes.kpiHint}>served</span>
                    </div>
                </div>

                <div className={classes.sectionHeading}>Quick access</div>
                <div className={classes.tileGrid}>
                    {tiles.map(({ href, title, description, Icon }) => (
                        <Link href={href} key={href} className={classes.tile}>
                            <div className={classes.tileTop}>
                                <span className={classes.tileIcon}><Icon /></span>
                                <span className={classes.tileTitle}>{title}</span>
                            </div>
                            <span className={classes.tileDescription}>{description}</span>
                        </Link>
                    ))}
                </div>

                <div className={classes.sectionHeading}>Reports</div>
                <div className={classes.tableCard}>
                    <div className={classes.tableHeadingRow}>
                        <span className={classes.tableHeading}>Reports pipeline</span>
                        <span className={classes.tableHint}>
                            {reportsTotals.pendingSites} site{reportsTotals.pendingSites === 1 ? '' : 's'} awaiting send &middot;
                            {' '}{reportsTotals.sentSites} sent
                        </span>
                    </div>
                    <ReportsManagement items={reportsItems} totals={reportsTotals} />
                </div>

                <div className={classes.tableCard} style={{ marginTop: 32 }}>
                    <div className={classes.tableHeadingRow}>
                        <span className={classes.tableHeading}>All sites</span>
                        <span className={classes.tableHint}>Click a row to open its detail view.</span>
                    </div>
                    {enriched.length === 0 ? (
                        <div className={classes.emptyState}>
                            No sites returned for your account. Verify the data-provider key.
                        </div>
                    ) : (
                        <FleetTable sites={enriched} />
                    )}
                </div>
            </div>
            <CopyRight />
        </>
    );
}

export default function FleetScreen({ userId }) {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <FleetBody userId={userId} />
        </Suspense>
    );
}
