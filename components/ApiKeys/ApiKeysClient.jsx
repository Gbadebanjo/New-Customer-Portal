'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createApiKey, revokeApiKey, listApiKeys } from '@/lib/controllers/apiKeys/apiKeyActions';
import classes from './apiKeys.module.css';
import ConfirmModal from '@/components/ui/modals/customAlertModal/ConfirmModal';

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

function scopeLabel(row, customers) {
    if (row.scope === 'fleet') return 'Fleet-wide';
    const c = customers.find((c) => c.id === row.customerId);
    return c ? c.name : `Customer ${row.customerId?.slice(0, 8) || '?'}`;
}

export default function ApiKeysClient({ initialKeys, customers }) {
    const router = useRouter();
    const [keys, setKeys] = useState(initialKeys);
    const [creating, setCreating] = useState(false);
    const [modal, setModal] = useState(null); // { label, scope, customerId } | null
    const [reveal, setReveal] = useState(null); // { key, row } | null
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [pending, startTransition] = useTransition();
    // { id, label } while awaiting user confirmation to revoke.
    const [pendingRevoke, setPendingRevoke] = useState(null);

    const reload = () => {
        startTransition(async () => {
            const res = await listApiKeys();
            if (res?.ok) setKeys(res.keys);
        });
    };

    const openNew = () => {
        setMsg(''); setErr('');
        setModal({ label: '', scope: 'customer', customerId: customers[0]?.id || '' });
    };

    const submitNew = async () => {
        if (!modal) return;
        setErr(''); setMsg('');
        if (!modal.label.trim()) { setErr('Label is required'); return; }
        setCreating(true);
        try {
            const res = await createApiKey({
                label: modal.label,
                scope: modal.scope,
                customerId: modal.scope === 'customer' ? modal.customerId : null,
            });
            if (!res?.ok) {
                setErr(res?.error || 'Failed to create key');
                return;
            }
            setReveal({ key: res.key, row: res.row });
            setModal(null);
            reload();
        } finally { setCreating(false); }
    };

    const handleRevoke = (id, label) => {
        setPendingRevoke({ id, label });
    };

    const confirmRevoke = () => {
        const { id } = pendingRevoke || {};
        setPendingRevoke(null);
        if (!id) return;
        setMsg(''); setErr('');
        startTransition(async () => {
            const res = await revokeApiKey(id);
            if (res?.ok) {
                setMsg('Key revoked.');
                reload();
            } else {
                setErr(res?.error || 'Failed to revoke');
            }
        });
    };

    const copyKey = async (raw) => {
        try { await navigator.clipboard.writeText(raw); setMsg('Copied to clipboard.'); }
        catch { setErr('Could not copy — select and copy manually.'); }
    };

    // Build a ready-to-paste welcome message so the admin doesn't have to
    // remember what a consumer needs (key + docs URL + base URL + header).
    const buildWelcomeMessage = (raw) => {
        const origin = (typeof window !== 'undefined' && window.location?.origin) || 'https://portal.daystarpower.com';
        return [
            `Hi,`,
            ``,
            `Here's your Daystar Public Data API key. Please store it in your password manager — we can't recover it later.`,
            ``,
            `Key:         ${raw}`,
            `Auth header: x-daystar-api-key`,
            `Base URL:    ${origin}/api/public`,
            `Docs:        ${origin}/docs/api`,
            ``,
            `Reach out if you need help wiring it in — the docs page has cURL, Python and Power BI examples.`,
        ].join('\n');
    };

    const copyWelcome = async (raw) => {
        try {
            await navigator.clipboard.writeText(buildWelcomeMessage(raw));
            setMsg('Welcome message copied — paste into email/Slack.');
        } catch {
            setErr('Could not copy — select and copy manually.');
        }
    };

    const activeKeys = keys.filter((k) => !k.revokedAt);
    const revokedKeys = keys.filter((k) => k.revokedAt);

    return (
        <>
            <div className={classes.actionsBar}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    {activeKeys.length} active · {revokedKeys.length} revoked
                </div>
                <button type="button" className={classes.primaryBtn} onClick={openNew} disabled={pending}>
                    + Generate new key
                </button>
            </div>

            {(msg || err) && (
                <div style={{ margin: '8px 0', fontSize: '0.85rem', color: err ? '#ef4444' : '#4caf50' }}>
                    {err || msg}
                </div>
            )}

            <Section title="Active">
                {activeKeys.length === 0 ? (
                    <div className={classes.empty}>No active keys.</div>
                ) : (
                    <KeyTable rows={activeKeys} customers={customers} onRevoke={handleRevoke} />
                )}
            </Section>

            {revokedKeys.length > 0 && (
                <Section title="Revoked">
                    <KeyTable rows={revokedKeys} customers={customers} onRevoke={null} />
                </Section>
            )}

            {/* Generate modal */}
            {modal && (
                <div className={classes.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
                    <div className={classes.modal}>
                        <h3 className={classes.modalTitle}>Generate API key</h3>

                        <label className={classes.field}>
                            <span>Label</span>
                            <input
                                type="text"
                                value={modal.label}
                                onChange={(e) => setModal({ ...modal, label: e.target.value })}
                                placeholder="e.g. NBC production, Internal analytics pipeline"
                                maxLength={120}
                            />
                        </label>

                        <label className={classes.field}>
                            <span>Scope</span>
                            <select
                                value={modal.scope}
                                onChange={(e) => setModal({ ...modal, scope: e.target.value })}
                            >
                                <option value="customer">Customer-scoped (external — sees only this customer)</option>
                                <option value="fleet">Fleet-wide (internal use — sees every customer)</option>
                            </select>
                        </label>

                        {modal.scope === 'customer' && (
                            <label className={classes.field}>
                                <span>Customer</span>
                                <select
                                    value={modal.customerId}
                                    onChange={(e) => setModal({ ...modal, customerId: e.target.value })}
                                >
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {err && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 4 }}>{err}</div>}

                        <div className={classes.modalFooter}>
                            <button type="button" className={classes.ghostBtn} onClick={() => setModal(null)} disabled={creating}>
                                Cancel
                            </button>
                            <button type="button" className={classes.primaryBtn} onClick={submitNew} disabled={creating}>
                                {creating ? 'Generating…' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reveal modal — one-shot display of the raw key */}
            {reveal && (
                <div className={classes.modalOverlay}>
                    <div className={classes.modal}>
                        <h3 className={classes.modalTitle}>Copy the key now</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', margin: '0 0 12px' }}>
                            This is the only time you&rsquo;ll see it. If you lose it, generate a new one.
                        </p>
                        <div className={classes.keyDisplay}>
                            <code>{reveal.key}</code>
                            <button type="button" className={classes.smallBtn} onClick={() => copyKey(reveal.key)}>Copy key</button>
                        </div>
                        <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
                            Label: <strong>{reveal.row.label}</strong> · Scope: {reveal.row.scope === 'fleet' ? 'Fleet-wide' : `Customer ${reveal.row.customerId?.slice(0, 8) || ''}`}
                        </div>

                        <div style={{
                            marginTop: 14,
                            padding: '10px 12px',
                            background: 'rgba(96,165,250,0.06)',
                            border: '1px solid rgba(96,165,250,0.25)',
                            borderRadius: 8,
                            fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.75)',
                        }}>
                            Share this key with the consumer alongside the docs at{' '}
                            <a
                                href="/docs/api"
                                target="_blank"
                                rel="noopener"
                                style={{ color: '#60a5fa', textDecoration: 'underline' }}
                            >
                                /docs/api
                            </a>
                            . Or click below to copy a ready-made welcome message.
                        </div>

                        <div className={classes.modalFooter}>
                            <button
                                type="button"
                                className={classes.ghostBtn}
                                onClick={() => copyWelcome(reveal.key)}
                            >
                                Copy welcome message
                            </button>
                            <button
                                type="button"
                                className={classes.primaryBtn}
                                onClick={() => { setReveal(null); router.refresh(); }}
                            >
                                I&rsquo;ve saved it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!pendingRevoke}
                message={pendingRevoke
                    ? `Revoke the key "${pendingRevoke.label}"? Callers using it will start getting 401s immediately.`
                    : ''}
                confirmLabel="Revoke"
                tone="danger"
                onConfirm={confirmRevoke}
                onCancel={() => setPendingRevoke(null)}
            />
        </>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginTop: 20 }}>
            <div className={classes.sectionTitle}>{title}</div>
            {children}
        </div>
    );
}

function KeyTable({ rows, customers, onRevoke }) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table className={classes.table}>
                <thead>
                    <tr>
                        <th>Label</th>
                        <th>Prefix</th>
                        <th>Scope</th>
                        <th>Created</th>
                        <th>Last used</th>
                        {onRevoke && <th></th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((k) => (
                        <tr key={k.id} style={{ opacity: k.revokedAt ? 0.55 : 1 }}>
                            <td>{k.label}</td>
                            <td><code style={{ fontSize: '0.75rem' }}>{k.keyPrefix}…</code></td>
                            <td>{scopeLabel(k, customers)}</td>
                            <td>{fmtDate(k.createdAt)}</td>
                            <td>{fmtDate(k.lastUsedAt)}</td>
                            {onRevoke && (
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        type="button"
                                        className={classes.dangerBtn}
                                        onClick={() => onRevoke(k.id, k.label)}
                                    >
                                        Revoke
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
