import { Suspense } from 'react';
import Link from "next/link";
import { notFound } from 'next/navigation';
import classes from './assetDetails.module.css';
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import ChevronLeft from '@/components/ui/icons/ChevronLeft';
import CopyRight from '@/components/ui/CopyRight/copyright';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';
import { verifyAuth } from '@/lib/auth/auth';
import { canAccessSite } from '@/lib/services/authz/getAuthorizedSiteIds';
import { deriveSiteType } from '@/lib/services/siteType/deriveSiteType';
import FreshnessBadgeBlock from './sections/FreshnessBadgeBlock';
import SolarImpactBlock, { SolarImpactBlockSkeleton } from './sections/SolarImpactBlock';
import PowerChartBlock, { ChartBlockSkeleton } from './sections/PowerChartBlock';
import DeviceChartsBlock from './sections/DeviceChartsBlock';
import PerformanceChartBlock from './sections/PerformanceChartBlock';
import BatteryHealthBlock from './sections/BatteryHealthBlock';
import YieldLossBlock from './sections/YieldLossBlock';
import DownloadsBlock from './sections/DownloadsBlock';
import PrintButton from './PrintButton';

/**
 * Asset Details rendered as a static server-side shell with per-section
 * Suspense boundaries:
 *   - Site title, back link, "Live Data Charts" heading render immediately.
 *   - The freshness badge, solar-impact block, live power chart, device
 *     charts (battery/genset), and performance chart each stream in on
 *     their own boundary. Each fetch runs in parallel and reveals as soon
 *     as its own AMMP call returns.
 */
export default async function AssetDetailsScreen({ assetData }) {
    if (!assetData) notFound();

    const { user: authResult } = await verifyAuth();

    // Authorization gate — a user must not view a site outside their scope,
    // even if they craft the URL directly.
    const allowed = await canAccessSite(authResult?.id, assetData.asset_id);
    if (!allowed) notFound();

    const { access_token: token } = await getAmmpToken(authResult?.id);
    if (!token) notFound();

    const { asset_id: assetId } = assetData;
    const siteType = deriveSiteType(assetData);

    return (
        <div className={classes.container}>
            <PageHeader crumbs={["Dashboard", assetData.long_name]} showBackButton={false} />
            <div className={classes.content}>
                <div className={classes.contentHead}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <h1 className={classes.siteName}>{assetData.long_name}</h1>
                        <span style={{
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: 'rgba(255, 125, 112, 0.12)',
                            color: '#ff7d70',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: 0.4,
                            textTransform: 'uppercase',
                        }}>
                            {siteType.displayLabel}
                        </span>
                        <Suspense fallback={null}>
                            <FreshnessBadgeBlock assetId={assetId} token={token} />
                        </Suspense>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <PrintButton />
                        <Link href='/dashboard' className={classes.backLink}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 4 }}>
                                <ChevronLeft />
                            </span>
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {siteType.hasSolar && (
                    <Suspense fallback={<SolarImpactBlockSkeleton />}>
                        <SolarImpactBlock assetId={assetId} token={token} />
                    </Suspense>
                )}

                {siteType.hasBattery && (
                    <Suspense fallback={null}>
                        <BatteryHealthBlock assetId={assetId} token={token} />
                    </Suspense>
                )}

                {/* Yield-loss waterfall — solar sites only. Hidden entirely
                    when no losses recorded. */}
                {siteType.hasSolar && (
                    <Suspense fallback={null}>
                        <YieldLossBlock assetId={assetId} token={token} />
                    </Suspense>
                )}
            </div>

            <div className={classes.chartsSection}>
                <h2 className={classes.chartsSectionTitle}>Live Data Charts</h2>

                {siteType.hasSolar && (
                    <Suspense fallback={<ChartBlockSkeleton label="Loading power chart…" />}>
                        <PowerChartBlock assetId={assetId} token={token} siteType={siteType} />
                    </Suspense>
                )}

                {(siteType.hasBattery || siteType.hasGenset) && (
                    <Suspense fallback={<ChartBlockSkeleton label="Loading device charts…" />}>
                        <DeviceChartsBlock assetId={assetId} token={token} siteType={siteType} />
                    </Suspense>
                )}

                {siteType.hasSolar && (
                    <Suspense fallback={<ChartBlockSkeleton label="Loading performance chart…" />}>
                        <PerformanceChartBlock assetId={assetId} token={token} />
                    </Suspense>
                )}
            </div>

            {/* Downloads section — customer-visible export of the monthly
                NOC-verified report data, one CSV per month. */}
            <DownloadsBlock assetId={assetId} siteName={assetData.long_name || assetData.asset_name} />

            <CopyRight />
        </div>
    );
}
