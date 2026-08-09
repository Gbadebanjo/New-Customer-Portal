'use client';
import { useEffect, useState } from 'react';
import classes from '../activeAssets/activeAssets.module.css';
import { toCommaAmount, toReadableMWh } from '@/utils/constants';

const KEY = 'daystar.kpi.snapshot';

/**
 * Reads the last known KPI totals from sessionStorage and renders them as
 * dimmed cards. Used as the Suspense fallback for KpiCardsSection so returning
 * users see their previous numbers immediately instead of a skeleton, then
 * the live data slides in behind.
 *
 * If there's no snapshot (first visit, private mode), renders the same
 * skeleton the original KpiCardsSkeleton drew — so nothing regresses.
 */
export default function KpiSnapshotHydrator() {
    // Synchronous read in useState initializer so the fallback paints right
    // away on the first render, with no flash-of-skeleton.
    const [snap] = useState(() => readSnapshot());

    if (!snap) return <RawSkeleton />;

    const dim = { opacity: 0.55, transition: 'opacity 0.15s' };
    return (
        <>
            <div className={classes.solar} style={dim}>
                <div className={classes.iconWrapper} />
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}>{toCommaAmount(toReadableMWh(snap.pv))} MWh</h2>
                    <h6 className={classes.cardSubtitle}>Solar production</h6>
                </div>
            </div>
            <div className={classes.co2} style={dim}>
                <div className={classes.iconWrapper} />
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}>{toCommaAmount(snap.co2)} kg</h2>
                    <p className={classes.cardSubtitle}>CO<sub>2</sub> Reduction</p>
                </div>
            </div>
            <div className={classes.trees} style={dim}>
                <div className={classes.iconWrapper} />
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}>{toCommaAmount(snap.trees)}</h2>
                    <p className={classes.cardSubtitle}>Trees saved</p>
                </div>
            </div>
            <div className={classes.diesel} style={dim}>
                <div className={classes.iconWrapper} />
                <div className={classes.cardBody}>
                    <h2 className={classes.cardTitle}>{toCommaAmount(snap.diesel)} L</h2>
                    <p className={classes.cardSubtitle}>Diesel avoided</p>
                </div>
            </div>
        </>
    );
}

/**
 * Small client-side effect that any real KpiCards render can call to persist
 * its current values. Kept next to the hydrator so the read/write shape stays
 * in sync in one file.
 */
export function useSaveKpiSnapshot(totals) {
    useEffect(() => {
        if (!totals) return;
        try {
            const snap = {
                pv:     Number(totals.TotalHistoricPvEnergy ?? 0),
                co2:    Number(totals.TotalCo2Reduction ?? 0),
                trees:  Number(totals.TotalTreesSaved ?? 0),
                diesel: Number(totals.TotalDieselLitresAvoided ?? 0),
                savedAt: Date.now(),
            };
            window.sessionStorage.setItem(KEY, JSON.stringify(snap));
        } catch { /* quota / disabled — silent */ }
    }, [totals]);
}

function readSnapshot() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Reject snapshots > 24h old — beyond that just show the skeleton.
        if (!parsed || Date.now() - (parsed.savedAt || 0) > 24 * 60 * 60 * 1000) return null;
        return parsed;
    } catch { return null; }
}

function RawSkeleton() {
    return (
        <>
            {['solar', 'co2', 'trees', 'diesel'].map((k) => (
                <div key={k} className={classes[k]}>
                    <div className={classes.iconWrapper} style={{ opacity: 0.4 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                    <div className={classes.cardBody} style={{ gap: 6 }}>
                        <div style={{ width: 80, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ width: 100, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                </div>
            ))}
        </>
    );
}
