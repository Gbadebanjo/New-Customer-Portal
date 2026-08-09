/**
 * Serialize an array of row objects to a CSV string.
 *
 * @param {Array<Object>} rows            The data rows.
 * @param {Array<{header:string, get:(row)=>any}>} columns
 *   Which columns to include and how to extract each value. `get(row)`
 *   should return a primitive (string/number/boolean) or a Date; nulls
 *   become empty cells.
 * @returns {string} CSV text with a header line and CRLF line endings.
 */
export function rowsToCsv(rows, columns) {
    const escape = (val) => {
        if (val == null) return '';
        if (val instanceof Date) return val.toISOString();
        const s = String(val).replace(/"/g, '""');
        return /[",\r\n]/.test(s) ? `"${s}"` : s;
    };

    const headerLine = columns.map((c) => escape(c.header)).join(',');
    const bodyLines = rows.map((row) =>
        columns.map((c) => escape(c.get(row))).join(',')
    );
    // Prepend the UTF-8 BOM so Excel opens non-ASCII characters correctly.
    return '﻿' + [headerLine, ...bodyLines].join('\r\n');
}

/**
 * Trigger a browser download of a CSV file.
 *
 * @param {string} csv       The CSV string (see rowsToCsv).
 * @param {string} filename  Filename to save as (without extension).
 */
export function downloadCsv(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Build a filename-safe timestamp suffix, e.g. "20260723-1104" for
 * appending to export filenames.
 */
export function timestampSuffix(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
