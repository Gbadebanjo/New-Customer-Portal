'use client'
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch } from 'react-icons/fa';
import PaginationComponent from '@/components/ui/pagination/PaginationComponent';

// Deterministic colour per user so avatars stay stable across renders.
function avatarBg(seed) {
    const palette = ['#ff7d70', '#4b7a9c', '#60a5fa', '#f59e0b', '#a855f7', '#10b981', '#f472b6', '#94a3b8'];
    let h = 0;
    for (let i = 0; i < (seed || '').length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    return palette[Math.abs(h) % palette.length];
}

function initialsFor(user) {
    const s = ((user.name?.[0] || '') + (user.surname?.[0] || '')).toUpperCase();
    if (s) return s;
    if (user.username) return user.username[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return 'U';
}

const ROLE_TONE = {
    'Admin':                    { label: 'Admin',           bg: 'rgba(255,125,112,0.18)', border: 'rgba(255,125,112,0.45)', color: '#ff9770' },
    'Daystar Portal Admin':     { label: 'Portal Admin',    bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.4)',  color: '#60a5fa' },
    'Daystar Customer Admin':   { label: 'DCA',             bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.4)',  color: '#c084fc' },
    'Customer':                 { label: 'Customer',        bg: 'rgba(76,175,80,0.14)',   border: 'rgba(76,175,80,0.4)',   color: '#4caf50' },
};

function primaryRoleTone(user) {
    const names = Array.isArray(user.roles) ? user.roles.map((r) => r?.name) : [];
    const priority = ['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin', 'Customer'];
    const picked = priority.find((n) => names.includes(n));
    return ROLE_TONE[picked] || { label: names[0] || 'No role', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', color: '#b0b7bd' };
}

function StatusChip({ label, tone }) {
    const tones = {
        good: { bg: 'rgba(76,175,80,0.14)',  color: '#4caf50' },
        bad:  { bg: 'rgba(248,113,113,0.14)', color: '#f87171' },
        warn: { bg: 'rgba(255,193,7,0.16)',   color: '#ffc107' },
    }[tone];
    return (
        <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 6,
            background: tones.bg, color: tones.color, whiteSpace: 'nowrap',
        }}>{label}</span>
    );
}

function relativeTime(iso) {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 30 * 86400) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const FILTERS = [
    { key: 'all',        label: 'All' },
    { key: 'admin',      label: 'Admins' },
    { key: 'dca',        label: 'DCA' },
    { key: 'customer',   label: 'Customer users' },
    { key: 'locked',     label: 'Locked' },
    { key: 'no2fa',      label: 'No 2FA' },
    { key: 'unverified', label: 'Unverified email' },
];

export default function UsersMainDataTable({ AllUsers, AllCustomers, /* eslint-disable-line no-unused-vars */ canWrite = true }) {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    // Aligns with PaginationComponent's dropdown options: [5, 10, 25, 50, 100].
    // Using a value outside that list would show correct rows but leave the
    // dropdown out of sync with the actual page size.
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [filter, setFilter] = useState('all');

    const customerLookup = useMemo(() => {
        const m = new Map();
        (AllCustomers || []).forEach((c) => m.set(c.id, c.company_name));
        return m;
    }, [AllCustomers]);

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return (AllUsers || []).filter((u) => {
            if (q) {
                const hay = [u.name, u.surname, u.email, u.username, u.phone_number, customerLookup.get(u.customer)]
                    .filter(Boolean).join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            const names = Array.isArray(u.roles) ? u.roles.map((r) => r?.name) : [];
            switch (filter) {
                case 'admin':      return names.includes('Admin') || names.includes('Daystar Portal Admin');
                case 'dca':        return names.includes('Daystar Customer Admin');
                case 'customer':   return names.includes('Customer');
                case 'locked':     return !!u.is_locked_out;
                case 'no2fa':      return !u.totp_enabled;
                case 'unverified': return !u.email_confirmed;
                default:           return true;
            }
        });
    }, [AllUsers, searchTerm, filter, customerLookup]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageSlice = filtered.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage, filter]);

    return (
        <>
            {/* Search + filters */}
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                <div style={{ position: 'relative', maxWidth: 480 }}>
                    <FaSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7c8796', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder="Search by name, email, phone, or customer…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', height: 44,
                            background: '#123751', border: '1px solid #1e3d55',
                            borderRadius: 10, color: '#e1e7ed', fontSize: 14,
                            padding: '0 14px 0 40px', outline: 'none',
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {FILTERS.map((f) => {
                        const active = filter === f.key;
                        return (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: '6px 14px', borderRadius: 999,
                                    fontSize: 12, fontWeight: 600, letterSpacing: 0.2,
                                    cursor: 'pointer',
                                    background: active ? 'rgba(255,125,112,0.16)' : 'transparent',
                                    color: active ? '#ff9770' : '#b0b7bd',
                                    border: `1px solid ${active ? 'rgba(255,125,112,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                }}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                    <div style={{ marginLeft: 'auto', color: '#7c8796', fontSize: 12, alignSelf: 'center' }}>
                        {filtered.length} of {AllUsers?.length || 0} users
                    </div>
                </div>
            </div>

            {/* User list — table layout with clickable rows */}
            {pageSlice.length === 0 ? (
                <div style={{
                    padding: '40px 20px', textAlign: 'center',
                    color: '#7c8796', fontSize: 14,
                    background: '#0a1c2a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    No users match this search.
                </div>
            ) : (
                <div style={{
                    background: '#0a1c2a',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <Th>User</Th>
                                    <Th>Role</Th>
                                    <Th>Customer</Th>
                                    <Th>Status</Th>
                                    <Th>Last updated</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageSlice.map((u, idx) => {
                                    const tone = primaryRoleTone(u);
                                    const displayName = [u.name, u.surname].filter(Boolean).join(' ') || u.username || '(no name)';
                                    const bg = avatarBg(u.id || u.email || u.username || '');
                                    const initials = initialsFor(u);
                                    const customerName = u.customer ? customerLookup.get(u.customer) : null;
                                    const nav = () => router.push(`/admin/identity/users/${u.id}`);
                                    const isLast = idx === pageSlice.length - 1;
                                    return (
                                        <tr
                                            key={u.id}
                                            onClick={nav}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') nav(); }}
                                            tabIndex={0}
                                            style={{
                                                cursor: 'pointer',
                                                borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,125,112,0.06)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {/* User cell */}
                                            <Td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                                        background: `${bg}22`, border: `2px solid ${bg}66`,
                                                        color: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 700, fontSize: 12,
                                                    }}>{initials}</div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{
                                                            color: '#fff', fontWeight: 500, fontSize: 13.5,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            maxWidth: 240,
                                                        }}>{displayName}</div>
                                                        <div style={{
                                                            color: '#b0b7bd', fontSize: 12, marginTop: 1,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            maxWidth: 240,
                                                        }}>{u.email}</div>
                                                    </div>
                                                </div>
                                            </Td>

                                            {/* Role pill */}
                                            <Td>
                                                <span style={{
                                                    fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
                                                    padding: '4px 10px', borderRadius: 999,
                                                    background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`,
                                                    whiteSpace: 'nowrap',
                                                }}>{tone.label}</span>
                                            </Td>

                                            {/* Customer */}
                                            <Td>
                                                <span style={{
                                                    color: customerName ? '#e1e7ed' : '#7c8796',
                                                    fontStyle: customerName ? 'normal' : 'italic',
                                                }}>{customerName || 'No customer'}</span>
                                            </Td>

                                            {/* Status chips */}
                                            <Td>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    {u.not_active
                                                        ? <StatusChip label="Inactive" tone="bad" />
                                                        : <StatusChip label="Active" tone="good" />}
                                                    {u.is_locked_out && <StatusChip label="Locked" tone="bad" />}
                                                    <StatusChip label={u.totp_enabled ? '2FA' : 'No 2FA'} tone={u.totp_enabled ? 'good' : 'warn'} />
                                                    {!u.email_confirmed && <StatusChip label="Unverified" tone="warn" />}
                                                    {(u.failed_login_attempts ?? 0) > 0 && (
                                                        <StatusChip label={`${u.failed_login_attempts} failed`} tone="warn" />
                                                    )}
                                                </div>
                                            </Td>

                                            {/* Last updated */}
                                            <Td>
                                                <span style={{ color: '#b0b7bd', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                    {relativeTime(u.updated_at || u.modification_time)}
                                                </span>
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 20 }}>
                <PaginationComponent
                    currentPage={currentPage}
                    length={totalPages}
                    totalEntries={filtered.length}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
                    onPageChange={setCurrentPage}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    onClick1={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                />
            </div>
        </>
    );
}

function Th({ children }) {
    return (
        <th style={{
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: '#7c8796',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>{children}</th>
    );
}

function Td({ children }) {
    return (
        <td style={{
            padding: '14px 16px',
            verticalAlign: 'middle',
        }}>{children}</td>
    );
}
