import classes from '../assetDetails.module.css';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import BatteryChart from '@/components/ui/charts/BatteryChart';
import GensetChart from '@/components/ui/charts/GensetChart';

/**
 * Conditional battery + genset charts. First fetches the device list to
 * decide which sub-charts to render, then fetches battery data only if the
 * site actually has a battery. Power data is reused for the genset chart.
 */
export default async function DeviceChartsBlock({ assetId, token }) {
    if (!token || !assetId) return null;

    const devicesRaw = await AmmpServices().getAssetDevices(token, assetId);
    const devices = Array.isArray(devicesRaw) ? devicesRaw : (devicesRaw?.devices ?? []);
    const hasBattery = devices.some((d) => d.device_type === 'battery-system');
    const hasGenset = devices.some((d) => d.device_type === 'genset');

    if (!hasBattery && !hasGenset) return null;

    const now = new Date();
    const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [batteryData, powerData] = await Promise.all([
        hasBattery
            ? AmmpServices().getHistoricBatteryData(token, assetId, last24hStart, now, '15m')
            : Promise.resolve(null),
        hasGenset
            ? AmmpServices().getHistoricAssetPowerData(token, assetId, last24hStart, now, '15m')
            : Promise.resolve(null),
    ]);

    return (
        <div className={hasBattery && hasGenset ? classes.chartsRow : classes.chartBlock}>
            {hasBattery && <BatteryChart initialData={batteryData} assetId={assetId} />}
            {hasGenset && <GensetChart initialData={powerData} assetId={assetId} />}
        </div>
    );
}
