'use client';
import { useEffect, useRef } from 'react';
import WarnCircleBigIcon from '@/components/ui/icons/WarnCircleBigIcon';

/**
 * State-controlled confirmation dialog — the app-styled replacement
 * for `window.confirm()`. Uses a native <dialog> (top-layer, focus
 * trap, ESC to close) with the same brand look as CustomAlertModal.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null);
 *   // trigger:
 *   setConfirm({ message: 'Revoke this key?', onConfirm: doRevoke });
 *   // render once:
 *   <ConfirmModal
 *     open={!!confirm}
 *     message={confirm?.message}
 *     confirmLabel={confirm?.confirmLabel}
 *     tone={confirm?.tone}
 *     onConfirm={() => { confirm?.onConfirm?.(); setConfirm(null); }}
 *     onCancel={() => setConfirm(null)}
 *   />
 *
 * `tone: 'danger'` colours the confirm button red for destructive
 * actions; anything else defaults to the brand coral.
 */
export default function ConfirmModal({
    open,
    message,
    confirmLabel = 'Yes',
    cancelLabel = 'Cancel',
    tone = 'default',
    onConfirm,
    onCancel,
}) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        if (open && !el.open) el.showModal();
        else if (!open && el.open) el.close();
    }, [open]);

    // ESC → treat as cancel (native <dialog> fires the 'cancel' event).
    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        const onCancelEvent = (e) => { e.preventDefault(); onCancel?.(); };
        el.addEventListener('cancel', onCancelEvent);
        return () => el.removeEventListener('cancel', onCancelEvent);
    }, [onCancel]);

    const confirmBg  = tone === 'danger' ? '#ef4444' : '#ff7d70';
    const confirmHov = tone === 'danger' ? '#dc2626' : '#ff9770';

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
                padding: '28px 24px 20px',
                width: 'min(440px, 90vw)',
                textAlign: 'center',
                color: '#e1e7ed',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
                <div style={{ marginBottom: 16 }}>
                    <WarnCircleBigIcon />
                </div>
                <p style={{
                    fontSize: 15, lineHeight: 1.5, margin: '0 0 20px',
                    wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap',
                }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#e1e7ed', cursor: 'pointer', minWidth: 100,
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        style={{
                            padding: '9px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                            background: confirmBg,
                            border: `1px solid ${confirmBg}`,
                            color: '#fff', cursor: 'pointer', minWidth: 100,
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = confirmHov; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = confirmBg; }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
