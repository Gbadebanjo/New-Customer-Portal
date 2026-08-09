'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import classes from './autoRefresh.module.css';

/**
 * Displays how long since the parent server-rendered data was fetched, and
 * lets the user trigger a fresh fetch (or does it automatically at a fixed
 * interval). Works by calling `router.refresh()` on a server component tree.
 *
 * Props:
 *   intervalMs   how often to auto-refresh in ms. Pass 0 to disable auto. Default 60000 (60s).
 *   label        label for the manual refresh button. Default "Refresh".
 */
export default function AutoRefresh({ intervalMs = 60_000, label = 'Refresh' }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [lastAt, setLastAt] = useState(() => Date.now());
    const [tick, setTick] = useState(0);
    const timer = useRef(null);

    const refresh = useCallback(() => {
        startTransition(() => {
            router.refresh();
            setLastAt(Date.now());
        });
    }, [router]);

    // Auto-refresh on interval
    useEffect(() => {
        if (!intervalMs) return;
        const id = setInterval(refresh, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs, refresh]);

    // Re-render the "X ago" label every 10s so it stays fresh even when
    // the page hasn't refreshed yet.
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 10_000);
        return () => clearInterval(id);
    }, []);

    const ageSeconds = Math.floor((Date.now() - lastAt) / 1000);
    const ageLabel = ageSeconds < 5
        ? 'just now'
        : ageSeconds < 60
            ? `${ageSeconds}s ago`
            : ageSeconds < 3600
                ? `${Math.floor(ageSeconds / 60)} min ago`
                : `${Math.floor(ageSeconds / 3600)}h ago`;

    return (
        <span className={classes.wrapper}>
            <span className={classes.age}>Data as of {ageLabel}</span>
            <button
                type="button"
                className={classes.button}
                onClick={refresh}
                disabled={isPending}
                aria-label={label}
            >
                {isPending ? (
                    <>
                        <span className={classes.spinner} />
                        Refreshing…
                    </>
                ) : (
                    <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                            <polyline points="21 3 21 8 16 8" />
                        </svg>
                        {label}
                    </>
                )}
            </button>
        </span>
    );
}
