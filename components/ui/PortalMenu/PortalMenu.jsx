'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders `children` (a dropdown menu) into document.body via a portal so it
 * escapes any overflow-clipped ancestor. Positions itself directly below the
 * trigger element using its bounding rect.
 *
 * Props:
 *   isOpen      boolean         Whether the menu is currently open.
 *   triggerRef  ref             Ref to the trigger element used as anchor.
 *   onClose     () => void      Called when user clicks outside, presses Esc, or scrolls.
 *   align       "left" | "right" Which edge of the trigger the menu aligns to. Defaults "right".
 *   offset      number          Gap between trigger and menu, in px. Defaults 4.
 *   children    ReactNode       Menu content (typically a <ul>).
 */
export default function PortalMenu({
    isOpen,
    triggerRef,
    onClose,
    align = 'right',
    offset = 4,
    children,
}) {
    const menuRef = useRef(null);
    const [coords, setCoords] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useLayoutEffect(() => {
        if (!isOpen || !triggerRef?.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
            top: rect.bottom + offset,
            left: align === 'right' ? undefined : rect.left,
            right: align === 'right' ? window.innerWidth - rect.right : undefined,
        });
    }, [isOpen, triggerRef, align, offset]);

    useEffect(() => {
        if (!isOpen) return;
        const handleMouseDown = (e) => {
            const t = e.target;
            if (triggerRef?.current?.contains(t)) return;
            if (menuRef.current?.contains(t)) return;
            onClose?.();
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        const handleScrollOrResize = () => onClose?.();

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKey);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKey);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen, triggerRef, onClose]);

    if (!mounted || !isOpen || !coords) return null;

    return createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                right: coords.right,
                zIndex: 2000,
            }}
        >
            {children}
        </div>,
        document.body
    );
}
