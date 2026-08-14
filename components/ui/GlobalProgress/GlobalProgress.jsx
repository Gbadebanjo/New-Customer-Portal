'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Thin coral progress bar pinned to the top of the viewport that
 * appears while the user is navigating between routes. Non-blocking
 * feedback so the user knows their click registered when the
 * destination page takes a moment to arrive.
 *
 * Triggers:
 *   1. Same-origin `<a>` click captured before Next.js router hands
 *      off — shows the bar immediately on click.
 *   2. `usePathname()` / `useSearchParams()` change — hides the bar
 *      once the destination route has committed.
 *
 * Skips: external links, downloads, target=_blank, modifier-clicks
 * (Ctrl/Cmd/Shift/middle for new-tab), and same-URL anchors.
 */
export default function GlobalProgress() {
    const [visible, setVisible] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Once the new route commits, hide the bar. Small delay so the
    // sliding animation is visible for at least a moment even on
    // near-instant transitions.
    useEffect(() => {
        const t = setTimeout(() => setVisible(false), 250);
        return () => clearTimeout(t);
    }, [pathname, searchParams]);

    useEffect(() => {
        const onClick = (e) => {
            if (e.defaultPrevented) return;
            if (e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = e.target.closest && e.target.closest('a[href]');
            if (!a) return;
            if (a.target && a.target !== '' && a.target !== '_self') return;
            if (a.hasAttribute('download')) return;
            try {
                const url = new URL(a.href, window.location.href);
                if (url.origin !== window.location.origin) return;
                if (url.pathname === window.location.pathname
                    && url.search === window.location.search) return;
                setVisible(true);
            } catch { /* invalid URL — skip */ }
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, []);

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                zIndex: 99999,
                pointerEvents: 'none',
                opacity: visible ? 1 : 0,
                transition: visible ? 'none' : 'opacity 200ms 100ms',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    height: '100%',
                    width: '40%',
                    background: 'linear-gradient(90deg, transparent, #ff7d70 30%, #ff9770 60%, transparent)',
                    animation: visible ? 'ds-progress-slide 1.1s ease-in-out infinite' : 'none',
                }}
            />
        </div>
    );
}
