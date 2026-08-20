// Display-layer helper for the `client_ip_address` column that both
// security_logs and audit_logs surface. The raw value stored in the DB
// is accurate (what the Node HTTP server sees on the socket) but
// unhelpful to read: local development requests come through as the
// IPv6 loopback `::1`, and IPv4-over-IPv6 addresses arrive prefixed
// with `::ffff:`. This helper normalises them for the table view
// without touching the underlying data.

const LOOPBACK = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1', '0:0:0:0:0:0:0:1']);

export function formatIpAddress(raw) {
    if (raw == null) return '—';
    const s = String(raw).trim();
    if (!s || s === 'unknown') return '—';
    if (LOOPBACK.has(s)) return 'localhost';
    // IPv4-mapped IPv6: `::ffff:203.0.113.42` → `203.0.113.42`
    if (s.startsWith('::ffff:')) return s.slice(7);
    return s;
}
