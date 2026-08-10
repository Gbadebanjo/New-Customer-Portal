'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    forceLogoutUser,
    resetUserTwoFactor,
    toggleUserLocked,
    sendPasswordResetForUser,
} from '@/lib/controllers/users/adminUserActions';
import { impersonateUser } from '@/lib/auth/impersonationActions';

// Panel with the quick-action buttons on the identity card.
// Each action calls a server action gated by requireWriteAdminAuth,
// then router.refresh()s so the page picks up new state.
export default function UserDetailActions({ userId, isLocked, canImpersonate }) {
    const router = useRouter();
    const [busy, setBusy] = useState(null); // action key currently running
    const [msg, setMsg] = useState(null);

    const run = async (key, fn, confirmText) => {
        if (busy) return;
        if (confirmText && !window.confirm(confirmText)) return;
        setBusy(key);
        setMsg(null);
        try {
            const res = await fn();
            if (res?.ok) {
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                <Btn
                    onClick={() => run('lock', () => toggleUserLocked(userId, !isLocked),
                        isLocked
                            ? 'Unlock this account and clear failed-attempt counters?'
                            : 'Lock this account? The user won\'t be able to log in until you unlock or the window expires.')}
                    busy={busy === 'lock'}
                >
                    {isLocked ? 'Unlock account' : 'Lock account'}
                </Btn>
                <Btn
                    onClick={() => run('logout', () => forceLogoutUser(userId),
                        'Force-logout every active session for this user?')}
                    busy={busy === 'logout'}
                >
                    Force logout
                </Btn>
                <Btn
                    onClick={() => run('reset2fa', () => resetUserTwoFactor(userId),
                        'Clear this user\'s 2FA? They\'ll be forced to set it up again on next login.')}
                    busy={busy === 'reset2fa'}
                >
                    Reset 2FA
                </Btn>
                <Btn
                    onClick={() => run('sendreset', () => sendPasswordResetForUser(userId),
                        'Email a password-reset link to this user?')}
                    busy={busy === 'sendreset'}
                >
                    Send password reset
                </Btn>
                {canImpersonate && (
                    <Btn
                        onClick={() => run('impersonate', () => impersonateUser(userId))}
                        busy={busy === 'impersonate'}
                        variant="primary"
                    >
                        Impersonate
                    </Btn>
                )}
            </div>
            {msg && (
                <div style={{
                    fontSize: 12,
                    color: msg.tone === 'good' ? '#4caf50' : '#f87171',
                }}>{msg.text}</div>
            )}
        </div>
    );
}

function Btn({ children, onClick, busy, variant = 'default' }) {
    const styles = variant === 'primary' ? {
        background: '#ff7d70', border: '1px solid #ff7d70', color: '#fff',
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
