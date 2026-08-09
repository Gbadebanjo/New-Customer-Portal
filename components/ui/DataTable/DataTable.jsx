'use client';
import { useEffect, useMemo, useState } from 'react';
import { FaSearch, FaDownload } from 'react-icons/fa';
import PaginationComponent from '@/components/ui/pagination/PaginationComponent';
import { rowsToCsv, downloadCsv, timestampSuffix } from '@/utils/csv';
import classes from './dataTable.module.css';

/**
 * Reusable data table with two modes:
 *
 *   1. CLIENT mode (default) — pass `data`; the table filters and paginates
 *      it internally based on `searchFields`, `pageSize`, etc.
 *
 *   2. SERVER mode — set `serverMode` and pass controlled state:
 *      `page`, `totalRows`, `onPageChange`, `searchValue`, `onSearchChange`, etc.
 *      The table renders `data` as-is (which is the already-paginated page).
 *
 * Props:
 *   data              array
 *   columns           { header, accessor?, cell? }[]
 *   getRowKey         (row) => key
 *   searchable        boolean, defaults true
 *   searchPlaceholder string
 *   searchFields      accessor keys OR (row, term) => boolean  (client mode only)
 *   pageSize          initial rows per page in client mode, or current size in server mode
 *   emptyMessage      shown when no data
 *   loading           boolean, shows skeleton rows
 *
 *   // Server mode
 *   serverMode        boolean
 *   page              1-indexed current page
 *   totalRows         total number of rows on the server
 *   onPageChange      (page) => void
 *   onPageSizeChange  (size) => void
 *   searchValue       controlled search string
 *   onSearchChange    (value) => void
 *
 *   // Extra filter UI slot (rendered inline in the search area)
 *   extraFilters      ReactNode
 *
 *   // CSV export
 *   exportable        boolean. Client mode: defaults true. Server mode: defaults false.
 *   exportFilename    string. Used as the download filename (a timestamp is
 *                     appended automatically). Defaults to "export".
 *   exportColumns     optional override — array of { header, accessor?|get? }
 *                     for the CSV. Falls back to `columns`, using their
 *                     `accessor` field. Columns with a custom `cell` renderer
 *                     but no `accessor` / `get` are skipped in the fallback.
 */
