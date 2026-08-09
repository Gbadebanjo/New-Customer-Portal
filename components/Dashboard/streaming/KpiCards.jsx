'use client';
import classes from '../activeAssets/activeAssets.module.css';
import SolarImpactIcon from '@/components/ui/icons/dashboardIcons/SolarImpactIcon';
import Co2ReductionIcon from '@/components/ui/icons/dashboardIcons/Co2ReductionIcon';
import TreesSavedIcon from '@/components/ui/icons/dashboardIcons/TreesSavedIcon';
import DieselAvoidedIcon from '@/components/ui/icons/dashboardIcons/DieselAvoidedIcon';
import Badge from '@/components/ui/Badge/Badge';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import { toCommaAmount, toReadableMWh } from '@/utils/constants';
import { useSaveKpiSnapshot } from './KpiSnapshotHydrator';

/**
 * The four Solar Impact KPI cards. Pure display — receives historic totals
 * from a parent server component wrapped in Suspense.
 */
export default function KpiCards({ totals }) {
    // Persist a snapshot to sessionStorage so returning users see numbers
    // (dimmed) instead of a skeleton while server data streams in on the
    // next visit.
    useSaveKpiSnapshot(totals);

    return (
        <>
            <div className={classes.solar}>
                <div className={classes.iconWrapper}>
                    <SolarImpactIcon className={classes.icon} />
                </div>
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}>
                        {totals ? toCommaAmount(toReadableMWh(totals.TotalHistoricPvEnergy)) : 0}&nbsp;MWh
                    </h2>
                    <h6 className={classes.cardSubtitle}>
                        Solar&nbsp;production&nbsp;
                        <InfoTooltip title="Solar production">
                            Total electricity your solar panels have generated since installation. Measured directly from your inverters and shown in megawatt-hours (MWh).
                        </InfoTooltip>
                    </h6>
                </div>
            </div>
            <div className={classes.co2}>
                <div className={classes.iconWrapper}>
                    <Co2ReductionIcon className={classes.icon} />
                </div>
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}>{toCommaAmount(totals?.TotalCo2Reduction)}&nbsp;kg</h2>
                    <p className={classes.cardSubtitle}>
                        CO<sub>2</sub>&nbsp;Reduction&nbsp;
                        <InfoTooltip title="CO₂ reduction">
                            Estimated carbon emissions avoided because your sites ran on solar instead of the Nigerian grid. Every unit of solar energy saves roughly 0.55&nbsp;kg of CO₂.
                        </InfoTooltip>
                    </p>
                </div>
            </div>
            <div className={classes.trees}>
                <div className={classes.iconWrapper}>
                    <TreesSavedIcon className={classes.icon} />
                </div>
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}>{toCommaAmount(totals?.TotalTreesSaved)}</h2>
                    <p className={classes.cardSubtitle}>
                        Trees&nbsp;saved&nbsp;
                        <InfoTooltip title="Trees saved">
                            The number of mature trees it would take an entire year to absorb the same amount of CO₂ your solar systems have avoided. A helpful way to picture your environmental impact.
                        </InfoTooltip>
                    </p>
                </div>
            </div>
            <div className={classes.diesel}>
                <div className={classes.iconWrapper}>
                    <DieselAvoidedIcon className={classes.icon} />
                </div>
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}>{toCommaAmount(totals?.TotalDieselLitresAvoided ?? 0)}&nbsp;L</h2>
                    <p className={classes.cardSubtitle}>
                        Diesel&nbsp;avoided&nbsp;
                        <InfoTooltip title="Diesel avoided">
                            The amount of diesel your generators would have burned to produce the same electricity that your solar systems delivered. Calculated using a typical generator efficiency (3.6&nbsp;kWh per litre) — a realistic industry average, not a measured value from your fuel tanks.
                        </InfoTooltip>
                    </p>
                    <div style={{ marginTop: 4 }}>
                        <Badge variant="provisional">Estimated</Badge>
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * Placeholder cards shown while KpiCards' data is loading. Same grid areas so
 * the layout doesn't jump when data arrives.
 */
export function KpiCardsSkeleton() {
    return (
        <>
            {['solar', 'co2', 'trees', 'diesel'].map((k) => (
                <div key={k} className={classes[k]}>
                    <div className={classes.iconWrapper} style={{ opacity: 0.4 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                    <div className={classes.cardBody} style={{ gap: 6 }}>
                        <div style={{ width: 80, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ width: 100, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                </div>
            ))}
        </>
    );
}
