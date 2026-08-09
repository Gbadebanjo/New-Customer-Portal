import classes from '../assetDetails.module.css';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import SolarImpactIcon from '@/components/ui/icons/dashboardIcons/SolarImpactIcon';
import Co2ReductionIcon from '@/components/ui/icons/dashboardIcons/Co2ReductionIcon';
import TreesSavedIcon from '@/components/ui/icons/dashboardIcons/TreesSavedIcon';
import HalfDonutChartComponent from '@/components/ui/charts/HalfDonutChartComponent';
import PowerSupGeneratorIcon from '@/components/ui/icons/dashboardIcons/PowerSupGeneratorIcon';
import PowerSupSolarIcon from '@/components/ui/icons/dashboardIcons/PowerSupSolarIcon';
import PowerSupGridIcon from '@/components/ui/icons/dashboardIcons/PowerSupGridIcon';
import EnergyProductionInteractive from './EnergyProductionInteractive';
import Badge from '@/components/ui/Badge/Badge';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import { formatPower, toCommaAmount, toReadableMWh } from '@/utils/constants';

const EMPTY_TOTALS = {
    energyFromSolar: 0, energyFromGenerator: 0, energyFromGrid: 0,
    totalHistoricPvEnergy: 0, totalCo2Reduction: 0, totalTreesSaved: 0,
    totalDays: 0, percentElectricity: 0, totalPowerGenerated: 0,
    powerFromGenerator: 0, powerFromSolar: 0, powerFromGrid: 0,
    PercentagePowerSuppliedBySolar: 0,
    totalEnergyProduced: 0,
};

