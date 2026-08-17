import classes from './cronHealth.module.css';
import PageHeader from '@/components/ui/PageHeader/PageHeader';
import CopyRight from '@/components/ui/CopyRight/copyright';
import { getCronHealth } from '@/lib/controllers/cronRuns/getCronHealth';
import CronCard from './CronCard';

export default async function CronHealthScreen() {
    const { crons } = await getCronHealth();

    // Roll up the last-run status of each job so the header can show a
    // one-line summary — matches the counts-chip pattern on API Keys /
    // Text Templates so admin screens read as one system.
    const totals = crons.reduce(
        (acc, c) => {
            const s = c.lastRun?.status;
            if (s === 'ok') acc.healthy += 1;
            else if (s === 'failed') acc.failing += 1;
            else if (s === 'running') acc.running += 1;
            else acc.neverRun += 1;
            return acc;
        },
        { healthy: 0, failing: 0, running: 0, neverRun: 0 }
    );

    return (
        <div className={classes.content}>
            <PageHeader crumbs={['Admin', 'Cron health']} />

            <header className={classes.pageHeader}>
                <div className={classes.pageHeaderRow}>
                    <h1 className={classes.title}>Background jobs</h1>
                </div>
                <p className={classes.subtitle}>
                    Every scheduled task on the portal, its last run, and how you can trigger one manually.
                </p>
            </header>

            <div className={classes.actionsBar}>
                <div className={classes.countsSummary}>
                    <span className={classes.countChip}>
                        <strong>{crons.length}</strong> job{crons.length === 1 ? '' : 's'}
                    </span>
                    {totals.healthy > 0 && (
                        <span className={classes.countChipHealthy}>
                            <strong>{totals.healthy}</strong> healthy
                        </span>
                    )}
                    {totals.failing > 0 && (
                        <span className={classes.countChipFailing}>
                            <strong>{totals.failing}</strong> failing
                        </span>
                    )}
                    {totals.running > 0 && (
                        <span className={classes.countChipRunning}>
                            <strong>{totals.running}</strong> running
                        </span>
                    )}
                    {totals.neverRun > 0 && (
                        <span className={classes.countChipMuted}>
                            <strong>{totals.neverRun}</strong> never run
                        </span>
                    )}
                </div>
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
