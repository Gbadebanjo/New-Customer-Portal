import classes from '../assetDetails.module.css';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import PowerLineChart from '@/components/ui/charts/PowerLineChart';

export default async function PowerChartBlock({ assetId, token }) {
    let powerData = null;
    if (token && assetId) {
        const now = new Date();
        const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        powerData = await AmmpServices().getHistoricAssetPowerData(token, assetId, last24hStart, now, '15m');
    }
    return (
        <div className={classes.chartBlock}>
            <PowerLineChart initialData={powerData} assetId={assetId} />
        </div>
    );
}

export function ChartBlockSkeleton({ label = 'Loading chart…' }) {
    return (
        <div className={classes.chartBlock} style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'var(--ds-text-hint)', fontSize: '0.85rem' }}>{label}</div>
        </div>
    );
}
