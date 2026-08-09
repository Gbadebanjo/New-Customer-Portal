import classes from '../assetDetails.module.css';
import AmmpServices from '@/lib/services/ammp/AmmpServices';
import PerformanceLineChart from '@/components/ui/charts/PerformanceLineChart';

export default async function PerformanceChartBlock({ assetId, token }) {
    let kpiData = null;
    if (token && assetId) {
        const now = new Date();
        const weekAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
        kpiData = await AmmpServices().getHistoricKpiData(token, assetId, weekAgo, now, '1h');
    }
    return (
        <div className={classes.chartBlock}>
            <PerformanceLineChart initialData={kpiData} assetId={assetId} />
        </div>
    );
}
