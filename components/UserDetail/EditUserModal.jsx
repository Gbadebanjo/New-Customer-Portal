'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import updateUserById from '@/lib/controllers/users/updateUserById';

// Editable-user modal for the admin drill-down. Server-side gate on
// `updateUserById` restricts writes to Admin + Portal Admin — this
// component just renders the form. Fields mirror the whitelist on
// the server so the caller can't send anything the server would drop.
//
// Roles are edited via checkboxes: every role added here goes into
// the User.roles JSONB array as `{ name: 'X' }`.
const AVAILABLE_ROLES = [
    'Admin',
    'Daystar Portal Admin',
    'Daystar Customer Admin',
    'Customer',
];

// Only a top-tier Admin may grant these. Portal Admins editing users
// see the checkboxes but can't toggle them (server enforces the same
// rule — this is purely UX).
const ELEVATED_ROLES = new Set(['Admin', 'Daystar Portal Admin']);

export default function EditUserModal({ open, user, customers = [], callerIsAdmin = false, onClose }) {
    const router = useRouter();
    const dialogRef = useRef(null);
    const [form, setForm] = useState({
        username: '', name: '', surname: '', email: '', phone_number: '',
        customer: '', roles: [], is_locked_out: false, not_active: false,
        email_confirmed: false,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Reset the form to the incoming user whenever the modal is opened
    // for a different row (or re-opened for the same one).
    useEffect(() => {
        if (!open || !user) return;
        const roleNames = Array.isArray(user.roles)
            ? user.roles.map((r) => r?.name).filter(Boolean)
            : [];
        setForm({
            username: user.username || '',
            name: user.name || '',
            surname: user.surname || '',
            email: user.email || '',
            phone_number: user.phone_number || '',
            customer: user.customer || '',
            roles: roleNames,
            is_locked_out: !!user.is_locked_out,
            not_active: !!user.not_active,
            email_confirmed: !!user.email_confirmed,
        });
        setError('');
    }, [open, user]);

    // Wire the native <dialog> open/close to props.
    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        if (open && !el.open) el.showModal();
        else if (!open && el.open) el.close();
    }, [open]);

    // ESC → treat as cancel.
    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        const onCancel = (e) => { e.preventDefault(); onClose?.(); };
        el.addEventListener('cancel', onCancel);
        return () => el.removeEventListener('cancel', onCancel);
    }, [onClose]);

    const toggleRole = (name) => {
        // Belt-and-braces guard — the checkbox is already disabled for
        // non-Admin callers, but a manual DOM click still shouldn't
        // mutate elevated-role state (server enforces this too).
        if (!callerIsAdmin && ELEVATED_ROLES.has(name)) return;
        setForm((prev) => {
            const has = prev.roles.includes(name);
            return {
                ...prev,
                roles: has ? prev.roles.filter((r) => r !== name) : [...prev.roles, name],
            };
        });
    };

    const handleSave = async () => {
        setError('');
        if (!form.username.trim()) return setError('Username is required.');
        if (!form.email.trim())    return setError('Email is required.');

        setSaving(true);
        try {
            const payload = {
                username: form.username.trim(),
                name: form.name.trim(),
                surname: form.surname.trim(),
                email: form.email.trim().toLowerCase(),
                phone_number: form.phone_number.trim(),
                customer: form.customer || null,
                // Server stores roles as an array of `{ name }` objects.
                roles: form.roles.map((n) => ({ name: n })),
                is_locked_out: form.is_locked_out,
                not_active: form.not_active,
                email_confirmed: form.email_confirmed,
            };
            const res = await updateUserById(user.id, payload);
            if (res?.error) {
                setError(res.error);
                return;
            }
            onClose?.();
            router.refresh();
        } catch (err) {
            setError(err?.message || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className="modal"
            style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                maxWidth: '100%',
                maxHeight: '100%',
            }}
        >
            <div style={{
                background: '#0d202f',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '22px 24px 18px',
                width: 'min(560px, 92vw)',
                color: '#e1e7ed',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
                <h3 style={{
                    margin: '0 0 4px', fontSize: 18, fontWeight: 700,
                    fontFamily: 'Kanit, sans-serif',
                }}>Edit user</h3>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 18 }}>
                    {user?.email}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Username">
                        <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} style={inputStyle} />
                    </Field>
                    <Field label="Email">
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                    </Field>
                    <Field label="First name">
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
                    </Field>
                    <Field label="Surname">
                        <input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} style={inputStyle} />
                    </Field>
                    <Field label="Phone">
                        <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} style={inputStyle} />
                    </Field>
                    <Field label="Customer">
                        <select
                            value={form.customer || ''}
                            onChange={(e) => setForm({ ...form, customer: e.target.value })}
                            style={{ ...inputStyle, colorScheme: 'dark' }}
                        >
                            <option value="">— No customer —</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>{c.company_name}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: '#7c8796', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Roles</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {AVAILABLE_ROLES.map((r) => {
                            const isElevated = ELEVATED_ROLES.has(r);
                            const locked = isElevated && !callerIsAdmin;
                            const selected = form.roles.includes(r);
                            return (
                                <label key={r} title={locked ? 'Only an Admin can assign this role.' : undefined} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    fontSize: 13, cursor: locked ? 'not-allowed' : 'pointer',
                                    padding: '5px 10px', borderRadius: 6,
                                    background: selected ? 'rgba(255,125,112,0.14)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${selected ? 'rgba(255,125,112,0.45)' : 'rgba(255,255,255,0.12)'}`,
                                    color: selected ? '#ff9770' : '#e1e7ed',
                                    opacity: locked ? 0.55 : 1,
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        disabled={locked}
                                        onChange={() => toggleRole(r)}
                                    />
                                    {r}
                                </label>
                            );
                        })}
                    </div>
                    {!callerIsAdmin && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#7c8796' }}>
                            Admin and Daystar Portal Admin can only be assigned by an Admin.
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <Toggle label="Locked" checked={form.is_locked_out} onChange={(v) => setForm({ ...form, is_locked_out: v })} />
                    <Toggle label="Inactive" checked={form.not_active} onChange={(v) => setForm({ ...form, not_active: v })} />
                    <Toggle label="Email verified" checked={form.email_confirmed} onChange={(v) => setForm({ ...form, email_confirmed: v })} />
                </div>

                {error && (
                    <div style={{ marginTop: 12, color: '#f87171', fontSize: 13 }}>{error}</div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button type="button" onClick={onClose} disabled={saving} style={btnGhost}>Cancel</button>
                    <button type="button" onClick={handleSave} disabled={saving} style={btnPrimary}>
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </dialog>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: '#7c8796', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
            {children}
        </div>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}

const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e1e7ed',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
};

const btnGhost = {
    padding: '9px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
    background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
    color: '#e1e7ed', cursor: 'pointer',
};

const btnPrimary = {
    padding: '9px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700,
    background: '#ff7d70', border: '1px solid #ff7d70', color: '#fff',
    cursor: 'pointer',
};