function nowLabel() {
    return new Date().toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

/**
 * Fetches the totals payload from getTodaysEnergy and renders the three
 * inter-related blocks that share that data:
 *   - Solar Impact (electricity %, solar production, CO2, trees)
 *   - Power Generation (right-now power tree)
 *   - Energy Production (day picker + progress bars)
 */
export default async function SolarImpactBlock({ assetId, token }) {
    let totals = null;
    let verifiedImpact = null;
    if (token && assetId) {
        // Fire both in parallel — verified CO2 covers this year to date, so
        // we don't need it to match the historic-since-installation window.
        const now = new Date();
        const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        [totals, verifiedImpact] = await Promise.all([
            AmmpServices().getTodaysEnergy(token, assetId),
            AmmpServices().getEnvironmentalImpact(token, assetId, startOfYear, now),
        ]);
    }
    const t = totals ?? EMPTY_TOTALS;
    const updated = nowLabel();

    // Prefer AMMP's verified CO2 when it's available. Fall back to the
    // calculated figure otherwise. The badge tells the user which they see.
    const verifiedCo2Kg = verifiedImpact?.co2AvoidedKg ?? null;
    const co2DisplayKg = verifiedCo2Kg != null ? verifiedCo2Kg : t.totalCo2Reduction;
    const co2Source = verifiedCo2Kg != null ? 'verified' : 'estimated';

    // Initial Energy Production values come from the totals fetch. The
    // interactive block replaces them when the user picks a new range.
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const initialEnergyTotals = {
        totalEnergyProduced: t.totalEnergyProduced ?? 0,
        energyFromSolar: t.energyFromSolar ?? 0,
        energyFromGenerator: t.energyFromGenerator ?? 0,
        energyFromGrid: t.energyFromGrid ?? 0,
    };

    return (
        <>
            <div className={classes.topRow}>
                <h2 className={classes.blueTitle}>Solar Impact</h2>
                <p>({t.totalDays} days active) | Last update: {updated}</p>
            </div>
            <div className={classes.centerContent}>
                <div className={classes.electricity}>
                    <HalfDonutChartComponent numerator={t.percentElectricity} />
                    <h2 className={classes.cardTitle}>{Math.ceil(t.percentElectricity)}&nbsp;%</h2>
                    <p className={classes.cardSubtitle}>Electricity&nbsp;contributed&nbsp;by&nbsp;solar</p>
                </div>
                <div className={classes.solar}>
                    <div className={classes.iconWrapper}>
                        <SolarImpactIcon className={classes.icon} />
                    </div>
                    <div className={classes.cardBody}>
                        <h2 className={classes.cardTitle}>{toCommaAmount(toReadableMWh(t.totalHistoricPvEnergy))}&nbsp;MWh</h2>
                        <p className={classes.cardSubtitle}>Solar&nbsp;production</p>
                    </div>
                </div>
                <div className={classes.co2}>
                    <div className={classes.iconWrapper}>
                        <Co2ReductionIcon className={classes.icon} />
                    </div>
                    <div className={classes.cardBody}>
                        <h2 className={classes.cardTitle}>{toCommaAmount(co2DisplayKg)}&nbsp;Kg</h2>
                        <p className={classes.cardSubtitle}>
                            CO<sub>2</sub> reduction&nbsp;
                            <InfoTooltip title="CO₂ reduction">
                                {co2Source === 'verified'
                                    ? 'Sourced directly from this site\'s verified environmental-impact readings (year to date). No conversion factor applied on our side.'
                                    : 'Calculated from your solar production using a standard grid emissions factor (~0.55 kg CO₂ per kWh). This is a well-accepted estimate, not a measured value.'}
                            </InfoTooltip>
                        </p>
                        <div style={{ marginTop: 4 }}>
                            <Badge variant={co2Source === 'verified' ? 'verified' : 'provisional'}>
                                {co2Source === 'verified' ? 'Verified' : 'Estimated'}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className={classes.trees}>
                    <div className={classes.iconWrapper}>
                        <TreesSavedIcon className={classes.icon} />
                    </div>
                    <div className={classes.cardBody}>
                        <h2 className={classes.cardTitle}>{toCommaAmount(t.totalTreesSaved)}</h2>
                        <p className={classes.cardSubtitle}>Trees&nbsp;saved</p>
                    </div>
                </div>
                <div className={classes.power}>
                    <h2 className={classes.blueTitle}>Power generation</h2>
                </div>
                <div className={classes.lastUp}>
                    <h4>Last update {updated}</h4>
                </div>
                <div className={classes.energy}>
                    <h2 className={classes.blueTitle}>Energy production</h2>
                </div>
                <div className={classes.lastUp2}>
                    <h4>Last update {updated}</h4>
                </div>
                <div className={classes.totalPower}>
                    <h3 className={classes.nameDetail}>Current performance on site</h3>
                    <div className={classes.powerTree} style={{ position: 'relative', minHeight: 380 }}>
                        <div className={classes.powerNodeTop} style={{ position: 'relative', zIndex: 2 }}>
                            <div className={classes.powerTotalBox}>
                                <span className={classes.powerTotalValue}>{formatPower(t.totalPowerGenerated)}</span>
                                <div className={classes.powerTotalLabel}>Total power generated</div>
                            </div>
                        </div>
                        <svg
                            className={classes.powerLinesSvg}
                            width="100%"
                            height="100%"
                            viewBox="0 0 100 100"
                            style={{ position: 'absolute', top: 80, left: 0, pointerEvents: 'none', zIndex: 1 }}
                            preserveAspectRatio="none"
                        >
                            <polyline points="45,20 17,20 17,80" fill="none" stroke="#00c9ff" strokeWidth="0.8" strokeLinecap="round" />
                            <circle r="1" fill="#00c9ff">
                                <animateMotion repeatCount="indefinite" dur="5s" path="M17,80 L17,20 L45,20" />
                            </circle>
                            <line x1="50" y1="20" x2="50" y2="80" stroke="#ff7d70" strokeWidth="1" strokeLinecap="round" />
                            <circle r="1" fill="#ff7d70">
                                <animateMotion repeatCount="indefinite" dur="5s" path="M50,80 L50,20" />
                            </circle>
                            <polyline points="47,20 83,20 83,80" fill="none" stroke="#00c9ff" strokeWidth="0.8" strokeLinecap="round" />
                            <circle r="1" fill="#00c9ff">
                                <animateMotion repeatCount="indefinite" dur="5s" path="M83,80 L83,20 L47,20" />
                            </circle>
                        </svg>
                        <div className={classes.powerNodeBottom} style={{ position: 'relative', zIndex: 2 }}>
                            <div className={classes.powerBox}>
                                <PowerSupGeneratorIcon />
                                <div className={classes.powerValue}>{formatPower(t.powerFromGenerator)}</div>
                                <div className={classes.powerLabel}>Power from generator</div>
                            </div>
                            <div className={classes.powerBox}>
                                <PowerSupSolarIcon />
                                <div className={classes.powerValue}>{formatPower(t.powerFromSolar)}</div>
                                <div className={classes.powerLabel}>Power from Solar</div>
                            </div>
                            <div className={classes.powerBox}>
                                <PowerSupGridIcon />
                                <div className={classes.powerValue}>{formatPower(t.powerFromGrid)}</div>
                                <div className={classes.powerLabel}>Power from grid</div>
                            </div>
                        </div>
                    </div>
                    <div className={classes.powerFooter}>
                        <span className={classes.powerPercent}>{Math.floor(t.PercentagePowerSuppliedBySolar)}%</span>
                        <span className={classes.powerFooterLabel}>Power supplied by solar</span>
                    </div>
                </div>
                <EnergyProductionInteractive
                    assetId={assetId}
                    initialTotals={initialEnergyTotals}
                    initialFrom={sevenDaysAgo}
                    initialTo={now}
                />
            </div>
        </>
    );
}

export function SolarImpactBlockSkeleton() {
    return (
        <>
            <div className={classes.topRow}>
                <h2 className={classes.blueTitle}>Solar Impact</h2>
                <div style={{ width: 220, height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div className={classes.centerContent}>
                {['electricity', 'solar', 'co2', 'trees'].map((k) => (
                    <div key={k} className={classes[k]}>
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                        <div style={{ width: 100, height: 18, borderRadius: 4, marginTop: 12, background: 'rgba(255,255,255,0.06)' }} />
                        <div style={{ width: 140, height: 12, borderRadius: 4, marginTop: 6, background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                ))}
                <div className={classes.power}><h2 className={classes.blueTitle}>Power generation</h2></div>
                <div className={classes.lastUp}></div>
                <div className={classes.energy}><h2 className={classes.blueTitle}>Energy production</h2></div>
                <div className={classes.lastUp2}></div>
                <div className={classes.totalPower}>
                    <div style={{ width: '100%', minHeight: 380, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }} />
                </div>
                <div className={classes.totalEnergy}>
                    <div style={{ width: '100%', minHeight: 160, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }} />
                </div>
            </div>
        </>
    );
}
