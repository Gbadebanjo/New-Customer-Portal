'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import classes from './analytics.module.css';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Awaiting send' },
    { id: 'sent', label: 'Sent' },
];

function formatWhen(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(Math.abs(diff) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 48) return `${hrs}h ago`;
    return d.toLocaleDateString();
}

function statusPill(status) {
    const map = {
        pending: { bg: 'rgba(96,165,250,0.14)', bd: 'rgba(96,165,250,0.4)', fg: '#60a5fa', label: 'Awaiting send' },
        sent:    { bg: 'rgba(76,175,80,0.14)',  bd: 'rgba(76,175,80,0.4)',  fg: '#4caf50', label: 'Sent' },
    };
    const c = map[status] || map.pending;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '2px 10px', borderRadius: 999,
            fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
            background: c.bg, border: `1px solid ${c.bd}`, color: c.fg,
        }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.fg }} />
            {c.label}
        </span>
    );
}

/**
 * Reports-management table for admin surfaces. Rows are the
 * (site, month, year) tuples returned by `getReportManagement` — each
 * one links straight through to the report screen so the admin can
 * review or Send.
 */
export default function ReportsManagement({ items, totals }) {
    // Default to `all` so the table isn't hidden on first paint just
    // because nothing is currently in `in_progress` — an admin arriving
    // fresh should immediately see sent + raw sites too.
    const [activeFilter, setActiveFilter] = useState('all');
    // Period filter — value shape is `year-month` (1-based month), or
    // the sentinel `all` for "any period". Defaults to the most recent
    // period present in the data (typically the current month).
    const periodOptions = useMemo(() => {
        const seen = new Set();
        for (const it of items) {
            if (it.year && it.month) seen.add(`${it.year}-${it.month}`);
        }
        return Array.from(seen)
            .map((key) => {
                const [y, m] = key.split('-').map(Number);
                return { key, year: y, month: m };
            })
            // Newest first — put current month at the top of the dropdown.
            .sort((a, b) => (b.year - a.year) || (b.month - a.month));
    }, [items]);
    const [activePeriod, setActivePeriod] = useState(() =>
        periodOptions.length > 0 ? periodOptions[0].key : 'all'
    );

    const filtered = useMemo(() => {
        let list = items;
        if (activePeriod !== 'all') {
            const [y, m] = activePeriod.split('-').map(Number);
            list = list.filter((it) => it.year === y && it.month === m);
        }
        if (activeFilter !== 'all') {
            list = list.filter((it) => it.status === activeFilter);
        }
        return list;
    }, [items, activePeriod, activeFilter]);

    return (
        <div className={classes.trendCard}>
            <div className={classes.feedControls}>
                <div className={classes.feedChips}>
                    {FILTERS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            className={`${classes.feedChip} ${activeFilter === f.id ? classes.feedChipActive : ''}`}
                            onClick={() => setActiveFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <select
                        value={activePeriod}
                        onChange={(e) => setActivePeriod(e.target.value)}
                        className={classes.periodSelect}
                        aria-label="Filter by period"
                    >
                        <option value="all">All periods</option>
                        {periodOptions.map((p) => (
                            <option key={p.key} value={p.key}>
                                {MONTHS[(p.month || 1) - 1]} {p.year}
                            </option>
                        ))}
                    </select>
                    <div className={classes.statLabel}>
                        {totals?.pendingSites ?? 0} awaiting send · {totals?.sentSites ?? 0} sent
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className={classes.emptyRow}>
                    {items.length === 0
                        ? 'No reports in progress or sent yet — save a report to start tracking.'
                        : 'No reports match the current filters. Try widening the period or the status.'}
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr>
                                <th style={cellHead}>Site</th>
                                <th style={cellHead}>Client</th>
                                <th style={cellHead}>Period</th>
                                <th style={cellHeadCenter}>In progress</th>
                                <th style={cellHeadCenter}>Sent</th>
                                <th style={cellHeadCenter}>Status</th>
                                <th style={cellHead}>Last activity</th>
                                <th style={cellHeadNum}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((it) => {
                                const params = new URLSearchParams({
                                    site: String(it.siteId),
                                    month: String(it.month),
                                    year: String(it.year),
                                });
                                if (it.customerId) params.set('customer', String(it.customerId));
                                const href = `/reports?${params.toString()}`;
                                // Prefer the short site code (asset_name);
                                // fall back to long name, then to the raw
                                // UUID as a last resort.
                                const siteLabel = it.siteCode || it.siteName || it.siteId;
                                const clientLabel = it.customerName || (it.customerId ? '(unresolved)' : '—');
                                return (
                                    <tr key={`${it.siteId}-${it.year}-${it.month}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={cell}>
                                            <span style={{ fontWeight: 600, color: '#e1e7ed' }}>{siteLabel}</span>
                                            {it.siteName && it.siteCode && it.siteName !== it.siteCode && (
                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{it.siteName}</div>
                                            )}
                                        </td>
                                        <td style={{ ...cell, color: it.customerName ? '#e1e7ed' : '#7c8796' }}>
                                            {clientLabel}
                                        </td>
                                        <td style={cell}>{MONTHS[(it.month || 1) - 1]} {it.year}</td>
                                        <td style={cellCenterNum}>{it.inProgress || '—'}</td>
                                        <td style={cellCenterNum}>{it.verified || '—'}</td>
                                        <td style={cellCenter}>{statusPill(it.status)}</td>
                                        <td style={{ ...cell, color: '#94a3b8', fontSize: '0.78rem' }}>{formatWhen(it.lastActivity)}</td>
                                        <td style={cellNum}>
                                            <Link
                                                href={href}
                                                style={{
                                                    color: '#ff9770', fontSize: '0.78rem',
                                                    textDecoration: 'none', fontWeight: 600,
                                                    padding: '4px 10px', borderRadius: 6,
                                                    border: '1px solid rgba(255,125,112,0.35)',
                                                    background: 'rgba(255,125,112,0.08)',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                View →
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const cellHead = {
    textAlign: 'left', padding: '10px 8px',
    color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem',
    textTransform: 'uppercase', letterSpacing: 0.5,
    fontWeight: 700, whiteSpace: 'nowrap',
};
const cellHeadNum = { ...cellHead, textAlign: 'right' };
const cellHeadCenter = { ...cellHead, textAlign: 'center' };
const cell = { padding: '10px 8px', color: '#e1e7ed', verticalAlign: 'middle' };
const cellNum = { ...cell, textAlign: 'right', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.85rem' };
const cellCenter = { ...cell, textAlign: 'center' };
const cellCenterNum = { ...cellNum, textAlign: 'center' };
