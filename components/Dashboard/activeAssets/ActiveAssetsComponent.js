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
import { formatPower, toCommaAmount, toReadableKWh, toReadableMWh, toStringCapacity } from "@/utils/constants";
import DonutChartComponent from "@/components/ui/charts/DonutChartComponent";
import CopyRight from '@/components/ui/CopyRight/copyright';

export function ActiveAssetsComponent({ assets, totals }) {
    const date = new Date();
    const thisYear = date.getFullYear();

    // if (totals) {
    //     console.log('Totals active > ', totals);
    // }

    // Function to get current date and time in desired format
    function getCurrentDateTime() {
        const date = new Date();
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()} ${date.getHours() >= 12 ? "PM" : "AM"}`;
    }

    return (
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
            <CopyRight />
        </div>
    );
}
