import classes from './assetDetails.module.css';
import HomeIcon from "@/components/ui/icons/HomeIcon";
import Link from "next/link";
import SolarImpactIcon from "@/components/ui/icons/dashboardIcons/SolarImpactIcon";
import { formatPower, toCommaAmount, toReadableMWh, toStringCapacity } from "@/utils/constants";
import AmmpServices from "@/lib/services/ammp/AmmpServices";
import Co2ReductionIcon from "@/components/ui/icons/dashboardIcons/Co2ReductionIcon";
import TreesSavedIcon from "@/components/ui/icons/dashboardIcons/TreesSavedIcon";
import HalfDonutChartComponent from "@/components/ui/charts/HalfDonutChartComponent";
import PowerSupGeneratorIcon from "@/components/ui/icons/dashboardIcons/PowerSupGeneratorIcon";
import PowerSupSolarIcon from "@/components/ui/icons/dashboardIcons/PowerSupSolarIcon";
import PowerSupGridIcon from "@/components/ui/icons/dashboardIcons/PowerSupGridIcon";
import CustomDateRangePicker from "@/components/ui/dateRangePicker/CustomDateRangePicker";
import ProgressBarChartComponent from "@/components/ui/charts/ProgressBarChartComponent";
import ChevronLeft from '@/components/ui/icons/ChevronLeft';
import CopyRight from '@/components/ui/CopyRight/copyright';
import ButtonFlexible from '@/components/ui/button-flexible/ButtonFlexible';
import PowerLineChart from '@/components/ui/charts/PowerLineChart';
import BatteryChart from '@/components/ui/charts/BatteryChart';
import GensetChart from '@/components/ui/charts/GensetChart';
import PerformanceLineChart from '@/components/ui/charts/PerformanceLineChart';
import { getAmmpToken } from '@/lib/services/ammp/getAmmpToken';
import { verifyAuth } from '@/lib/auth/auth';
import { notFound } from 'next/navigation';

