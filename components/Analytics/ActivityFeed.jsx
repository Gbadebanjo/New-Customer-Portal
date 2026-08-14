'use client';
import { useState, useTransition } from 'react';
import { getRecentActivity } from '@/lib/controllers/analytics/getRecentActivity';
import classes from './analytics.module.css';

const KIND_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'security', label: 'Security' },
    { id: 'audit', label: 'Audit' },
    { id: 'cron', label: 'System' },
    { id: 'notification', label: 'Alerts' },
];

function relTime(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const diff = Date.now() - t;
    if (diff < 60_000) return 'just now';
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

function outcomeDot(outcome) {
    const c = outcome === 'failed' ? '#ef4444'
        : outcome === 'running' ? '#60a5fa'
        : outcome === 'info' ? '#f4a742'
        : '#4caf50';
    return <span className={classes.feedDot} style={{ background: c }} />;
}

function kindPill(kind) {
    const map = {
        audit:        { label: 'Audit',    bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
        security:     { label: 'Security', bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
        cron:         { label: 'System',   bg: 'rgba(255,152,0,0.12)',  color: '#ff9800' },
        notification: { label: 'Alert',    bg: 'rgba(255,125,112,0.12)',color: '#ff7d70' },
    };
    const c = map[kind] || { label: kind, bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)' };
    return (
        <span className={classes.feedPill} style={{ background: c.bg, color: c.color }}>
            {c.label}
        </span>
    );
}

// Client-side owner of the merged activity feed. Server pre-loads the
// first page; this component owns filter/search/load-more.
export default function ActivityFeed({ initial }) {
    const [kind, setKind] = useState('all');
    const [search, setSearch] = useState('');
    const [events, setEvents] = useState(initial.events);
    const [hasMore, setHasMore] = useState(initial.hasMore);
    const [offset, setOffset] = useState(initial.events.length);
    const [pending, startTransition] = useTransition();

    const reload = (nextKind, nextSearch) => {
        startTransition(async () => {
            const res = await getRecentActivity({
                kind: nextKind,
                search: nextSearch,
                limit: 25,
                offset: 0,
            });
            setEvents(res.events);
            setHasMore(res.hasMore);
            setOffset(res.events.length);
        });
    };

    const loadMore = () => {
        startTransition(async () => {
            const res = await getRecentActivity({
                kind,
                search,
                limit: 25,
                offset,
            });
            setEvents((prev) => [...prev, ...res.events]);
            setHasMore(res.hasMore);
            setOffset(offset + res.events.length);
        });
    };

    return (
        <div className={classes.trendCard}>
            <div className={classes.feedControls}>
                <div className={classes.feedChips}>
                    {KIND_FILTERS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            className={`${classes.feedChip} ${kind === f.id ? classes.feedChipActive : ''}`}
                            onClick={() => { setKind(f.id); reload(f.id, search); }}
                            disabled={pending}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') reload(kind, search); }}
                    onBlur={() => reload(kind, search)}
                    placeholder="Search title / user / IP…"
                    className={classes.feedSearch}
                    disabled={pending}
                />
            </div>

            {events.length === 0 ? (
                <div className={classes.emptyRow}>{pending ? 'Loading…' : 'No activity matches these filters.'}</div>
            ) : (
                <ul className={classes.feedList}>
                    {events.map((e) => (
                        <li key={e.id} className={classes.feedItem}>
                            {outcomeDot(e.outcome)}
                            <div className={classes.feedBody}>
                                <div className={classes.feedHeader}>
                                    {kindPill(e.kind)}
                                    <strong className={classes.feedTitle}>{e.title}</strong>
                                    <span className={classes.feedTime}>{relTime(e.at)}</span>
                                </div>
                                {e.subtitle && <div className={classes.feedSubtitle}>{e.subtitle}</div>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {hasMore && (
                <button
                    type="button"
                    className={classes.loadMoreBtn}
                    onClick={loadMore}
                    disabled={pending}
                >
                    {pending ? 'Loading…' : 'Load more'}
                </button>
            )}
        </div>
    );
}
