'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getNotificationsSummary } from '@/lib/controllers/notifications/getNotificationsSummary';
import { markNotificationRead } from '@/lib/controllers/notifications/notificationActions';
import PortalMenu from '@/components/ui/PortalMenu/PortalMenu';
import classes from './notificationsBell.module.css';

// Poll interval: every 90 seconds. Cheap DB query, fine at this cadence.
const POLL_MS = 90_000;

function relativeTime(value) {
    if (!value) return '';
    const then = new Date(value).getTime();
    if (isNaN(then)) return '';
    const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function NotificationsBell() {
    const [open, setOpen] = useState(false);
    const [summary, setSummary] = useState({
        unresolvedTickets: 0,
        recent: [],
        offlineSites: [],
        dataUpdates: [],
        unreadDataUpdates: 0,
        providerAlerts: [],
        totalCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const triggerRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const data = await getNotificationsSummary();
            setSummary(data);
        } catch { /* stay silent — bell just won't tick */ }
        finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const id = setInterval(load, POLL_MS);
        return () => clearInterval(id);
    }, [load]);

    const totalCount = summary.totalCount ?? (
        summary.unresolvedTickets
        + (summary.offlineSites?.length ?? 0)
        + (summary.unreadDataUpdates ?? 0)
        + (summary.providerAlerts?.length ?? 0)
    );
    const displayCount = totalCount > 9 ? '9+' : String(totalCount);
    const hasNotification = totalCount > 0;

    return (
        <div className={classes.wrapper}>
            <button
                ref={triggerRef}
                type="button"
                className={`${classes.trigger} ${hasNotification ? classes.hasNotification : ''}`}
                onClick={() => setOpen((o) => !o)}
                aria-label={`Notifications (${totalCount} pending)`}
                aria-expanded={open}
                title={hasNotification ? `${totalCount} pending` : 'Notifications'}
            >
                <span className={classes.bellIcon}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </span>
                {hasNotification && (
                    <span className={classes.badge}>
                        <span className={classes.badgeNumber}>{displayCount}</span>
                    </span>
                )}
            </button>

            <PortalMenu isOpen={open} triggerRef={triggerRef} onClose={() => setOpen(false)}>
                <div className={classes.panel}>
                    <div className={classes.panelHeader}>
                        <h3 className={classes.panelTitle}>Notifications</h3>
                        <span className={classes.panelHint}>
                            {loading ? 'Loading…' : totalCount === 0 ? 'All clear' : `${totalCount} pending`}
                        </span>
                    </div>

                    {/* Data updates — report_ready etc. from notifications table */}
                    {summary.dataUpdates?.length > 0 && (
                        <>
                            <div className={classes.sectionHeader}>
                                <span>Data updates</span>
                                {summary.unreadDataUpdates > 0 && (
                                    <span className={classes.sectionCount}>{summary.unreadDataUpdates}</span>
                                )}
                            </div>
                            <ul className={classes.list}>
                                {summary.dataUpdates.map((n) => (
                                    <li key={n.id}>
                                        <Link
                                            className={classes.item}
                                            href={n.href || '/reports'}
                                            onClick={() => {
                                                setOpen(false);
                                                if (!n.read_at) markNotificationRead(n.id).catch(() => {});
                                            }}
                                            style={n.read_at ? { opacity: 0.7 } : undefined}
                                        >
                                            <div className={classes.itemTitle}>{n.title}</div>
                                            <div className={classes.itemMeta}>
                                                <span>{relativeTime(n.created_at)}</span>
                                                {n.body && <span style={{ opacity: 0.85 }}>{n.body}</span>}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {/* Real provider alerts (status-info-latest) — active
                        warnings/errors reported for a site by AMMP. */}
                    {summary.providerAlerts?.length > 0 && (
                        <>
                            <div className={classes.sectionHeader}>
                                <span>Site alerts</span>
                                <span className={classes.sectionCount}>{summary.providerAlerts.length}</span>
                            </div>
                            <ul className={classes.list}>
                                {summary.providerAlerts.map((a) => (
                                    <li key={a.id || `${a.siteId}-${a.timestamp}`}>
                                        <Link
                                            className={classes.item}
                                            href={`/Assets/Details/${a.siteId}`}
                                            onClick={() => setOpen(false)}
                                        >
                                            <div className={classes.itemTitle}>{a.siteName}</div>
                                            <div className={classes.itemMeta}>
                                                <span className={`${classes.statusPill} ${classes.statusPillDanger}`}>{a.level}</span>
                                                <span>{a.content}</span>
                                                <span>{relativeTime(a.timestamp)}</span>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {/* Sites needing attention */}
                    {summary.offlineSites?.length > 0 && (
                        <>
                            <div className={classes.sectionHeader}>
                                <span>Sites needing attention</span>
                                <span className={classes.sectionCount}>{summary.offlineSites.length}</span>
                            </div>
                            <ul className={classes.list}>
                                {summary.offlineSites.map((site) => (
                                    <li key={site.asset_id}>
                                        <Link
                                            className={classes.item}
                                            href={`/Assets/Details/${site.asset_id}`}
                                            onClick={() => setOpen(false)}
                                        >
                                            <div className={classes.itemTitle}>{site.name}</div>
                                            <div className={classes.itemMeta}>
                                                <span className={`${classes.statusPill} ${classes.statusPillDanger}`}>Offline</span>
                                                <span>Last heard {relativeTime(site.lastReceived)}</span>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {/* Support tickets */}
                    {(summary.recent.length > 0 || summary.offlineSites?.length === 0) && (
                        <>
                            {summary.offlineSites?.length > 0 && (
                                <div className={classes.sectionHeader}>
                                    <span>Support tickets</span>
                                    <span className={classes.sectionCount}>{summary.unresolvedTickets}</span>
                                </div>
                            )}
                            {summary.recent.length === 0 ? (
                                <div className={classes.empty}>
                                    {loading ? 'Loading…' : 'You have no unresolved support tickets.'}
                                </div>
                            ) : (
                                <ul className={classes.list}>
                                    {summary.recent.map((item) => (
                                        <li key={item.id}>
                                            <Link
                                                className={classes.item}
                                                href={`/support/details/${item.id}`}
                                                onClick={() => setOpen(false)}
                                            >
                                                <div className={classes.itemTitle}>{item.title}</div>
                                                <div className={classes.itemMeta}>
                                                    <span className={classes.statusPill}>{item.status}</span>
                                                    <span>Updated {relativeTime(item.updated_at)}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}

                    <div className={classes.footer}>
                        <Link
                            className={classes.footerLink}
                            href="/support"
                            onClick={() => setOpen(false)}
                        >
                            View all tickets →
                        </Link>
                    </div>
                </div>
            </PortalMenu>
        </div>
    );
}