export default async function AssetDetailsScreen({ assetData }) {

    const date = new Date();
    const thisYear = date.getFullYear();

    // Function to get current date and time in desired format
    function getCurrentDateTime() {
        const date = new Date();
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()} ${date.getHours() >= 12 ? "PM" : "AM"}`;
    }

    if (!assetData) {
        notFound();
    }

    const { user: authResult } = await verifyAuth();
    const { access_token } = await getAmmpToken(authResult?.id);
    const token = access_token;

    if (!token) {
        notFound();
    }

    const { asset_id } = assetData;

    // Date ranges for chart data
    const now = new Date();
    // Use last 24h for power (today-only is often empty early in the day)
    const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));

    // Fetch all data in parallel
    const [totals, devicesRaw, powerData, kpiData] = await Promise.all([
        AmmpServices().getTodaysEnergy(token, asset_id),
        AmmpServices().getAssetDevices(token, asset_id),
        AmmpServices().getHistoricAssetPowerData(token, asset_id, last24hStart, now, '15m'),
        AmmpServices().getHistoricKpiData(token, asset_id, weekAgo, now, '1h'),
    ]);

    // Detect site type from device list
    const devices = Array.isArray(devicesRaw) ? devicesRaw : (devicesRaw?.devices ?? []);
    const hasBattery = devices.some(d => d.device_type === 'battery-system');
    const hasGenset = devices.some(d => d.device_type === 'genset');

    // Fetch battery data only if site has battery
    const batteryData = hasBattery
        ? await AmmpServices().getHistoricBatteryData(token, asset_id, todayStart, now, '15m')
        : null;

    const safeTotals = totals ?? {
        energyFromSolar: 0, energyFromGenerator: 0, energyFromGrid: 0,
        totalHistoricPvEnergy: 0, totalCo2Reduction: 0, totalTreesSaved: 0,
        totalDays: 0, percentElectricity: 0, totalPowerGenerated: 0,
        powerFromGenerator: 0, powerFromSolar: 0, powerFromGrid: 0,
        PercentagePowerSuppliedBySolar: 0,
    };

    const progressData = {
        energyFromSolar: safeTotals.energyFromSolar,
        energyFromGenerator: safeTotals.energyFromGenerator,
        energyFromGrid: safeTotals.energyFromGrid,
    }
    // console.log('progressData 1: >>', JSON.stringify(progressData));
    return (
        <div className={classes.container}>
            {/* Header */}
            <div className={classes.header}>
                <span>
                    <Link href='/dashboard'>
                        <HomeIcon />
                    </Link>
                </span>
                <span>
                    <small> {assetData.long_name}</small>
                </span>
            </div>
            <div className={classes.content}>
                <div className={classes.contentHead}>
                    <h1 className={classes.siteName}>{assetData.long_name}</h1>
                    <Link href='/dashboard' className={classes.backLink}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 4 }}>
                            <ChevronLeft />
                        </span>
                        Back to Dashboard
                    </Link>

                </div>
                <div className={classes.topRow}>
                    <h2 className={classes.blueTitle}>Solar Impact</h2>
                    <p>({safeTotals.totalDays} days active) | Last update:{getCurrentDateTime()}</p>
                </div>
                <div className={classes.centerContent}>
                    {/* Content */}
                    <div className={classes.electricity}>
                        <HalfDonutChartComponent numerator={safeTotals.percentElectricity} />
                        <h2 className={classes.cardTitle}>{Math.ceil(safeTotals.percentElectricity)}&nbsp;%</h2>
                        <p className={classes.cardSubtitle}> Electricity&nbsp;contributed&nbsp;by&nbsp;solar</p>
                    </div>
                    <div className={classes.solar}>
                        <div className={classes.iconWrapper}>
                            <SolarImpactIcon className={classes.icon} />
                        </div>
                        <div className={classes.cardBody}
                        >
                            <h2 className={classes.cardTitle}>{toCommaAmount(toReadableMWh(safeTotals.totalHistoricPvEnergy))}&nbsp;MWh</h2>
                            <p className={classes.cardSubtitle}>Solar&nbsp;production</p>
                        </div>

                    </div>
                    <div className={classes.co2}>
                        <div className={classes.iconWrapper}>
                            <Co2ReductionIcon className={classes.icon} />
                        </div>
                        <div className={classes.cardBody}
                        >
                            <h2 className={classes.cardTitle}>{toCommaAmount(safeTotals.totalCo2Reduction)}&nbsp;Kg</h2>
                            <p className={classes.cardSubtitle}>CO<sub>2</sub> reduction</p>
                        </div>
                    </div>
                    <div className={classes.trees}>
                        <div className={classes.iconWrapper}>
                            <TreesSavedIcon className={classes.icon} />
                        </div>
                        <div className={classes.cardBody}>
                            <h2 className={classes.cardTitle} >{toCommaAmount(safeTotals.totalTreesSaved)}</h2>
                            <p className={classes.cardSubtitle}> Trees&nbsp;saved</p>
                        </div>
                    </div>
                    <div className={classes.power}>
                        <h2 className={classes.blueTitle}>Power generation</h2>
                    </div>
                    <div className={classes.lastUp}>
                        <h4>Last update {getCurrentDateTime()}</h4>
                    </div>
                    <div className={classes.energy}>
                        <h2 className={classes.blueTitle}>Energy production</h2>
                    </div>
                    <div className={classes.lastUp2}>
                        <h4>Last update {getCurrentDateTime()}</h4>
                    </div>
                    <div className={classes.totalPower}>
                        <h3 className={classes.nameDetail}>Current performance on site</h3>
                        <div className={classes.powerTree} style={{ position: 'relative', minHeight: 380 }}>
                            <div className={classes.powerNodeTop} style={{ position: 'relative', zIndex: 2 }}>
                                <div className={classes.powerTotalBox}>
                                    <span className={classes.powerTotalValue}>{formatPower(safeTotals.totalPowerGenerated)}</span>
                                    <div className={classes.powerTotalLabel}>Total power generated</div>
                                </div>
                            </div>
                            {/* SVG lines and animated dots */}
                            <svg
                                className={classes.powerLinesSvg}
                                width="100%"
                                height="100%"
                                viewBox="0 0 100 100"
                                style={{
                                    position: 'absolute',
                                    top: 80,
                                    left: 0,
                                    pointerEvents: 'none',
                                    zIndex: 1,
                                }}
                                preserveAspectRatio="none"
                            >
                                {/* Left "7" line */}
                                <polyline
                                    points="45,20 17,20 17,80"
                                    fill="none"
                                    stroke="#00c9ff"
                                    strokeWidth="0.8"
                                    strokeLinecap="round"
                                />
                                {/* Animated dot on left line */}
                                <circle r="1" fill="#00c9ff">
                                    <animateMotion repeatCount="indefinite" dur="5s" path="M17,80 L17,20 L45,20" />
                                </circle>
                                {/* Center line */}
                                <line
                                    x1="50"
                                    y1="20"
                                    x2="50"
                                    y2="80"
                                    stroke="#ff7d70"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                />
                                {/* (Optional) Animated dot on center line */}
                                <circle r="1" fill="#ff7d70">
                                    <animateMotion repeatCount="indefinite" dur="5s" path="M50,80 L50,20" />
                                </circle>
                                {/* Right reverse-"7" line */}
                                <polyline
                                    points="47,20 83,20 83,80"
                                    fill="none"
                                    stroke="#00c9ff"
                                    strokeWidth="0.8"
                                    strokeLinecap="round"
                                />
                                {/* Animated dot on right line */}
                                <circle r="1" fill="#00c9ff">
                                    <animateMotion repeatCount="indefinite" dur="5s" path="M83,80 L83,20 L47,20" />
                                </circle>
                            </svg>
                            <div className={classes.powerNodeBottom} style={{ position: 'relative', zIndex: 2 }}>
                                <div className={classes.powerBox}>
                                    <PowerSupGeneratorIcon />
                                    <div className={classes.powerValue}>{formatPower(safeTotals.powerFromGenerator)}</div>
                                    <div className={classes.powerLabel}>Power from generator</div>
                                </div>
                                <div className={classes.powerBox}>
                                    <PowerSupSolarIcon />
                                    <div className={classes.powerValue}>{formatPower(safeTotals.powerFromSolar)}</div>
                                    <div className={classes.powerLabel}>Power from Solar</div>
                                </div>
                                <div className={classes.powerBox}>
                                    <PowerSupGridIcon />
                                    <div className={classes.powerValue}>{formatPower(safeTotals.powerFromGrid)}</div>
                                    <div className={classes.powerLabel}>Power from grid</div>
                                </div>
                            </div>
                        </div>
                        <div className={classes.powerFooter}>
                            <span className={classes.powerPercent}>{Math.floor(safeTotals.PercentagePowerSuppliedBySolar)}%</span>
                            <span className={classes.powerFooterLabel}>Power supplied by solar</span>
                        </div>
                    </div>
                    <div className={`${classes.totalEnergy} `}>
                        <div className="js-energy-production "
                            data-asset-id="f46d9c41-f495-473a-855c-c99ec5b4e74a">
                            <div className={classes.flexRow}>
                                <p className={classes.nameDetail}>Select a day to view</p>
                                <CustomDateRangePicker />
                                <ButtonFlexible
                                    className="btn"
                                    // onClick={handleRefresh}
                                    width={90}
                                    height={45}
                                    style={{
                                        marginLeft: 10,
                                    }}
                                    link="#"
                                >
                                    Refresh
                                </ButtonFlexible>
                            </div>
                            <div className="js-details-container h-md-80">
                                <div className={classes.totalEnergyBox}>
                                    <span className={classes.nameDetail}>Total energy produced</span>
                                    <span className={classes.totalEnergyText}>{toStringCapacity(totals.totalEnergyProduced)}</span>
                                </div>
                                <div className="p-0 mt-2 mt-md-0 col-md-7 ">
                                    <ProgressBarChartComponent
                                        progressData={progressData}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Live Data Charts */}
            <div className={classes.chartsSection}>
                <h2 className={classes.chartsSectionTitle}>Live Data Charts</h2>

                {/* Power Sources — always shown */}
                <div className={classes.chartBlock}>
                    <PowerLineChart initialData={powerData} assetId={asset_id} />
                </div>

                {/* Battery + Genset row — conditional, side by side when both present */}
                {(hasBattery || hasGenset) && (
                    <div className={hasBattery && hasGenset ? classes.chartsRow : classes.chartBlock}>
                        {hasBattery && (
                            <BatteryChart initialData={batteryData} assetId={asset_id} />
                        )}
                        {hasGenset && (
                            <GensetChart initialData={powerData} assetId={asset_id} />
                        )}
                    </div>
                )}

                {/* Performance Chart — always shown */}
                <div className={classes.chartBlock}>
                    <PerformanceLineChart initialData={kpiData} assetId={asset_id} />
                </div>
            </div>

            <CopyRight />
        </div>
    );
}
