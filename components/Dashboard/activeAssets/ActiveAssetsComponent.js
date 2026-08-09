'use client'
import React from 'react';
import Link from "next/link";
import classes from "./activeAssets.module.css";
import SolarImpactIcon from "@/components/ui/icons/dashboardIcons/SolarImpactIcon";
import Co2ReductionIcon from "@/components/ui/icons/dashboardIcons/Co2ReductionIcon";
import TreesSavedIcon from "@/components/ui/icons/dashboardIcons/TreesSavedIcon";
import PowerSupGeneratorIcon from "@/components/ui/icons/dashboardIcons/PowerSupGeneratorIcon";
import PowerSupSolarIcon from "@/components/ui/icons/dashboardIcons/PowerSupSolarIcon";
import PowerSupGridIcon from "@/components/ui/icons/dashboardIcons/PowerSupGridIcon";
import InfoTooltip from "@/components/ui/InfoTooltip/InfoTooltip";
import { formatPower, toCommaAmount, toReadableKWh, toReadableMWh, toStringCapacity } from "@/utils/constants";
import DonutChartComponent from "@/components/ui/charts/DonutChartComponent";
import CopyRight from '@/components/ui/CopyRight/copyright';

// Conversion factors used for the "human-scale" highlight cards below.
// Kept together so they're easy to review / adjust:
//   - Diesel: a typical genset burns ~0.28 L per kWh produced.
//   - Home:   a Nigerian small-consumer household averages ~10 kWh/day.
//   - Car:    the built-in TotalCarDistanceSaved already returns kilometres.
const DIESEL_L_PER_KWH = 0.28;
const HOME_KWH_PER_DAY = 10;

