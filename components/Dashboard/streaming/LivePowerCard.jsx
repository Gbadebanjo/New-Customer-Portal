'use client';
import classes from '../activeAssets/activeAssets.module.css';
import DonutChartComponent from '@/components/ui/charts/DonutChartComponent';
import PowerSupGeneratorIcon from '@/components/ui/icons/dashboardIcons/PowerSupGeneratorIcon';
import PowerSupSolarIcon from '@/components/ui/icons/dashboardIcons/PowerSupSolarIcon';
import PowerSupGridIcon from '@/components/ui/icons/dashboardIcons/PowerSupGridIcon';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import AutoRefresh from '@/components/ui/AutoRefresh/AutoRefresh';
import { formatPower } from '@/utils/constants';

/**
 * Live power donut card. Receives most-recent totals from a Suspense-wrapped
 * server parent so it streams in independently of the KPI cards.
 */
export default function LivePowerCard({ totals, autoRefreshMs = 0 }) {
    return (
        <div className={classes.donut}>
            <div className={classes.donutContent}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    <h2 className={classes.whiteTitle} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: 0 }}>
                        Power Generation
                        <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: 'var(--ds-success)',
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            padding: '3px 10px', borderRadius: 999,
                            background: 'rgba(76, 175, 80, 0.12)',
                            border: '1px solid rgba(76, 175, 80, 0.4)',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                            <span style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: 'var(--ds-success)',
                                animation: 'ds-pulse 2s ease-in-out infinite',
                            }} />
                            Right now
                        </span>
                    </h2>
                    <AutoRefresh intervalMs={autoRefreshMs} />
                </div>
                <div className={classes.donutHeader} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Live power flow across all sites
                    <InfoTooltip title="Live power flow">
                        A snapshot of what your sites are drawing <em>right this second</em>, split by source (solar, generator, grid). This is a rate (MW) — it changes minute-by-minute. It&rsquo;s not the same as the totals on the Solar Impact cards above, which show electricity accumulated over the lifetime of your systems.
                    </InfoTooltip>
                </div>
                <div className={classes.donutHeaderTwo}>
                    Total power consumed right now
                    <span className='text-white pl-2'>{formatPower(totals?.TotalMostRecentConsumptionPower ?? 0)}</span>
                </div>
                <div className={classes.donutFigure}>
                    <DonutChartComponent totals={totals} />
                </div>
                <div className={classes.donutFooter}>
                    <div className={classes.powerSource}>
                        <div className={classes.powerSourceTop}>
                            <span><PowerSupGeneratorIcon /></span>
                            <span>&nbsp;</span>
                            <span>{formatPower(totals?.TotalMostRecentGensetPower ?? 0)}</span>
                        </div>
                        <div><span className='text-[#b0b7bd]'>Power supplied from generator</span></div>
                    </div>
                    <div className={classes.powerSource}>
                        <div className={classes.powerSourceTop}>
                            <span><PowerSupSolarIcon /></span>
                            <span>&nbsp;</span>
                            <span>{formatPower(totals?.TotalMostRecentPvPower ?? 0)}</span>
                        </div>
                        <div><span className='text-[#b0b7bd]'>Power supplied from solar</span></div>
                    </div>
                    <div className={classes.powerSource}>
                        <div className={classes.powerSourceTop}>
                            <span><PowerSupGridIcon /></span>
                            <span>&nbsp;</span>
                            <span>{formatPower(totals?.TotalMostRecentPowerFromGrid ?? 0)}</span>
                        </div>
                        <div><span className='text-[#b0b7bd]'>Power supplied from grid</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Placeholder donut card shown while live power data loads.
 */
export function LivePowerCardSkeleton() {
    return (
        <div className={classes.donut}>
            <div className={classes.donutContent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ width: 200, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 120, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{ width: 220, height: 14, marginBottom: 10, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ width: 260, height: 14, margin: '0 auto 24px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                    <div style={{ width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', gap: 16 }}>
                    {[0, 1, 2].map((k) => (
                        <div key={k} style={{ width: 100, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
