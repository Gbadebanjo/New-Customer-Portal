'use client';
import { useEffect, useMemo, useState } from 'react';
import { sendTemplateEmail } from '@/lib/controllers/mail/sendTemplateEmail';

/**
 * Compose-and-send modal opened from a Text Templates card.
 * The template's DB content pre-fills the body; admin can tweak subject
 * and body inline before selecting recipients and sending.
 *
 * Nothing here creates a new template — the source-of-truth list is the
 * DB, and this modal just consumes one existing entry.
 */
export default function SendTemplateEmailModal({ template, recipients, open, onClose }) {
    const [subject, setSubject] = useState(template?.display_name || '');
    const [body, setBody] = useState(template?.content || '');
    const [selected, setSelected] = useState(() => new Set());
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    // Reset local edits every time the modal opens against a template.
    useEffect(() => {
        if (open && template) {
            setSubject(template.display_name || '');
            setBody(template.content || '');
            setSelected(new Set());
            setSearch('');
            setResult(null);
        }
    }, [open, template]);

    // Close on Escape when idle.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape' && !sending) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, sending, onClose]);

    const filtered = useMemo(() => {
        if (!search.trim()) return recipients;
        const q = search.toLowerCase();
        return recipients.filter((r) =>
            (r.name || '').toLowerCase().includes(q) ||
            (r.email || '').toLowerCase().includes(q) ||
            (r.username || '').toLowerCase().includes(q)
        );
    }, [recipients, search]);

    const toggle = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAllFiltered = () => {
        const filteredIds = filtered.map((r) => r.id);
        const allChosen = filteredIds.every((id) => selected.has(id));
        setSelected((prev) => {
            const next = new Set(prev);
            if (allChosen) filteredIds.forEach((id) => next.delete(id));
            else filteredIds.forEach((id) => next.add(id));
            return next;
        });
    };

    const canSend = !sending && selected.size > 0 && subject.trim() && body.trim();

    const handleSend = async () => {
        if (!canSend) return;
        setSending(true);
        setResult(null);
        try {
            const res = await sendTemplateEmail({
                templateId: template.id,
                recipientUserIds: [...selected],
                subject,
                bodyHtml: body,
            });
            setResult(res);
        } catch (err) {
            setResult({ ok: false, error: err?.message || 'Failed to send.' });
        } finally {
            setSending(false);
        }
    };

    if (!open || !template) return null;

    const filteredIds = filtered.map((r) => r.id);
    const allFilteredChosen = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

    return (
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}>
            <div style={modalStyle} role="dialog" aria-modal="true">
                <div style={headerStyle}>
                    <div>
                        <div style={{ fontSize: 12, color: '#7c8796', letterSpacing: 0.4, textTransform: 'uppercase' }}>Compose from template</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#e1e7ed', marginTop: 4 }}>{template.display_name}</div>
                        <div style={{ fontSize: 12, color: '#7c8796', marginTop: 2 }}>{template.name}</div>
                    </div>
                    <button type="button" onClick={onClose} disabled={sending} style={closeBtnStyle} aria-label="Close">×</button>
                </div>

                <div style={bodyStyle}>
                    {/* Left — compose */}
                    <div style={composePaneStyle}>
                        <label style={labelStyle}>Subject</label>
                        <input
                            style={inputStyle}
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={sending}
                        />
                        <label style={{ ...labelStyle, marginTop: 12 }}>Body (HTML supported)</label>
                        <textarea
                            style={{ ...inputStyle, height: 260, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            disabled={sending}
                        />
                        <div style={{ color: '#7c8796', fontSize: 12, marginTop: 6 }}>
                            Use <code style={{ color: '#ff9770' }}>{'{name}'}</code>, <code style={{ color: '#ff9770' }}>{'{email}'}</code>, <code style={{ color: '#ff9770' }}>{'{username}'}</code> to personalise per recipient.
                        </div>
                    </div>

                    {/* Right — recipients */}
                    <div style={recipientsPaneStyle}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <input
                                type="search"
                                placeholder="Search recipients…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ ...inputStyle, flex: 1 }}
                                disabled={sending}
                            />
                            <button
                                type="button"
                                onClick={toggleAllFiltered}
                                disabled={sending || filtered.length === 0}
                                style={secondaryBtnStyle}
                            >
                                {allFilteredChosen ? 'Clear' : 'Select all'}
                            </button>
                        </div>
                        <div style={{ color: '#7c8796', fontSize: 12, marginBottom: 6 }}>
                            {selected.size} of {recipients.length} selected
                        </div>
                        <div style={listStyle}>
                            {filtered.length === 0 ? (
                                <div style={{ color: '#7c8796', fontSize: 13, padding: 12, textAlign: 'center' }}>
                                    No matching recipients.
                                </div>
                            ) : (
                                filtered.map((r) => {
                                    const chosen = selected.has(r.id);
                                    return (
                                        <label key={r.id} style={{
                                            ...rowStyle,
                                            background: chosen ? 'rgba(255,125,112,0.08)' : 'transparent',
                                            borderColor: chosen ? 'rgba(255,125,112,0.35)' : 'rgba(255,255,255,0.05)',
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={chosen}
                                                onChange={() => toggle(r.id)}
                                                disabled={sending}
                                                style={{ accentColor: '#ff7d70' }}
                                            />
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ color: '#e1e7ed', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || r.username || '(no name)'}</div>
                                                <div style={{ color: '#7c8796', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</div>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {result && (
                    <div style={{
                        padding: '10px 20px', fontSize: 13,
                        color: result.ok ? '#4caf50' : '#f87171',
                        background: result.ok ? 'rgba(76,175,80,0.08)' : 'rgba(248,113,113,0.08)',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        {result.ok
                            ? `Sent to ${result.sent} · Failed ${result.failed} · Skipped ${result.skipped}`
                            : (result.error || 'Send failed.')}
                    </div>
                )}

                <div style={footerStyle}>
                    <button type="button" onClick={onClose} disabled={sending} style={secondaryBtnStyle}>
                        {result?.ok ? 'Close' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!canSend}
                        style={{ ...primaryBtnStyle, opacity: canSend ? 1 : 0.5, cursor: canSend ? 'pointer' : 'not-allowed' }}
                    >
                        {sending ? 'Sending…' : `Send to ${selected.size || 0}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 };
const modalStyle = { width: 'min(920px, 100%)', maxHeight: 'calc(100vh - 48px)', background: '#0a1c2a', borderRadius: 12, border: '1px solid rgba(173,216,230,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' };
const closeBtnStyle = { background: 'transparent', border: 'none', color: '#7c8796', fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1, width: 32, height: 32 };
const bodyStyle = { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, padding: 20, overflow: 'auto' };
const composePaneStyle = { display: 'flex', flexDirection: 'column', minWidth: 0 };
const recipientsPaneStyle = { display: 'flex', flexDirection: 'column', minWidth: 0 };
const labelStyle = { color: '#7c8796', fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 };
const inputStyle = { background: '#123751', border: '1px solid #1e3d55', borderRadius: 8, padding: '8px 12px', color: '#e1e7ed', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const listStyle = { border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, background: '#08131c', padding: 6, height: 300, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 };
const rowStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid transparent' };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' };
const primaryBtnStyle = { padding: '9px 20px', background: '#ff7d70', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14 };
const secondaryBtnStyle = { padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e1e7ed', fontSize: 14, cursor: 'pointer' };
