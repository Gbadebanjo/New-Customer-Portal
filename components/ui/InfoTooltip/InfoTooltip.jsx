'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classes from './infoTooltip.module.css';

/**
 * Small "ⓘ" info icon that shows a styled tooltip on hover / focus. The
 * tooltip is rendered via a React portal into document.body so it escapes
 * every parent's overflow and stacking context.
 *
 * Props:
 *   title     optional bold heading shown at the top of the tooltip
 *   children  the tooltip body (string or JSX)
 *   ariaLabel accessible name for the button (defaults to title or "More info")
 *   placement "top" (default) or "bottom" — which side of the trigger to
 *             anchor the tooltip on
 */
export default function InfoTooltip({ title, children, ariaLabel, placement = 'top' }) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState(null);
    const triggerRef = useRef(null);

    const label = ariaLabel || title || 'More info';

    useEffect(() => setMounted(true), []);

    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
            top: placement === 'bottom' ? rect.bottom : rect.top,
            left: rect.left + rect.width / 2,
        });
    }, [open, placement]);

    useEffect(() => {
        if (!open) return;
        const handle = () => setOpen(false);
        window.addEventListener('scroll', handle, true);
        window.addEventListener('resize', handle);
        return () => {
            window.removeEventListener('scroll', handle, true);
            window.removeEventListener('resize', handle);
        };
    }, [open]);

    const show = () => setOpen(true);
    const hide = () => setOpen(false);

    return (
        <span
            className={classes.wrapper}
            onMouseEnter={show}
            onMouseLeave={hide}
        >
            <button
                ref={triggerRef}
                type="button"
                className={classes.trigger}
                aria-label={label}
                tabIndex={0}
                onFocus={show}
                onBlur={hide}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
            </button>
            {mounted && open && coords && createPortal(
                <span
                    className={`${classes.tooltip} ${placement === 'bottom' ? classes.tooltipBottom : ''}`}
                    role="tooltip"
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        left: coords.left,
                        transform: placement === 'bottom'
                            ? 'translate(-50%, 0) translateY(8px)'
                            : 'translate(-50%, -100%) translateY(-8px)',
                        zIndex: 999999,
                    }}
                >
                    {title && <span className={classes.title}>{title}</span>}
                    {children}
                </span>,
                document.body
            )}
        </span>
    );
}
