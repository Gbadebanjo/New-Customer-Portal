'use client';

import { useState, useCallback } from 'react';
import FullScreenLoader from '@/components/ui/Loader/PageLoader';
import classes from './alertsTable.module.css';
import getAssetAlerts from '@/lib/controllers/alerts/getAssetAlerts';

const STATUS_FILTERS = ['All', 'Error', 'Warning', 'OK'];

function formatTimestamp(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

function getDefaultDateFrom() {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return d.toISOString().slice(0, 16);
}

function getDefaultDateTo() {
    return new Date().toISOString().slice(0, 16);
}

export default function AlertsTable({ assets, isCustomerOnly }) {
    const [selectedAsset, setSelectedAsset] = useState('');
    const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
    const [dateTo, setDateTo] = useState(getDefaultDateTo());
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
    const [activeFilter, setActiveFilter] = useState('All');

    const handleLoad = useCallback(async () => {
        if (!selectedAsset) {
            setStatusMsg({ text: 'Please select an asset.', type: 'error' });
            return;
        }
        if (!dateFrom || !dateTo) {
            setStatusMsg({ text: 'Please set both date range values.', type: 'error' });
            return;
        }
        if (new Date(dateFrom) >= new Date(dateTo)) {
            setStatusMsg({ text: 'Date From must be before Date To.', type: 'error' });
            return;
        }

        setLoading(true);
        setStatusMsg({ text: '', type: '' });
        setAlerts([]);
        setLoaded(false);

        try {
            const { alerts: data, error } = await getAssetAlerts(
                selectedAsset,
                new Date(dateFrom).toISOString(),
                new Date(dateTo).toISOString()
            );

            if (error) {
                setStatusMsg({ text: error, type: 'error' });
            } else {
                setAlerts(data || []);
                setLoaded(true);
                setActiveFilter('All');
                if ((data || []).length === 0) {
                    setStatusMsg({ text: 'No alerts found for the selected period.', type: 'success' });
                }
            }
        } catch {
            setStatusMsg({ text: 'An unexpected error occurred.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [selectedAsset, dateFrom, dateTo]);

    const errorCount = alerts.filter(a => a.status_level === 'Error').length;
    const warnCount = alerts.filter(a => a.status_level === 'Warning').length;
    const okCount = alerts.filter(a => a.status_level === 'OK').length;

    const filtered = activeFilter === 'All'
        ? alerts
        : alerts.filter(a => a.status_level === activeFilter);

    const selectedAssetObj = assets.find(a => a.asset_id === selectedAsset);

    return (
        <div className={classes.container}>
            {loading && <FullScreenLoader />}
            {/* Controls */}
            <div className={classes.controls}>
                <div className={classes.controlGroup}>
                    <label className={classes.label}>Asset</label>
                    <select
                        className={classes.select}
                        value={selectedAsset}
                        onChange={e => setSelectedAsset(e.target.value)}
                    >
                        <option value=''>— Select asset —</option>
                        {assets.map(asset => (
                            <option key={asset.asset_id} value={asset.asset_id}>
                                {asset.long_name || asset.asset_name} ({asset.asset_name})
                            </option>
                        ))}
                    </select>
                </div>

                <div className={classes.controlGroup}>
                    <label className={classes.label}>Date From</label>
                    <input
                        type='datetime-local'
                        className={classes.dateInput}
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                    />
                </div>

                <div className={classes.controlGroup}>
                    <label className={classes.label}>Date To</label>
                    <input
                        type='datetime-local'
                        className={classes.dateInput}
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                    />
                </div>

                <div className={classes.controlGroup} style={{ justifyContent: 'flex-end' }}>
                    <label className={classes.label}>&nbsp;</label>
                    <button
                        className={classes.loadBtn}
                        onClick={handleLoad}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className={classes.spinnerRow}>
                                <span className={classes.spinner} />
                                Loading…
                            </span>
                        ) : 'Load Alerts'}
                    </button>
                </div>
            </div>

            {/* Status message */}
            {statusMsg.text && (
                <div className={`${classes.statusMsg} ${statusMsg.type === 'error' ? classes.error : classes.success}`}>
                    {statusMsg.text}
                </div>
            )}

            {/* Summary cards — shown after load */}
            {loaded && alerts.length > 0 && (
                <>
                    <div className={classes.assetMeta}>
                        {selectedAssetObj && (
                            <span>
                                <strong>{selectedAssetObj.long_name || selectedAssetObj.asset_name}</strong>
                                &nbsp;·&nbsp;
                                {selectedAssetObj.place}, {selectedAssetObj.region}
                            </span>
                        )}
                    </div>

                    <div className={classes.summaryCards}>
                        <div className={`${classes.card} ${classes.cardError}`}>
                            <span className={classes.cardCount}>{errorCount}</span>
                            <span className={classes.cardLabel}>Errors</span>
                        </div>
                        <div className={`${classes.card} ${classes.cardWarn}`}>
                            <span className={classes.cardCount}>{warnCount}</span>
                            <span className={classes.cardLabel}>Warnings</span>
                        </div>
                        <div className={`${classes.card} ${classes.cardOk}`}>
                            <span className={classes.cardCount}>{okCount}</span>
                            <span className={classes.cardLabel}>OK</span>
                        </div>
                        <div className={`${classes.card} ${classes.cardTotal}`}>
                            <span className={classes.cardCount}>{alerts.length}</span>
                            <span className={classes.cardLabel}>Total</span>
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className={classes.filterTabs}>
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f}
                                className={`${classes.filterTab} ${activeFilter === f ? classes.filterTabActive : ''} ${f === 'Error' ? classes.tabError : f === 'Warning' ? classes.tabWarn : f === 'OK' ? classes.tabOk : ''}`}
                                onClick={() => setActiveFilter(f)}
                            >
                                {f}
                                {f !== 'All' && (
                                    <span className={classes.tabBadge}>
                                        {f === 'Error' ? errorCount : f === 'Warning' ? warnCount : okCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Table */}
            {loaded && (
                <div className={classes.tableWrapper}>
                    {filtered.length === 0 ? (
                        <div className={classes.noData}>No {activeFilter !== 'All' ? activeFilter : ''} alerts to display.</div>
                    ) : (
                        <table className={classes.table}>
                            <thead>
                                <tr>
                                    <th className={classes.th}>Timestamp</th>
                                    <th className={classes.th}>Alert</th>
                                    <th className={classes.th}>Device</th>
                                    <th className={classes.th}>Status</th>
                                    <th className={classes.th}>Provider</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((alert, idx) => (
                                    <tr
                                        key={`${alert.alert_id}-${alert.timestamp}-${idx}`}
                                        className={`${classes.tr} ${alert.status_level === 'Error' ? classes.rowError : alert.status_level === 'Warning' ? classes.rowWarn : classes.rowOk}`}
                                    >
                                        <td className={classes.td}>
                                            <span className={classes.timestamp}>{formatTimestamp(alert.timestamp)}</span>
                                        </td>
                                        <td className={classes.td}>
                                            <span className={classes.alertContent}>{alert.content}</span>
                                        </td>
                                        <td className={classes.td}>
                                            <div className={classes.deviceCell}>
                                                <span className={classes.deviceName}>{alert.device_name}</span>
                                                {alert.serial_no && (
                                                    <span className={classes.serialNo}>SN: {alert.serial_no}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={classes.td}>
                                            <span className={`${classes.badge} ${alert.status_level === 'Error' ? classes.badgeError : alert.status_level === 'Warning' ? classes.badgeWarn : classes.badgeOk}`}>
                                                {alert.status_level === 'Error' && <span className={classes.dot} />}
                                                {alert.status_level === 'Warning' && <span className={classes.dotWarn} />}
                                                {alert.status_level === 'OK' && <span className={classes.dotOk} />}
                                                {alert.status_level}
                                            </span>
                                        </td>
                                        <td className={classes.td}>
                                            <span className={classes.provider}>{alert.data_provider}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {!loaded && !loading && (
                <div className={classes.emptyState}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={classes.emptyIcon}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    <p>Select an asset and date range, then click <strong>Load Alerts</strong>.</p>
                </div>
            )}
        </div>
    );
}
