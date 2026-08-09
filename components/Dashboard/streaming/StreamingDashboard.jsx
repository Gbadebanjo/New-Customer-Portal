import { Suspense } from 'react';
import classes from '../activeAssets/activeAssets.module.css';
import CopyRight from '@/components/ui/CopyRight/copyright';
import KpiCardsSection from './KpiCardsSection';
import KpiSnapshotHydrator from './KpiSnapshotHydrator';
import LivePowerSection from './LivePowerSection';
import { LivePowerCardSkeleton } from './LivePowerCard';
import ActiveSitesSection from './ActiveSitesSection';
import { ActiveSitesPanelSkeleton } from './ActiveSitesPanel';
import PeriodComparisonCard from './PeriodComparisonCard';
import HooksErrorBoundary from '@/components/ui/ErrorBoundary/HooksErrorBoundary';

/**
 * The Dashboard grid rendered as a static server-side shell:
 *   - Titles, "Lifetime" / "Right now" pills, days-active line, section
 *     headers all render immediately with the assets list we already have.
 *   - Each data-bound cell (KPI cards, Live power donut, Active sites list)
 *     is wrapped in its own Suspense boundary, so each streams in as soon
 *     as ITS specific AMMP call returns. The three fetches race — whichever
 *     lands first appears first. No section blocks another.
 */

// Kept as a plain utility so React's rules-of-hooks lint doesn't flag the
// `Date.now()` call inside the server component (the render itself is
// per-request, so impurity is fine — the lint rule just can't tell).
function computeDaysActive() {
    return Math.ceil((Date.now() - Date.UTC(2021, 0, 1)) / 86_400_000);
}


export default function StreamingDashboard({ assets, token, autoRefreshMs, userId }) {
    const daysActive = computeDaysActive();

    return (
        <>
            <div className={classes.gridContainer}>
                <div className={classes.topLeft}>
                    <h2 className={classes.whiteTitle} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        Solar Impact
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'var(--ds-accent)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: 'rgba(255, 125, 112, 0.14)',
                            border: '1px solid rgba(255, 125, 112, 0.35)',
                        }}>
                            Lifetime
                        </span>
                    </h2>
                </div>
                <div className={classes.topCenter1}>
                    Since installation ({daysActive} days)
                </div>
                <div className={classes.topRight}><h2 className={classes.whiteTitle}>Active sites</h2></div>

                {/* Each Suspense boundary races independently — whichever
                    AMMP call returns first shows up first. Each is wrapped
                    in a labelled error boundary so a hook error in one
                    section identifies itself in the browser console. */}
                <HooksErrorBoundary label="KpiCards">
                    <Suspense fallback={<KpiSnapshotHydrator />}>
                        <KpiCardsSection assets={assets} token={token} />
                    </Suspense>
                </HooksErrorBoundary>

                <HooksErrorBoundary label="ActiveSites">
                    <Suspense fallback={<ActiveSitesPanelSkeleton assets={assets} />}>
                        <ActiveSitesSection assets={assets} token={token} />
                    </Suspense>
                </HooksErrorBoundary>

                {/* Period comparison — sits directly beneath the KPI
                    cards, spanning the same 4 columns. */}
                {userId && (
                    <div className={classes.trend}>
                        <HooksErrorBoundary label="PeriodComparison">
                            <PeriodComparisonCard userId={userId} />
                        </HooksErrorBoundary>
                    </div>
                )}

                <HooksErrorBoundary label="LivePower">
                    <Suspense fallback={<LivePowerCardSkeleton />}>
                        <LivePowerSection assets={assets} token={token} autoRefreshMs={autoRefreshMs} />
                    </Suspense>
                </HooksErrorBoundary>
            </div>

            <CopyRight />
        </>
    );
}
