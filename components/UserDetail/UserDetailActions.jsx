'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    forceLogoutUser,
    resetUserTwoFactor,
    toggleUserLocked,
    sendPasswordResetForUser,
} from '@/lib/controllers/users/adminUserActions';
import deleteUserById from '@/lib/controllers/users/deleteUserById';
import { impersonateUser } from '@/lib/auth/impersonationActions';
import ConfirmModal from '@/components/ui/modals/customAlertModal/ConfirmModal';
import EditUserModal from './EditUserModal';

// Panel with the quick-action buttons on the identity card.
// Each destructive action opens the app-styled ConfirmModal (replacing
// window.confirm which pops OS-level and looks off-brand).
//
// Prop matrix:
//   `canWrite`   — Admin + Portal Admin. Shows Edit user.
//   `isAdmin`    — top-tier `Admin` only. Shows Delete user.
//   DCA sees neither Edit nor Delete (read + impersonate only).
export default function UserDetailActions({
    userId,
    user,           // full user row for the Edit modal
    userEmail,
    isLocked,
    canImpersonate,
    canWrite,
    isAdmin,
    customers = [],
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(null);
    const [msg, setMsg] = useState(null);
    // { key, message, confirmLabel, tone, fn } — non-null while awaiting user confirmation.
    const [pending, setPending] = useState(null);
    const [editOpen, setEditOpen] = useState(false);

    const start = (key, fn, confirmDetails) => {
        if (busy) return;
        setMsg(null);
        if (confirmDetails) {
            setPending({ key, fn, ...confirmDetails });
        } else {
            run(key, fn);
        }
    };

    const run = async (key, fn) => {
        setBusy(key);
        try {
            const res = await fn();
            if (res?.ok) {
                // Delete is terminal — the current /admin/identity/users/[id]
                // route no longer resolves once the row is gone, so we bounce
                // back to the users list instead of refreshing in place.
                if (key === 'delete') {
                    router.push('/admin/identity/users');
                    return;
                }
                setMsg({ tone: 'good', text: 'Done.' });
                router.refresh();
            } else {
                setMsg({ tone: 'bad', text: res?.error || 'Action failed.' });
            }
        } catch (err) {
            setMsg({ tone: 'bad', text: err?.message || 'Action failed.' });
        } finally {
            setBusy(null);
        }
    };

    const confirmPending = () => {
        const p = pending;
        setPending(null);
        if (p) run(p.key, p.fn);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                {canWrite && (
                    <Btn
                        onClick={() => setEditOpen(true)}
                        variant="primary"
                    >
                        Edit user
                    </Btn>
                )}
                <Btn
                    onClick={() => start('lock', () => toggleUserLocked(userId, !isLocked), {
                        message: isLocked
                            ? 'Unlock this account and clear failed-attempt counters?'
                            : "Lock this account? The user won't be able to log in until you unlock or the window expires.",
                        confirmLabel: isLocked ? 'Unlock' : 'Lock',
                        tone: isLocked ? 'default' : 'danger',
                    })}
                    busy={busy === 'lock'}
                >
                    {isLocked ? 'Unlock account' : 'Lock account'}
                </Btn>
                <Btn
                    onClick={() => start('logout', () => forceLogoutUser(userId), {
                        message: 'Force-logout every active session for this user?',
                        confirmLabel: 'Force logout',
                        tone: 'danger',
                    })}
                    busy={busy === 'logout'}
                >
                    Force logout
                </Btn>
                <Btn
                    onClick={() => start('reset2fa', () => resetUserTwoFactor(userId), {
                        message: "Clear this user's 2FA? They'll be forced to set it up again on next login.",
                        confirmLabel: 'Reset 2FA',
                        tone: 'danger',
                    })}
                    busy={busy === 'reset2fa'}
                >
                    Reset 2FA
                </Btn>
                <Btn
                    onClick={() => start('sendreset', () => sendPasswordResetForUser(userId), {
                        message: 'Email a password-reset link to this user?',
                        confirmLabel: 'Send',
                    })}
                    busy={busy === 'sendreset'}
                >
                    Send password reset
                </Btn>
                {canImpersonate && (
                    <Btn
                        onClick={() => start('impersonate', () => impersonateUser(userId))}
                        busy={busy === 'impersonate'}
                        variant="primary"
                    >
                        Impersonate
                    </Btn>
                )}
                {isAdmin && (
                    <Btn
                        onClick={() => start('delete', () => deleteUserById(userId), {
                            message: `Permanently delete ${userEmail || 'this user'}? This removes the account, all sessions, and every verification token — it can't be undone.`,
                            confirmLabel: 'Delete user',
                            tone: 'danger',
                        })}
                        busy={busy === 'delete'}
                        variant="danger"
                    >
                        Delete user
                    </Btn>
                )}
            </div>
            {msg && (
                <div style={{
                    fontSize: 12,
                    color: msg.tone === 'good' ? '#4caf50' : '#f87171',
                }}>{msg.text}</div>
            )}

            <ConfirmModal
                open={!!pending}
                message={pending?.message}
                confirmLabel={pending?.confirmLabel}
                tone={pending?.tone}
                onConfirm={confirmPending}
                onCancel={() => setPending(null)}
            />

            <EditUserModal
                open={editOpen}
                user={user}
                customers={customers}
                callerIsAdmin={!!isAdmin}
                onClose={() => setEditOpen(false)}
            />
        </div>
    );
}

function Btn({ children, onClick, busy, variant = 'default' }) {
    const styles = variant === 'primary' ? {
        background: '#ff7d70', border: '1px solid #ff7d70', color: '#fff',
    } : variant === 'danger' ? {
        background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171',
    } : {
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#e1e7ed',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            style={{
                ...styles,
                padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                whiteSpace: 'nowrap',
            }}
        >
            {busy ? '…' : children}
        </button>
    );
}