export default function DataTable({
    data = [],
    columns = [],
    getRowKey = (row) => row?.id,
    searchable = true,
    searchPlaceholder = 'Search',
    searchFields,
    pageSize = 10,
    emptyMessage = 'No data available',
    loading = false,
    // Server-mode props
    serverMode = false,
    page,
    totalRows,
    onPageChange,
    onPageSizeChange,
    searchValue,
    onSearchChange,
    extraFilters,
    // Export props
    exportable,
    exportFilename = 'export',
    exportColumns,
    // Bulk selection — opt-in. When bulkActions is passed, a checkbox column
    // is added and a floating action bar appears whenever anything is
    // selected. `bulkActions` is an array of { label, run(ids), variant? }.
    bulkActions,
}) {
    const bulkEnabled = Array.isArray(bulkActions) && bulkActions.length > 0;
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [busyAction, setBusyAction] = useState(null);
    const [bulkMsg, setBulkMsg] = useState('');
    const [bulkErr, setBulkErr] = useState('');
    // ── Internal state (only used in client mode) ────────────────────────
    const [internalSearch, setInternalSearch] = useState('');
    const [internalPage, setInternalPage] = useState(1);
    const [internalPageSize, setInternalPageSize] = useState(pageSize);

    // ── Effective values ─────────────────────────────────────────────────
    const effectiveSearch = searchValue != null ? searchValue : internalSearch;
    const effectivePage = serverMode && page != null ? page : internalPage;
    const effectivePageSize = serverMode ? pageSize : internalPageSize;
    const setSearch = (v) => {
        onSearchChange ? onSearchChange(v) : setInternalSearch(v);
    };
    const setPage = (p) => {
        serverMode && onPageChange ? onPageChange(p) : setInternalPage(p);
    };
    const setPageSize = (n) => {
        if (serverMode && onPageSizeChange) onPageSizeChange(n);
        else setInternalPageSize(n);
    };

    // ── Client-mode filtering ────────────────────────────────────────────
    const filteredData = useMemo(() => {
        if (serverMode) return data;
        if (!searchable || !effectiveSearch) return data;
        const term = effectiveSearch.toLowerCase();
        if (typeof searchFields === 'function') {
            return data.filter((row) => searchFields(row, term));
        }
        const fields = Array.isArray(searchFields) && searchFields.length
            ? searchFields
            : columns.map((c) => c.accessor).filter(Boolean);
        return data.filter((row) =>
            fields.some((f) => String(row?.[f] ?? '').toLowerCase().includes(term))
        );
    }, [data, columns, searchable, searchFields, effectiveSearch, serverMode]);

    const totalEntries = serverMode ? (totalRows ?? 0) : filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / effectivePageSize));
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const displayedData = serverMode
        ? data
        : filteredData.slice(startIndex, startIndex + effectivePageSize);

    // Reset page 1 when search / pageSize changes in client mode
    useEffect(() => {
        if (!serverMode) setInternalPage(1);
    }, [internalSearch, internalPageSize, serverMode]);

    // Whenever the filtered data changes, prune stale ids from the selection.
    useEffect(() => {
        if (!bulkEnabled) return;
        setSelectedIds((prev) => {
            const validIds = new Set(filteredData.map((r) => getRowKey(r)));
            const next = new Set([...prev].filter((id) => validIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [filteredData, bulkEnabled, getRowKey]);

    const displayedIds = useMemo(() => displayedData.map((r) => getRowKey(r)), [displayedData, getRowKey]);
    const allShownSelected = displayedIds.length > 0 && displayedIds.every((id) => selectedIds.has(id));
    const someShownSelected = displayedIds.some((id) => selectedIds.has(id));

    const toggleRow = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllShown = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allShownSelected) displayedIds.forEach((id) => next.delete(id));
            else displayedIds.forEach((id) => next.add(id));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const runBulk = async (action) => {
        setBulkMsg(''); setBulkErr('');
        setBusyAction(action.label);
        try {
            const ids = [...selectedIds];
            const res = await action.run(ids);
            if (res?.ok === false) {
                setBulkErr(res.error || `${action.label} failed`);
            } else {
                setBulkMsg(`${action.label} — ${ids.length} row${ids.length === 1 ? '' : 's'}.`);
                clearSelection();
            }
        } catch (err) {
            setBulkErr(err?.message || `${action.label} failed`);
        } finally {
            setBusyAction(null);
        }
    };

    // Default: enable export in client mode, opt-in for server mode.
    const canExport = exportable != null ? exportable : !serverMode;

    const handleExport = () => {
        // Prefer explicit exportColumns; otherwise infer from the visible
        // columns, keeping the ones with an accessor (skip pure custom cells
        // like action buttons, since they don't serialize well).
        const cols = (exportColumns ?? columns)
            .map((c) => {
                if (typeof c.get === 'function') return { header: c.header, get: c.get };
                if (c.accessor) return { header: c.header, get: (row) => row?.[c.accessor] };
                return null;
            })
            .filter(Boolean);

        if (cols.length === 0) return;
        // Export the filtered (client-mode) rows, or whatever page is loaded
        // (server-mode).
        const rowsToExport = serverMode ? data : filteredData;
        const csv = rowsToCsv(rowsToExport, cols);
        downloadCsv(csv, `${exportFilename}-${timestampSuffix()}`);
    };

    return (
        <div className={classes.wrapper}>
            {(searchable || extraFilters || canExport) && (
                <div className={classes.searchArea}>
                    {searchable && (
                        <div className={classes.searchGroup}>
                            <FaSearch className={classes.searchIcon} size={14} />
                            <input
                                type="text"
                                className={classes.searchInput}
                                placeholder={searchPlaceholder}
                                value={effectiveSearch}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label={searchPlaceholder}
                            />
                        </div>
                    )}
                    {extraFilters}
                    {canExport && (
                        <button
                            type="button"
                            className={classes.exportBtn}
                            onClick={handleExport}
                            title={serverMode
                                ? 'Download the current page as CSV'
                                : 'Download all filtered rows as CSV'}
                            disabled={loading || totalEntries === 0}
                        >
                            <FaDownload size={12} />
                            Export CSV
                        </button>
                    )}
                </div>
            )}

            {bulkEnabled && selectedIds.size > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    padding: '8px 12px', margin: '8px 0',
                    background: 'rgba(255, 125, 112, 0.10)',
                    border: '1px solid rgba(255, 125, 112, 0.35)',
                    borderRadius: 8,
                    color: 'var(--ds-text)',
                    fontSize: '0.85rem',
                }}>
                    <span><strong>{selectedIds.size}</strong> selected</span>
                    {bulkActions.map((action) => (
                        <button
                            key={action.label}
                            type="button"
                            onClick={() => runBulk(action)}
                            disabled={busyAction === action.label}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                border: `1px solid ${action.variant === 'danger' ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.15)'}`,
                                background: action.variant === 'danger' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                                color: action.variant === 'danger' ? '#ef4444' : 'var(--ds-text)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {busyAction === action.label ? `${action.label}…` : action.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={clearSelection}
                        style={{
                            padding: '5px 10px',
                            marginLeft: 'auto',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--ds-text-hint)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                        }}
                    >
                        Clear
                    </button>
                    {(bulkMsg || bulkErr) && (
                        <span style={{ color: bulkErr ? '#ef4444' : '#4caf50', fontSize: '0.78rem', width: '100%' }}>
                            {bulkErr || bulkMsg}
                        </span>
                    )}
                </div>
            )}

            <div className={classes.tableWrapper}>
                <table className={classes.table}>
                    <thead>
                        <tr>
                            {bulkEnabled && (
                                <th style={{ width: 40 }}>
                                    <input
                                        type="checkbox"
                                        checked={allShownSelected}
                                        ref={(el) => { if (el) el.indeterminate = !allShownSelected && someShownSelected; }}
                                        onChange={toggleAllShown}
                                        aria-label="Select all rows on this page"
                                    />
                                </th>
                            )}
                            {columns.map((col, i) => (
                                <th key={col.header || i}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, ri) => (
                                <tr key={`skel-${ri}`}>
                                    {bulkEnabled && <td />}
                                    {columns.map((col, ci) => (
                                        <td key={ci}>
                                            <div style={{
                                                height: 14,
                                                borderRadius: 4,
                                                background: 'rgba(255,255,255,0.06)',
                                            }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : displayedData.length > 0 ? (
                            displayedData.map((row, ri) => {
                                const id = getRowKey(row);
                                return (
                                    <tr key={id ?? ri}>
                                        {bulkEnabled && (
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(id)}
                                                    onChange={() => toggleRow(id)}
                                                    aria-label="Select row"
                                                />
                                            </td>
                                        )}
                                        {columns.map((col, ci) => (
                                            <td key={col.header || ci}>
                                                {col.cell ? col.cell(row) : row?.[col.accessor] ?? ''}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr className={classes.emptyRow}>
                                <td colSpan={columns.length + (bulkEnabled ? 1 : 0)}>{emptyMessage}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className={classes.paginationWrapper}>
                <PaginationComponent
                    currentPage={effectivePage}
                    length={totalPages}
                    onPageChange={setPage}
                    onClick={() => setPage(Math.max(1, effectivePage - 1))}
                    onClick1={() => setPage(Math.min(totalPages, effectivePage + 1))}
                    itemsPerPage={effectivePageSize}
                    setItemsPerPage={setPageSize}
                    totalEntries={totalEntries}
                />
            </div>
        </div>
    );
}
