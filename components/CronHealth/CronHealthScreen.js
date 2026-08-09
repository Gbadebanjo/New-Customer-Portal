import classes from './cronHealth.module.css';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import CopyRight from '@/components/ui/CopyRight/copyright';
import { getCronHealth } from '@/lib/controllers/cronRuns/getCronHealth';
import CronCard from './CronCard';

export default async function CronHealthScreen() {
    const { crons } = await getCronHealth();

    return (
        <div className={classes.content}>
            <PageHeader crumbs={['Admin', 'Cron health']} />
            <div className={classes.topCenter}>
                <p className={classes.title}>Background jobs</p>
                <p className={classes.subtitle}>
                    Every scheduled task on the portal, its last run, and how you can trigger one manually.
                </p>
            </div>

            <div className={classes.centerContent}>
                {crons.map((cron) => (
                    <CronCard key={cron.kind} cron={cron} />
                ))}
            </div>

            <CopyRight />
        </div>
    );
}
