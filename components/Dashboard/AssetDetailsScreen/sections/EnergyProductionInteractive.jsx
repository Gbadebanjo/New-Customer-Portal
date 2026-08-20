'use client';
import { useState, useTransition } from 'react';
import classes from '../assetDetails.module.css';
import CustomDateRangePicker from '@/components/ui/dateRangePicker/CustomDateRangePicker';
import ProgressBarChartComponent from '@/components/ui/charts/ProgressBarChartComponent';
import { toStringEnergy } from '@/utils/constants';
import { getEnergyForRange } from '@/lib/controllers/energy/getEnergyForRange';

/**
 * Client component for the Energy Production block. Manages the date range
 * state, calls the server action to re-fetch energy data on Refresh, and
 * updates the progress bar + total in place.
 *
 * Props:
 *   assetId          string       — which site to query
 *   initialTotals    object|null  — first-render values (from server)
 *   initialFrom      Date         — starting range start (defaults to 7 days ago)
 *   initialTo        Date         — starting range end   (defaults to today)
 */
export default function EnergyProductionInteractive({
    assetId,
    initialTotals,
    initialFrom,
    initialTo,
}) {
    const [range, setRange] = useState({ from: initialFrom ?? null, to: initialTo ?? null });
    const [totals, setTotals] = useState(initialTotals);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleDateChange = (from, to) => {
        setRange({ from, to });
        setError('');
    };

    const handleRefresh = () => {
        if (!range.from || !range.to) {
            setError('Pick a start and end date first.');
            return;
        }
        setError('');
        startTransition(async () => {
            const result = await getEnergyForRange(
                assetId,
                new Date(range.from).toISOString(),
                new Date(range.to).toISOString(),
            );
            if (!result) {
                setError('Could not load energy for that range.');
                return;
            }
            setTotals(result);
        });
    };

    const progressData = {
        energyFromSolar: totals?.energyFromSolar ?? 0,
        energyFromGenerator: totals?.energyFromGenerator ?? 0,
        energyFromGrid: totals?.energyFromGrid ?? 0,
    };

    return (
        <div className={`${classes.totalEnergy} `}>
            <div className="js-energy-production" data-asset-id={assetId}>
                <div className={classes.flexRow}>
                    <p className={classes.nameDetail}>Select a day to view</p>
                    <CustomDateRangePicker onChange={handleDateChange} />
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isPending}
                        style={{
                            marginLeft: 10,
                            width: 110,
                            height: 45,
                            padding: '0 16px',
                            background: isPending ? 'var(--ds-border)' : 'var(--ds-accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--ds-radius-md)',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: isPending ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            transition: 'background 0.15s',
                        }}
                    >
                        {isPending ? 'Loading…' : 'Refresh'}
                    </button>
                </div>
                {error && (
                    <div style={{
                        marginTop: 8,
                        color: 'var(--ds-accent)',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                    }}>
                        {error}
                    </div>
                )}
                <div className="js-details-container h-md-80" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                    <div className={classes.totalEnergyBox}>
                        <span className={classes.nameDetail}>Total energy produced</span>
                        <span className={classes.totalEnergyText}>{toStringEnergy(totals?.totalEnergyProduced ?? 0)}</span>
                    </div>
                    <div className="p-0 mt-2 mt-md-0 col-md-7 ">
                        <ProgressBarChartComponent progressData={progressData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