export function ActiveAssetsComponent({ assets, totals }) {
    const date = new Date();
    const thisYear = date.getFullYear();

    // Function to get current date and time in desired format
    function getCurrentDateTime() {
        const date = new Date();
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()} ${date.getHours() >= 12 ? "PM" : "AM"}`;
    }

    // --- Derived, customer-friendly metrics ------------------------
    // Totals are in Wh (AMMP convention). Convert to kWh once, then work
    // from there so nothing downstream has to remember the /1000.
    const pvKwh     = (totals?.TotalHistoricPvEnergy     || 0) / 1000;
    const gridKwh   = (totals?.TotalHistoricGridEnergy   || 0) / 1000;
    const gensetKwh = (totals?.TotalHistoricGensetEnergy || 0) / 1000;
    const totalConsumedKwh = pvKwh + gridKwh + gensetKwh;
    const solarSharePct = totalConsumedKwh > 0 ? (pvKwh / totalConsumedKwh) * 100 : null;

    // "Diesel avoided" is the fuel a genset would have burned to produce
    // the same energy your solar covered. Rough figure that customers
    // recognise instantly — much more intuitive than raw kWh.
    const dieselLitresAvoided = pvKwh * DIESEL_L_PER_KWH;

    // Average daily solar production ÷ typical household draw = "homes
    // you could power for a day". Only meaningful once we have a couple
    // of days of history.
    const days = totals?.HistoricPvEnergyTotalDays || 0;
    const avgDailyPvKwh = days > 0 ? pvKwh / days : 0;
    const homesPoweredPerDay = avgDailyPvKwh > 0
        ? Math.round(avgDailyPvKwh / HOME_KWH_PER_DAY)
        : 0;

    const carKm = totals?.TotalCarDistanceSaved || 0;
    const showCompare = Array.isArray(assets) && assets.length >= 2;

    return (
        <>
        <div className={classes.gridContainer}>
            <div className={classes.topLeft}><h2 className={classes.whiteTitle}>Solar Impact</h2></div>
            <div className={classes.topCenter1}>
                ({totals && JSON.stringify(totals.HistoricPvEnergyTotalDays)} days active) | Last
                update: {getCurrentDateTime()}
            </div>
            <div className={classes.topRight}><h2 className={classes.whiteTitle}>Active sites</h2></div>
            <div className={classes.solar}>
                <div className={classes.iconWrapper}>
                    <SolarImpactIcon className={classes.icon} />
                </div>
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}>{totals ? toCommaAmount(toReadableMWh(totals.TotalHistoricPvEnergy)) : 0}&nbsp;MWh</h2>
                    <h6 className={classes.cardSubtitle}>
                        Solar&nbsp;production
                    </h6>
                </div>
            </div>
            <div className={classes.co2}>
                <div className={classes.iconWrapper}>
                    <Co2ReductionIcon className={classes.icon} />
                </div>
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}
                    >{toCommaAmount(totals && totals.TotalCo2Reduction)}&nbsp;kg</h2>
                    <p className={classes.cardSubtitle}>CO<sub>2</sub>&nbsp;Reduction</p>
                </div>
            </div>
            <div className={classes.trees}>
                <div className={classes.iconWrapper}>
                    <TreesSavedIcon className={classes.icon} />
                </div>
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}
                    >{toCommaAmount(totals && totals.TotalTreesSaved)} </h2>
                    <p className={classes.cardSubtitle}>
                        Trees&nbsp;saved</p>
                </div>
            </div>
            <div className={classes.rightSide}>
                <h3 className={classes.rightSideDetails}>{assets?.length} sites active</h3>
                <div>
                    {assets.length > 0 ? (
                        assets.map(asset => (
                            <div key={asset.asset_id}>
                                <div className={classes.rightContainer}>
                                    <span>
                                        <h3 className={classes.rightSideName}>{asset.long_name}</h3>
                                        <p className={classes.rightSideDetails}>Solar capacity: {asset.total_pv_power ? toStringCapacity(asset.total_pv_power) : ''}</p>
                                    </span>
                                    <span>
                                        <Link
                                            className={classes.rightBtn}
                                            href={`/Assets/Details/${asset.asset_id}`}
                                        >
                                            View
                                        </Link>
                                    </span>
                                </div>
                                <hr />
                            </div>
                        ))
                    ) : (
                        <p>No active assets.</p>
                    )}
                </div>
            </div>
            <div className={classes.powerGen}><h2 className={classes.whiteTitle} >Power Generation</h2></div>
            <div className={classes.lastUpdated}><small>Last update: {getCurrentDateTime()}</small></div>
            <div className={classes.donut}>
                <div className={classes.donutContent}>
                    <div className={classes.donutHeader}>Today&apos;s power generation across all sites
                    </div>
                    <div className={classes.donutHeaderTwo}>
                        Total power consumed
                        <span className='text-white pl-2'>{totals?.TotalMostRecentConsumptionPower ? totals.TotalMostRecentConsumptionPower : 0} kW</span>
                    </div>
                    <div className={classes.donutFigure}>
                        <DonutChartComponent
                            totals={totals}
                        />
                    </div>
                    <div className={classes.donutFooter}>
                        <div className={classes.powerSource}>
                            <div className={classes.powerSourceTop}>
                                <span><PowerSupGeneratorIcon /></span>
                                <span>&nbsp;</span>
                                <span>{formatPower(totals?.TotalMostRecentGensetPower ? totals?.TotalMostRecentGensetPower : 0)}</span>
                            </div>
                            <div>
                                <span className='text-[#b0b7bd]'>Power supplied from generator</span>
                            </div>
                        </div>
                        <div className={classes.powerSource}>
                            <div className={classes.powerSourceTop}>
                                <span> <PowerSupSolarIcon /></span>
                                <span>&nbsp;</span>
                                <span>{formatPower(totals?.TotalMostRecentPvPower ? totals.TotalMostRecentPvPower : 0)}</span>
                            </div>
                            <div>
                                <span className='text-[#b0b7bd]'>Power supplied from solar</span>
                            </div>
                        </div>
                        <div className={classes.powerSource}>
                            <div className={classes.powerSourceTop}>
                                <span> <PowerSupGridIcon /></span>
                                <span>&nbsp;</span>
                                <span>{formatPower(totals?.TotalMostRecentPowerFromGrid ? totals.TotalMostRecentPowerFromGrid : 0)}</span>
                            </div>
                            <div>
                                <span className='text-[#b0b7bd]'>Power supplied from grid</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Highlights strip — plain-English metrics that make the raw
            kWh numbers relatable. Shown below the primary grid so the
            existing layout is untouched. */}
        <div style={{
            margin: '0 20px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
        }}>
            <HighlightCard
                accent="#4caf50"
                title="Solar share"
                value={solarSharePct != null ? `${Math.round(solarSharePct)}%` : '—'}
                caption="of your total electricity came from solar since installation."
                tip="The share of everything your sites consumed that was covered by your solar system. Higher is better — a big number means less spend on grid and diesel."
            />
            <HighlightCard
                accent="#f4a742"
                title="Diesel avoided"
                value={dieselLitresAvoided > 0
                    ? `${toCommaAmount(Math.round(dieselLitresAvoided))} L`
                    : '—'}
                caption="of diesel your generator would have burned to produce the same energy."
                tip="Estimated using ~0.28 L of diesel per kWh — a typical figure for the small on-site gensets we displace."
            />
            <HighlightCard
                accent="#60a5fa"
                title="Homes powered daily"
                value={homesPoweredPerDay > 0
                    ? `${toCommaAmount(homesPoweredPerDay)}`
                    : '—'}
                caption={`average households your daily solar output could power (${HOME_KWH_PER_DAY} kWh each).`}
                tip="An easy-to-picture equivalent for how much energy your sites produce on an average day."
            />
            {carKm > 0 && (
                <HighlightCard
                    accent="#00c9ff"
                    title="Car km avoided"
                    value={`${toCommaAmount(Math.round(carKm))} km`}
                    caption="of driving worth of CO₂ your solar has already avoided."
                    tip="Uses the same CO₂ figure as the reduction card above, converted using an average passenger car's emissions."
                />
            )}
        </div>

        {/* Compare sites — surfaced only when the customer has 2+ sites.
            Same URL as the deeper compare tool, so admins/customers use
            the same flow. */}
        {showCompare && (
            <div style={{ margin: '0 20px 32px' }}>
                <Link
                    href="/dashboard/compare"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 18px',
                        borderRadius: 10,
                        background: 'rgba(255, 125, 112, 0.14)',
                        border: '1px solid rgba(255, 125, 112, 0.35)',
                        color: '#ff9770',
                        fontWeight: 600,
                        textDecoration: 'none',
                        fontSize: '0.95rem',
                    }}
                >
                    Compare your sites side by side →
                </Link>
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                    Spot the site pulling less than its peers or celebrate your top performer.
                </p>
            </div>
        )}

        <CopyRight />
        </>
    );
}

function HighlightCard({ accent, title, value, caption, tip }) {
    return (
        <div style={{
            padding: '18px 20px',
            borderRadius: 14,
            background: 'rgba(59, 68, 75, 0.65)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${accent}55`,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
        }}>
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.78rem',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                fontWeight: 600,
            }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
                {title}
                {tip && <InfoTooltip title={title} placement="bottom">{tip}</InfoTooltip>}
            </div>
            <div style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.1,
                fontFamily: 'Kanit, sans-serif',
            }}>
                {value}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                {caption}
            </div>
        </div>
    );
}
