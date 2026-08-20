'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import classes from './dataTable.module.css';
import modalClasses from '@/components/ui/modals/sharedModal.module.css';
import { FaSearch, FaEye, FaTimes } from 'react-icons/fa';
import { formatIpAddress } from '@/utils/formatIp';

const LIMIT = 20;

const ACTION_TYPES = [
    '', 'LoginSucceeded', 'LoginFailed', 'Logout',
    'PasswordChanged', 'PasswordResetRequested', 'PasswordReset',
    'TwoFactorEnabled', 'TwoFactorDisabled', 'AccountLocked',
];

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

function ActionBadge({ action }) {
    const isFailure = action?.toLowerCase().includes('fail') || action?.toLowerCase().includes('lock');
    const isSuccess = action?.toLowerCase().includes('succeed') || action?.toLowerCase().includes('success');
    const bg = isFailure ? '#3b1a1a' : isSuccess ? '#0e2e1e' : '#1c2a38';
    const color = isFailure ? '#ff7d70' : isSuccess ? '#4caf50' : '#60a5fa';
    return (
        <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 20,
            fontSize: '0.78rem', fontWeight: 600, background: bg, color,
        }}>
            {action || '—'}
        </span>
    );
}

export default function SecurityLogMainDataTable() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [selectedLog, setSelectedLog] = useState(null);
    const detailRef = useRef(null);

    const totalPages = Math.ceil(total / LIMIT);

    const fetchLogs = useCallback(async (p, q, action, from, to) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: LIMIT });
            if (q) params.set('q', q);
            if (action) params.set('action', action);
            if (from) params.set('dateFrom', from);
            if (to) params.set('dateTo', to);
            const res = await fetch(`/api/security-logs?${params}`);
            const json = await res.json();
            setRows(json.data ?? []);
            setTotal(json.total ?? 0);
        } catch {
            setRows([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs(page, search, actionFilter, dateFrom, dateTo);
    }, [fetchLogs, page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchLogs(1, search, actionFilter, dateFrom, dateTo);
    };

    const handleClear = () => {
        setSearch('');
        setActionFilter('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
        fetchLogs(1, '', '', '', '');
    };

    const openDetail = (log) => {
        setSelectedLog(log);
        detailRef.current?.showModal();
    };

    const closeDetail = () => {
        setSelectedLog(null);
        detailRef.current?.close();
    };

    return (
        <>
            {/* Filter bar */}
            <form onSubmit={handleSearch}>
                <div className={classes.searchArea} style={{ flexWrap: 'wrap', gap: 10 }}>
                    <div className={classes.searchTextInput} style={{ minWidth: 180, flex: 1 }}>
                        <input
                            type="text"
                            className={classes.inputText}
                            placeholder="Search user, IP, browser, app…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className={classes.inputText}
                        style={{ width: 200, flex: '0 0 auto' }}
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                    >
                        <option value="">All actions</option>
                        {ACTION_TYPES.filter(Boolean).map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        className={classes.inputText}
                        style={{ width: 160, flex: '0 0 auto' }}
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        title="From date"
                    />
                    <input
                        type="date"
                        className={classes.inputText}
                        style={{ width: 160, flex: '0 0 auto' }}
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        title="To date"
                    />
                    <button type="submit" style={{
                        width: 50, height: 50, background: '#ff7d70', border: 'none',
                        borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <FaSearch color="#fff" size={18} />
                    </button>
                    {(search || actionFilter || dateFrom || dateTo) && (
                        <button type="button" onClick={handleClear} style={{
                            width: 50, height: 50, background: '#1c384e', border: 'none',
                            borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <FaTimes color="#ff7d70" size={18} />
                        </button>
                    )}
                </div>
            </form>

            {/* Result count */}
            <div style={{ padding: '0 20px 10px', color: '#7c8796', fontSize: '0.9rem' }}>
                {loading ? 'Loading…' : `${total.toLocaleString()} record${total !== 1 ? 's' : ''} found`}
                {total > 0 && ` — page ${page} of ${totalPages}`}
            </div>

            {/* Table */}
            <div className={classes.mainContent}>
                <table className="table table-bordered" style={{ width: '100%', minWidth: 900 }}>
                    <thead>
                        <tr>
                            <th style={{ width: 60 }}></th>
                            <th>DATE / TIME</th>
                            <th>ACTION</th>
                            <th>USER</th>
                            <th>IP ADDRESS</th>
                            <th>BROWSER</th>
                            <th>APPLICATION</th>
                            <th>IDENTITY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 8 }).map((__, j) => (
                                        <td key={j}>
                                            <div style={{ height: 16, borderRadius: 4, background: '#1c384e', opacity: 0.6 }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#7c8796' }}>
                                    No security log records found
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <button
                                            onClick={() => openDetail(row)}
                                            title="View details"
                                            style={{
                                                background: '#1c384e', border: 'none', borderRadius: 6,
                                                width: 32, height: 32, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            <FaEye color="#ff7d70" size={14} />
                                        </button>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                                    <td><ActionBadge action={row.action} /></td>
                                    <td>{row.user_name || row.user_id || '—'}</td>
                                    <td>{formatIpAddress(row.client_ip_address)}</td>
                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.browser_info || '—'}
                                    </td>
                                    <td>{row.application_name || 'Daystar Customer Portal'}</td>
                                    <td>{row.identity || '—'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 20px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        style={{ padding: '6px 14px', background: '#1c384e', border: 'none', borderRadius: 6, color: '#e1e7ed', cursor: 'pointer' }}
                    >
                        ← Prev
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                        let p;
                        if (totalPages <= 7) p = i + 1;
                        else if (page <= 4) p = i + 1;
                        else if (page >= totalPages - 3) p = totalPages - 6 + i;
                        else p = page - 3 + i;
                        return (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                disabled={loading}
                                style={{
                                    padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                                    background: p === page ? '#ff7d70' : '#1c384e',
                                    color: p === page ? '#fff' : '#e1e7ed',
                                    fontWeight: p === page ? 700 : 400,
                                }}
                            >
                                {p}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || loading}
                        style={{ padding: '6px 14px', background: '#1c384e', border: 'none', borderRadius: 6, color: '#e1e7ed', cursor: 'pointer' }}
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Detail modal */}
            <dialog
                ref={detailRef}
                className={`modal ${modalClasses.modalLayout}`}
                onCancel={(e) => { e.preventDefault(); closeDetail(); }}
            >
                <div className={modalClasses.modalContainer} style={{ maxWidth: 700 }}>
                    <div className={modalClasses.popUpHeader}>
                        <h2 className="font-bold text-xl">Security Log Detail</h2>
                        <button onClick={closeDetail} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            <FaTimes color="#556372" size={22} />
                        </button>
                    </div>
                    {selectedLog && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 2rem' }}>
                            {[
                                ['Date / Time', formatDate(selectedLog.created_at)],
                                ['Action', selectedLog.action || '—'],
                                ['User Name', selectedLog.user_name || '—'],
                                ['User ID', selectedLog.user_id || '—'],
                                ['IP Address', formatIpAddress(selectedLog.client_ip_address)],
                                ['Browser', selectedLog.browser_info || '—'],
                                ['Application', selectedLog.application_name || 'Daystar Customer Portal'],
                                ['Identity', selectedLog.identity || '—'],
                                ['Tenant', selectedLog.tenant_name || '—'],
                                ['Client ID', selectedLog.client_id || '—'],
                                ['Correlation ID', selectedLog.correlation_id || '—'],
                                ['Sequence ID', selectedLog.sequence_id || '—'],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <div style={{ color: '#7c8796', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                                    <div style={{ color: '#e1e7ed', wordBreak: 'break-all' }}>{val}</div>
                                </div>
                            ))}
                            {selectedLog.extra_properties && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ color: '#7c8796', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Extra Properties</div>
                                    <pre style={{ background: '#0a1c2a', padding: '0.75rem', borderRadius: 6, color: '#e1e7ed', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {(() => { try { return JSON.stringify(JSON.parse(selectedLog.extra_properties), null, 2); } catch { return selectedLog.extra_properties; } })()}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={closeDetail} style={{
                            padding: '10px 24px', background: '#ff7d70', border: 'none', borderRadius: 8,
                            color: '#fff', fontWeight: 600, cursor: 'pointer',
                        }}>Close</button>
                    </div>
                </div>
            </dialog>
        </>
    );
}
