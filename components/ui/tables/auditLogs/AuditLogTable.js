'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import classes from './dataTable.module.css';
import modalClasses from '@/components/ui/modals/sharedModal.module.css';
import { FaSearch, FaEye, FaTimes } from 'react-icons/fa';
import { formatIpAddress } from '@/utils/formatIp';

const LIMIT = 20;

function formatDate(val) {
    if (!val) return '—';
    return new Date(val).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

function StatusBadge({ value }) {
    const isError = value === 'true' || value === true;
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 20,
            fontSize: '0.78rem',
            fontWeight: 600,
            background: isError ? '#3b1a1a' : '#0e2e1e',
            color: isError ? '#ff7d70' : '#4caf50',
        }}>
            {isError ? 'Yes' : 'No'}
        </span>
    );
}

export default function AuditLogTable() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [selectedLog, setSelectedLog] = useState(null);
    const detailRef = useRef(null);

    const totalPages = Math.ceil(total / LIMIT);

    const fetchLogs = useCallback(async (p, q, from, to) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: LIMIT });
            if (q) params.set('q', q);
            if (from) params.set('dateFrom', from);
            if (to) params.set('dateTo', to);
            const res = await fetch(`/api/audit-logs?${params}`);
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
        fetchLogs(page, search, dateFrom, dateTo);
    }, [fetchLogs, page]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchLogs(1, search, dateFrom, dateTo);
    };

    const handleClear = () => {
        setSearch('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
        fetchLogs(1, '', '', '');
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
            {/* Search & filter bar */}
            <form onSubmit={handleSearch}>
                <div className={classes.searchArea} style={{ flexWrap: 'wrap', gap: 10 }}>
                    <div className={classes.searchTextInput} style={{ minWidth: 200, flex: 1 }}>
                        <input
                            type="text"
                            className={classes.inputText}
                            placeholder="Search user, URL, IP, correlation ID…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <input
                        type="date"
                        className={classes.inputText}
                        style={{ width: 170, flex: '0 0 auto' }}
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        title="From date"
                    />
                    <input
                        type="date"
                        className={classes.inputText}
                        style={{ width: 170, flex: '0 0 auto' }}
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        title="To date"
                    />
                    <button type="submit" className={classes.searchButton} style={{
                        width: 50, height: 50, background: '#ff7d70', border: 'none',
                        borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <FaSearch color="#fff" size={18} />
                    </button>
                    {(search || dateFrom || dateTo) && (
                        <button type="button" onClick={handleClear} style={{
                            width: 50, height: 50, background: '#1c384e', border: 'none',
                            borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
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
                            <th>USER</th>
                            <th>HTTP METHOD</th>
                            <th>URL</th>
                            <th>IP ADDRESS</th>
                            <th>DURATION (ms)</th>
                            <th>EXCEPTION</th>
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
                                    No audit log records found
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
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            <FaEye color="#ff7d70" size={14} />
                                        </button>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                                    <td>{row.user_name || '—'}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700,
                                            background: row.http_request === 'GET' ? '#0e2233' : row.http_request === 'POST' ? '#1a2e0e' : '#2e1a0e',
                                            color: row.http_request === 'GET' ? '#60a5fa' : row.http_request === 'POST' ? '#4caf50' : '#ff9800',
                                        }}>
                                            {row.http_request || '—'}
                                        </span>
                                    </td>
                                    <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {row.url || '—'}
                                    </td>
                                    <td>{formatIpAddress(row.client_ip_address)}</td>
                                    <td>{row.duration != null ? `${row.duration} ms` : '—'}</td>
                                    <td><StatusBadge value={row.has_exception} /></td>
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
                        <h2 className="font-bold text-xl">Audit Log Detail</h2>
                        <button onClick={closeDetail} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            <FaTimes color="#556372" size={22} />
                        </button>
                    </div>
                    {selectedLog && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 2rem' }}>
                            {[
                                ['Date / Time', formatDate(selectedLog.created_at)],
                                ['User', selectedLog.user_name || '—'],
                                ['HTTP Method', selectedLog.http_request || '—'],
                                ['URL', selectedLog.url || '—'],
                                ['IP Address', formatIpAddress(selectedLog.client_ip_address)],
                                ['Duration', selectedLog.duration != null ? `${selectedLog.duration} ms` : '—'],
                                ['Has Exception', selectedLog.has_exception === 'true' || selectedLog.has_exception === true ? 'Yes' : 'No'],
                                ['Correlation ID', selectedLog.correlation_id || '—'],
                                ['Sequence ID', selectedLog.sequence_id || '—'],
                                ['Name', selectedLog.name || '—'],
                                ['Application', 'Daystar Customer Portal'],
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
                            color: '#fff', fontWeight: 600, cursor: 'pointer'
                        }}>Close</button>
                    </div>
                </div>
            </dialog>
        </>
    );
}
