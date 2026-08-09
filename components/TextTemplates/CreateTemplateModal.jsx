'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import addTextTemplate from '@/lib/controllers/textTemplates/addTextTemplate';

// Placeholders that the send-flow's `applyPlaceholders` already substitutes
// per recipient. Surfacing them here lets an admin drop them into the body
// with a click instead of remembering the exact spelling.
const PLACEHOLDERS = [
    { token: '{name}', desc: "Recipient's full name" },
    { token: '{email}', desc: "Recipient's email address" },
    { token: '{username}', desc: "Recipient's username" },
    { token: '{link}', desc: 'Deep-link into the portal (e.g. reset URL)' },
    { token: '{code}', desc: 'Numeric OTP / security code' },
    { token: '{message}', desc: 'Free-form message body' },
];

/**
 * Create a brand-new text template. Writes to `text_templates` via the
 * hardened `addTextTemplate` controller (auth + uniqueness enforced).
 * The `name` field is the machine key consumers look up by; `display_name`
 * is what admins see on the card.
 */
export default function CreateTemplateModal({ open, onClose }) {
    const router = useRouter();
    const contentRef = useRef(null);
    const [systemName, setSystemName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setSystemName('');
            setDisplayName('');
            setContent('');
            setError('');
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, saving, onClose]);

    const insertPlaceholder = (token) => {
        const ta = contentRef.current;
        if (!ta) { setContent((c) => c + token); return; }
        const start = ta.selectionStart ?? content.length;
        const end = ta.selectionEnd ?? content.length;
        const next = content.slice(0, start) + token + content.slice(end);
        setContent(next);
        // Restore focus + place cursor after inserted token
        queueMicrotask(() => {
            ta.focus();
            const pos = start + token.length;
            ta.setSelectionRange(pos, pos);
        });
    };

    const canSave = !saving
        && systemName.trim().length > 0
        && displayName.trim().length > 0
        && content.trim().length > 0;

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        setError('');
        try {
            const res = await addTextTemplate({
                name: systemName.trim(),
                display_name: displayName.trim(),
                content,
            });
            if (res?.error) {
                setError(res.error);
                setSaving(false);
                return;
            }
            router.refresh();
            onClose();
        } catch (err) {
            setError(err?.message || 'Failed to create template.');
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
            <div style={modalStyle} role="dialog" aria-modal="true">
                <div style={headerStyle}>
                    <div>
                        <div style={{ fontSize: 12, color: '#7c8796', letterSpacing: 0.4, textTransform: 'uppercase' }}>New template</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#e1e7ed', marginTop: 4 }}>Create email template</div>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} style={closeBtnStyle} aria-label="Close">×</button>
                </div>

                <div style={bodyStyle}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                            <label style={labelStyle}>System name</label>
                            <input
                                style={inputStyle}
                                value={systemName}
                                onChange={(e) => setSystemName(e.target.value)}
                                placeholder="e.g. Account.MonthlyDigest"
                                disabled={saving}
                            />
                            <div style={hintStyle}>Machine key. Use dot-notation (e.g. <code style={codeStyle}>Reports.MonthlySummary</code>).</div>
                        </div>
                        <div>
                            <label style={labelStyle}>Display name</label>
                            <input
                                style={inputStyle}
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="e.g. Monthly Performance Digest"
                                disabled={saving}
                            />
                            <div style={hintStyle}>What admins see on the card.</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                        <label style={labelStyle}>Placeholders (click to insert)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {PLACEHOLDERS.map((p) => (
                                <button
                                    key={p.token}
                                    type="button"
                                    onClick={() => insertPlaceholder(p.token)}
                                    title={p.desc}
                                    disabled={saving}
                                    style={chipStyle}
                                >
                                    {p.token}
                                </button>
                            ))}
                        </div>
                        <div style={hintStyle}>Any <code style={codeStyle}>{'{token}'}</code> in the body is replaced per recipient at send time.</div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                        <label style={labelStyle}>Content (HTML supported)</label>
                        <textarea
                            ref={contentRef}
                            style={{ ...inputStyle, height: 260, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={'<p>Hi {name},</p>\n<p>Your monthly digest is ready.</p>'}
                            disabled={saving}
                        />
                    </div>

                    {error && (
                        <div style={errorStyle}>{error}</div>
                    )}
                </div>

                <div style={footerStyle}>
                    <button type="button" onClick={onClose} disabled={saving} style={secondaryBtnStyle}>Cancel</button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        style={{ ...primaryBtnStyle, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
                    >
                        {saving ? 'Saving…' : 'Create Template'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 };
const modalStyle = { width: 'min(760px, 100%)', maxHeight: 'calc(100vh - 48px)', background: '#0a1c2a', borderRadius: 12, border: '1px solid rgba(173,216,230,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' };
const closeBtnStyle = { background: 'transparent', border: 'none', color: '#7c8796', fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1, width: 32, height: 32 };
const bodyStyle = { padding: 20, overflow: 'auto' };
const labelStyle = { color: '#7c8796', fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6, display: 'block' };
const inputStyle = { background: '#123751', border: '1px solid #1e3d55', borderRadius: 8, padding: '8px 12px', color: '#e1e7ed', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const hintStyle = { color: '#7c8796', fontSize: 12, marginTop: 6 };
const codeStyle = { color: '#ff9770', background: 'rgba(255,125,112,0.08)', padding: '1px 5px', borderRadius: 3, fontSize: 11 };
const chipStyle = { padding: '5px 10px', background: 'rgba(255,125,112,0.10)', border: '1px solid rgba(255,125,112,0.35)', color: '#ff9770', borderRadius: 999, fontSize: 12, fontFamily: 'monospace', cursor: 'pointer' };
const errorStyle = { marginTop: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 8, color: '#f87171', fontSize: 13 };
const footerStyle = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' };
const primaryBtnStyle = { padding: '9px 20px', background: '#ff7d70', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14 };
const secondaryBtnStyle = { padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e1e7ed', fontSize: 14, cursor: 'pointer' };
