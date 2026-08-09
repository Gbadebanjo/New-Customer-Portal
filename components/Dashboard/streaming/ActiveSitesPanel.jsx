'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FaSearch, FaStar, FaRegStar } from 'react-icons/fa';
import classes from '../activeAssets/activeAssets.module.css';
import DataFreshness from '@/components/ui/DataFreshness/DataFreshness';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import { toStringCapacity } from '@/utils/constants';
import useFavoriteSites from '@/lib/hooks/useFavoriteSites';
import { deriveSiteType } from '@/lib/services/siteType/deriveSiteType';

// Small chip shown next to the site name identifying the product type
// (Solar / Hybrid / Battery site or the AMMP product label if we have one).
function TypeChip({ siteType }) {
    if (!siteType || siteType.kind === 'unknown') return null;
    const palette = siteType.kind === 'battery-only'
        ? { bg: 'rgba(244,167,66,0.12)', bd: 'rgba(244,167,66,0.35)', fg: '#f4a742' }
        : siteType.kind === 'hybrid'
            ? { bg: 'rgba(96,165,250,0.12)', bd: 'rgba(96,165,250,0.35)', fg: '#60a5fa' }
            : { bg: 'rgba(76,175,80,0.10)', bd: 'rgba(76,175,80,0.30)', fg: '#4caf50' };
    return (
        <span style={{
            display: 'inline-block',
            padding: '1px 8px',
            borderRadius: 999,
            background: palette.bg,
            border: `1px solid ${palette.bd}`,
            color: palette.fg,
            fontSize: '0.62rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            marginLeft: 6,
        }}>{siteType.displayLabel}</span>
    );
}

const SEARCH_MIN_SITES = 5;

/**
 * Active Sites panel — search + health rollup + site list. Receives assets
 * and the freshness lookup map from a Suspense-wrapped server parent.
 */
