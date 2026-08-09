'use client';
import { useEffect, useRef } from 'react';
import classes from './modal.module.css';

/**
 * Accessible modal built on the native <dialog> element (top-layer, focus trap,
 * Escape-to-close all handled by the browser). Consistent styling via tokens.
 *
 * Props:
 *   open      boolean       Whether the modal is open.
 *   onClose   () => void    Called when the user closes (Esc, backdrop, or × button).
 *   title     string        Optional title in the header.
 *   footer    ReactNode     Optional footer (typically buttons).
 *   width     number|string Max width, defaults to 480px.
 *   children  ReactNode     Body content.
 *   hideClose boolean       Suppress the built-in × button. Defaults false.
 */
export default function Modal({
    open,
    onClose,
    title,
    footer,
    width = 480,
    children,
    hideClose = false,
}) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const el = dialogRef.current;
        if (!el) return;
        if (open && !el.open) el.showModal();
        else if (!open && el.open) el.close();
    }, [open]);

    // Close on backdrop click (native <dialog> only fires 'click' on the dialog
    // itself when the user clicks the backdrop area).
    const handleClick = (e) => {
        if (e.target === dialogRef.current) onClose?.();
    };

    return (
        <dialog
            ref={dialogRef}
            className={classes.dialog}
            onCancel={(e) => { e.preventDefault(); onClose?.(); }}
            onClick={handleClick}
        >
            <div className={classes.container} style={{ maxWidth: typeof width === 'number' ? `${width}px` : width }}>
                {(title || !hideClose) && (
                    <div className={classes.header}>
                        <h2 className={classes.title}>{title}</h2>
                        {!hideClose && (
                            <button type="button" className={classes.closeBtn} aria-label="Close" onClick={onClose}>
                                ×
                            </button>
                        )}
                    </div>
                )}
                <div className={classes.body}>{children}</div>
                {footer && <div className={classes.footer}>{footer}</div>}
            </div>
        </dialog>
    );
}
