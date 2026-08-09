'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { globalSearch } from '@/lib/controllers/search/globalSearch';

// Static navigation shortcuts — always available. Everything else comes
// from a debounced server search.
const STATIC_ITEMS = [
    { id: 'nav:dashboard',      type: 'nav', title: 'Dashboard',        subtitle: 'Go to Dashboard',        href: '/dashboard' },
    { id: 'nav:support',        type: 'nav', title: 'Support',          subtitle: 'Go to Support',          href: '/support' },
    { id: 'nav:reports',        type: 'nav', title: 'Reports',          subtitle: 'Go to Reports',          href: '/reports' },
    { id: 'nav:planned',        type: 'nav', title: 'Planned vs Actual',subtitle: 'Go to Planned vs Actual',href: '/planned-vs-actual' },
    { id: 'nav:alerts',         type: 'nav', title: 'Alerts',           subtitle: 'Go to Alerts',           href: '/alerts' },
    { id: 'nav:compare',        type: 'nav', title: 'Compare sites',    subtitle: 'Go to Compare',          href: '/dashboard/compare' },
    { id: 'nav:profile',        type: 'nav', title: 'Profile',          subtitle: 'Go to My Profile',       href: '/profile' },
    { id: 'nav:analytics',      type: 'nav', title: 'Portal analytics', subtitle: 'Admin · Analytics',      href: '/admin/analytics' },
    { id: 'nav:cron-health',    type: 'nav', title: 'Cron health',      subtitle: 'Admin · Cron health',    href: '/admin/cron-health' },
    { id: 'nav:api-keys',       type: 'nav', title: 'API keys',         subtitle: 'Admin · API keys',       href: '/admin/api-keys' },
    { id: 'nav:audit-logs',     type: 'nav', title: 'Audit logs',       subtitle: 'Admin · Audit logs',     href: '/admin/audit-logs' },
    { id: 'nav:users',          type: 'nav', title: 'Users',            subtitle: 'Admin · Users',          href: '/admin/identity/users' },
    { id: 'nav:roles',          type: 'nav', title: 'Roles',            subtitle: 'Admin · Roles',          href: '/admin/identity/roles' },
    { id: 'nav:settings',       type: 'nav', title: 'Settings',         subtitle: 'Admin · Settings',       href: '/admin/settings' },
];

const TYPE_ICON = {
    nav:      '➜',
    ticket:   '🎫',
    customer: '🏢',
    user:     '👤',
};

/**
 * Command palette overlay. Opens on Cmd+K / Ctrl+K anywhere in the app.
 * Merges static navigation shortcuts with live server search over tickets,
 * customers, and users. Arrow keys + Enter navigate; Escape closes.
 */
export default function CommandPalette() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [remoteResults, setRemoteResults] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);

    // Cmd/Ctrl+K toggles the palette.
    useEffect(() => {
        const handle = (e) => {
            const cmdK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
            if (cmdK) {
                e.preventDefault();
                setOpen((o) => !o);
            } else if (e.key === 'Escape' && open) {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [open]);

    // Focus + reset when opened.
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 20);
        }
    }, [open]);

    // Debounced server search — 200 ms after the last keystroke.
    useEffect(() => {
        if (!open || query.trim().length < 2) {
            setRemoteResults([]);
            return;
        }
        const handle = setTimeout(() => {
            globalSearch(query).then((res) => {
                setRemoteResults(Array.isArray(res?.results) ? res.results : []);
            }).catch(() => setRemoteResults([]));
        }, 200);
        return () => clearTimeout(handle);
    }, [query, open]);

    // Merge static + remote, filter static by query for local matching.
    const items = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filteredStatic = !q
            ? STATIC_ITEMS
            : STATIC_ITEMS.filter((it) =>
                it.title.toLowerCase().includes(q) || it.subtitle.toLowerCase().includes(q));
        return [...filteredStatic, ...remoteResults];
    }, [query, remoteResults]);

    // Clamp activeIndex when items shrink.
    useEffect(() => { setActiveIndex(0); }, [items.length]);

    const handleKey = useCallback((e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(items.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = items[activeIndex];
            if (item?.href) {
                router.push(item.href);
                setOpen(false);
            }
        }
    }, [items, activeIndex, router]);

    if (typeof document === 'undefined') return null;
    if (!open) return null;

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '12vh',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
            <div style={{
                background: 'var(--ds-surface)',
                border: '1px solid var(--ds-border)',
                borderRadius: 12,
                width: 'min(600px, calc(100vw - 32px))',
                maxHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Jump to a page, ticket, customer, or user…"
                    aria-label="Command palette search"
                    style={{
                        padding: '14px 18px',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        color: 'var(--ds-text)',
                        fontSize: '1rem',
                        borderBottom: '1px solid var(--ds-border-subtle)',
                    }}
                />

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {items.length === 0 ? (
                        <div style={{ padding: '20px', color: 'var(--ds-text-hint)', fontSize: '0.9rem', textAlign: 'center' }}>
                            {query.trim().length < 2
                                ? 'Type at least 2 characters…'
                                : 'No matches.'}
                        </div>
                    ) : (
                        items.map((item, i) => (
                            <button
                                key={item.id}
                                type="button"
                                onMouseEnter={() => setActiveIndex(i)}
                                onClick={() => {
                                    if (item.href) {
                                        router.push(item.href);
                                        setOpen(false);
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    width: '100%',
                                    padding: '10px 18px',
                                    border: 'none',
                                    background: i === activeIndex ? 'rgba(255, 125, 112, 0.10)' : 'transparent',
                                    color: 'var(--ds-text)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                }}
                            >
                                <span style={{ width: 24, textAlign: 'center', color: 'var(--ds-text-hint)' }}>{TYPE_ICON[item.type] || '•'}</span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--ds-text-hint)' }}>{item.subtitle}</div>
                                </span>
                            </button>
                        ))
                    )}
                </div>

                <div style={{
                    padding: '8px 18px',
                    borderTop: '1px solid var(--ds-border-subtle)',
                    color: 'var(--ds-text-hint)',
                    fontSize: '0.72rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                }}>
                    <span>↑↓ navigate · ⏎ open · Esc close</span>
                    <span>{items.length} result{items.length === 1 ? '' : 's'}</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