export default function ActiveSitesPanel({ assets = [], freshnessMap = {} }) {
    const [siteSearch, setSiteSearch] = useState('');
    const { isFavorite, toggle: toggleFavorite } = useFavoriteSites();
    const showSiteSearch = (assets?.length ?? 0) > SEARCH_MIN_SITES;

    // Filter by search, then stable-sort with favorites first.
    const filteredAssets = useMemo(() => {
        if (!Array.isArray(assets)) return [];
        const searched = (() => {
            if (!showSiteSearch) return assets;
            const term = siteSearch.trim().toLowerCase();
            if (!term) return assets;
            return assets.filter((a) =>
                (a.long_name ?? '').toLowerCase().includes(term)
                || (a.asset_name ?? '').toLowerCase().includes(term)
            );
        })();
        // Favorites bubble to the top; within each group original order kept.
        return [...searched].sort((a, b) => {
            const af = isFavorite(a.asset_id) ? 0 : 1;
            const bf = isFavorite(b.asset_id) ? 0 : 1;
            return af - bf;
        });
    }, [assets, siteSearch, showSiteSearch, isFavorite]);

    const now = Date.now();
    const health = { live: 0, delayed: 0, offline: 0, unknown: 0 };
    for (const asset of filteredAssets) {
        const ts = freshnessMap[asset.asset_id?.toString()];
        if (!ts) { health.unknown++; continue; }
        const d = new Date(ts);
        if (isNaN(d.getTime())) { health.unknown++; continue; }
        const ageMin = Math.max(0, Math.floor((now - d.getTime()) / 60000));
        if (ageMin <= 15) health.live++;
        else if (ageMin <= 60) health.delayed++;
        else health.offline++;
    }

    return (
        <div className={classes.rightSide}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                <h3 className={classes.rightSideDetails} style={{ margin: 0 }}>
                    {showSiteSearch && siteSearch
                        ? `${filteredAssets.length} of ${assets?.length ?? 0} site${assets?.length === 1 ? '' : 's'}`
                        : `${assets?.length ?? 0} site${assets?.length === 1 ? '' : 's'}`}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {assets.length >= 2 && (
                        <Link
                            href="/dashboard/compare"
                            style={{
                                fontSize: '0.75rem',
                                color: 'var(--ds-accent)',
                                textDecoration: 'none',
                                padding: '3px 10px',
                                borderRadius: 999,
                                border: '1px solid rgba(255,125,112,0.35)',
                                background: 'rgba(255,125,112,0.08)',
                            }}
                        >
                            Compare sites →
                        </Link>
                    )}
                    <InfoTooltip title="Site health rollup" placement="bottom">
                        A quick count of how your sites are reporting right now, based on when we last heard from each. <br /><br />
                        <strong>Healthy</strong> — heard within the last 15 minutes.<br />
                        <strong>Delayed</strong> — 15–60 minutes ago.<br />
                        <strong>Reconnecting</strong> — over an hour ago; our team monitors this automatically.<br />
                        <strong>No data yet</strong> — no timestamp available.
                    </InfoTooltip>
                </div>
            </div>
            {showSiteSearch && (
                <div style={{ position: 'relative', marginBottom: 12 }}>
                    <FaSearch size={12} style={{
                        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--ds-text-hint)', pointerEvents: 'none',
                    }} />
                    <input
                        type="text"
                        value={siteSearch}
                        onChange={(e) => setSiteSearch(e.target.value)}
                        placeholder="Search sites…"
                        aria-label="Search sites"
                        style={{
                            width: '100%', height: 36, background: 'rgba(0, 0, 0, 0.25)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 'var(--ds-radius-md)', color: 'var(--ds-text)',
                            fontSize: '0.85rem', padding: '0 32px 0 34px',
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                    {siteSearch && (
                        <button
                            type="button"
                            onClick={() => setSiteSearch('')}
                            aria-label="Clear search"
                            style={{
                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', color: 'var(--ds-text-hint)',
                                cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '2px 6px',
                            }}
                        >
                            ×
                        </button>
                    )}
                </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {[
                    { label: 'Healthy', count: health.live, color: 'var(--ds-success)', bg: 'rgba(76, 175, 80, 0.12)', border: 'rgba(76, 175, 80, 0.35)' },
                    { label: 'Delayed', count: health.delayed, color: '#ff9800', bg: 'rgba(255, 152, 0, 0.12)', border: 'rgba(255, 152, 0, 0.35)' },
                    { label: 'Reconnecting', count: health.offline, color: 'var(--ds-accent)', bg: 'rgba(255, 125, 112, 0.12)', border: 'rgba(255, 125, 112, 0.35)' },
                    ...(health.unknown > 0 ? [{ label: 'No data yet', count: health.unknown, color: 'var(--ds-text-hint)', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.12)' }] : []),
                ].map(({ label, count, color, bg, border }) => (
                    <span key={label} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem',
                        fontWeight: 600, letterSpacing: '0.02em',
                        background: bg, border: `1px solid ${border}`, color,
                        opacity: count === 0 ? 0.4 : 1,
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                        {count} {label}
                    </span>
                ))}
            </div>
            <div>
                {filteredAssets.length > 0 ? (
                    filteredAssets.map((asset) => {
                        const fav = isFavorite(asset.asset_id);
                        const siteType = deriveSiteType(asset);
                        // Only show "Solar capacity: X" on sites that actually
                        // have a PV array. Battery-only sites get a plain
                        // label instead of a blank field.
                        const capacityLine = siteType.hasSolar
                            ? `Solar capacity: ${toStringCapacity(asset.total_pv_power)}`
                            : 'No solar array on this site';
                        return (
                            <div key={asset.asset_id}>
                                <div className={classes.rightContainer}>
                                    <span style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
                                        <button
                                            type="button"
                                            onClick={() => toggleFavorite(asset.asset_id)}
                                            aria-label={fav ? 'Unstar site' : 'Star site'}
                                            title={fav ? 'Remove from favorites' : 'Add to favorites'}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 4,
                                                marginTop: 3,
                                                cursor: 'pointer',
                                                color: fav ? '#f4a742' : 'var(--ds-text-hint)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                transition: 'color 0.15s, transform 0.15s',
                                            }}
                                            onMouseEnter={(e) => { if (!fav) e.currentTarget.style.color = 'var(--ds-text)'; }}
                                            onMouseLeave={(e) => { if (!fav) e.currentTarget.style.color = 'var(--ds-text-hint)'; }}
                                        >
                                            {fav ? <FaStar size={14} /> : <FaRegStar size={14} />}
                                        </button>
                                        <span style={{ minWidth: 0 }}>
                                            <h3 className={classes.rightSideName}>
                                                {asset.long_name}
                                                <TypeChip siteType={siteType} />
                                            </h3>
                                            <p className={classes.rightSideDetails}>{capacityLine}</p>
                                            <div style={{ marginTop: 6 }}>
                                                <DataFreshness lastReceived={freshnessMap[asset.asset_id?.toString()]} />
                                            </div>
                                        </span>
                                    </span>
                                    <span>
                                        <Link className={classes.rightBtn} href={`/Assets/Details/${asset.asset_id}`}>View</Link>
                                    </span>
                                </div>
                                <hr />
                            </div>
                        );
                    })
                ) : assets?.length > 0 ? (
                    <div style={{
                        padding: '24px 8px', textAlign: 'center',
                        color: 'var(--ds-text-hint)', fontSize: '0.9rem',
                    }}>
                        No sites match &ldquo;{siteSearch}&rdquo;.
                        <div style={{ marginTop: 8 }}>
                            <button
                                type="button"
                                onClick={() => setSiteSearch('')}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--ds-accent)', cursor: 'pointer',
                                    fontSize: '0.85rem', fontWeight: 500, padding: 0,
                                }}
                            >
                                Clear search
                            </button>
                        </div>
                    </div>
                ) : (
                    <p>No active assets.</p>
                )}
            </div>
        </div>
    );
}

/**
 * Skeleton for the Active Sites panel while its freshness data loads.
 */
export function ActiveSitesPanelSkeleton({ assets = [] }) {
    // We can render the site names immediately (assets already came in from
    // the parent) — just show a small placeholder for the freshness badge.
    return (
        <div className={classes.rightSide}>
            <h3 className={classes.rightSideDetails} style={{ margin: '0 0 8px' }}>
                {assets.length} site{assets.length === 1 ? '' : 's'}
            </h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[0, 1, 2].map((k) => (
                    <div key={k} style={{ width: 70, height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
                ))}
            </div>
            {assets.map((asset) => {
                const hasSolar = typeof asset.total_pv_power === 'number' && asset.total_pv_power > 0;
                const capacityLine = hasSolar
                    ? `Solar capacity: ${toStringCapacity(asset.total_pv_power)}`
                    : 'No solar array on this site';
                return (
                    <div key={asset.asset_id}>
                        <div className={classes.rightContainer}>
                            <span>
                                <h3 className={classes.rightSideName}>{asset.long_name}</h3>
                                <p className={classes.rightSideDetails}>{capacityLine}</p>
                                <div style={{ marginTop: 6, width: 80, height: 20, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
                            </span>
                            <span>
                                <Link className={classes.rightBtn} href={`/Assets/Details/${asset.asset_id}`}>View</Link>
                            </span>
                        </div>
                        <hr />
                    </div>
                );
            })}
        </div>
    );
}
