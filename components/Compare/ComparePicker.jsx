'use client';
import { useState, useMemo, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import classes from './compare.module.css';

const WINDOW_OPTIONS = [
    { days: 7,  label: 'Last 7 days' },
    { days: 30, label: 'Last 30 days' },
    { days: 90, label: 'Last 90 days' },
];

/**
 * Multi-select site picker + timeframe dropdown. On submit, pushes the
 * chosen IDs to the URL so the server component re-renders with fresh data.
 */
export default function ComparePicker({ assets, selectedIds, windowDays }) {
    const router = useRouter();
    const [picked, setPicked] = useState(new Set(selectedIds || []));
    const [days, setDays] = useState(windowDays || 7);
    // useTransition gives us a router-navigation-aware pending flag that flips
    // back to false automatically once the server finishes streaming the new
    // page — no manual reset needed.
    const [isPending, startTransition] = useTransition();

    // If the URL changes (back/forward, or a fresh submit) resync the local
    // selection so the checkboxes match what's actually being displayed.
    useEffect(() => {
        setPicked(new Set(selectedIds || []));
    }, [selectedIds]);
    useEffect(() => {
        setDays(windowDays || 7);
    }, [windowDays]);

    const toggle = (id) => {
        setPicked((prev) => {
            const next = new Set(prev);
            const key = String(id);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Compare current selection to the URL's selection so we know whether
    // "Apply" would actually change anything. Prevents the button reading
    // as loading after the user has already loaded exactly this set.
    const currentSelection = useMemo(() => new Set(selectedIds || []), [selectedIds]);
    const isSameAsUrl = useMemo(() => {
        if (picked.size !== currentSelection.size) return false;
        for (const id of picked) if (!currentSelection.has(id)) return false;
        return days === (windowDays || 7);
    }, [picked, currentSelection, days, windowDays]);

    const canApply = picked.size >= 2 && picked.size <= 8 && !isSameAsUrl;

    const orderedAssets = useMemo(() => {
        return [...assets].sort((a, b) => {
            const aPicked = picked.has(String(a.asset_id)) ? 0 : 1;
            const bPicked = picked.has(String(b.asset_id)) ? 0 : 1;
            if (aPicked !== bPicked) return aPicked - bPicked;
            return (a.long_name || '').localeCompare(b.long_name || '');
        });
    }, [assets, picked]);

    const handleApply = () => {
        if (!canApply) return;
        const sitesParam = [...picked].join(',');
        // Wrap in startTransition — router.push then flips isPending true
        // during the server round-trip and back to false when done.
        startTransition(() => {
            router.push(`/dashboard/compare?sites=${encodeURIComponent(sitesParam)}&days=${days}`);
        });
    };

    return (
        <div className={classes.pickerCard}>
            <div className={classes.pickerHeader}>
                <div>
                    <div className={classes.pickerTitle}>
                        Sites{' '}
                        <InfoTooltip title="Choosing sites" placement="bottom">
                            Tick the sites you want to compare. Two is the minimum; eight is the max
                            (any more and the bars get hard to read). Your current pick moves to the
                            top of the list so it&rsquo;s easy to see what you&rsquo;ve selected.
                        </InfoTooltip>
                    </div>
                    <div className={classes.pickerHint}>Pick 2–8 sites</div>
                </div>
                <label className={classes.pickerControl}>
                    <span className={classes.pickerHint} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Window{' '}
                        <InfoTooltip title="Time window" placement="bottom">
                            How far back to look. All figures on the page (solar produced, CO<sub>2</sub>{' '}
                            avoided, solar share) are aggregated across the same window so every site
                            is compared on equal footing.
                        </InfoTooltip>
                    </span>
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className={classes.select}
                    >
                        {WINDOW_OPTIONS.map((o) => (
                            <option key={o.days} value={o.days}>{o.label}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className={classes.pickerGrid}>
                {orderedAssets.map((a) => {
                    const id = String(a.asset_id);
                    const selected = picked.has(id);
                    return (
                        <label key={id} className={`${classes.pickerRow} ${selected ? classes.pickerRowActive : ''}`}>
                            <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggle(id)}
                                disabled={!selected && picked.size >= 8}
                            />
                            <span>{a.long_name || a.asset_name || `Site ${id.slice(0, 6)}`}</span>
                        </label>
                    );
                })}
            </div>

            <div className={classes.pickerFooter}>
                <button
                    className={classes.applyBtn}
                    disabled={!canApply || isPending}
                    onClick={handleApply}
                >
                    {isPending
                        ? 'Loading…'
                        : (isSameAsUrl && picked.size >= 2 ? 'Showing selected' : 'Compare selected')}
                </button>
                {picked.size > 8 && (
                    <span className={classes.pickerWarn}>Max 8 sites at a time.</span>
                )}
            </div>
        </div>
    );
}
