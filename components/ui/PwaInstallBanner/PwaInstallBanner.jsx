'use client';
import { useEffect, useState } from 'react';

// LocalStorage key used to suppress the banner after the user dismisses
// or installs. Timestamp; we re-offer after 30 days so browsers on new
// devices see it again without being annoying.
const SUPPRESS_KEY = 'daystar_pwa_banner_dismissed_at';
const REOFFER_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * A small non-blocking install prompt that appears when Chromium browsers
 * fire the `beforeinstallprompt` event AND the user hasn't dismissed
 * recently. Wire it into `MainAppLayout` (or `app/layout.js`) to enable.
 *
 * Requires (separately):
 *   - `public/manifest.webmanifest`  — app manifest with icons + start_url
 *   - `public/service-worker.js`     — even an empty one satisfies the PWA
 *     install criteria; add real caching later.
 *   - `<link rel="manifest">` in the root <head>.
 */
export default function PwaInstallBanner() {
    const [deferred, setDeferred] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Skip if the user dismissed in the last 30 days.
        try {
            const last = Number(localStorage.getItem(SUPPRESS_KEY) || 0);
            if (last && Date.now() - last < REOFFER_AFTER_MS) return;
        } catch { /* ignore private-mode storage errors */ }

        const onBeforeInstall = (e) => {
            e.preventDefault();
            setDeferred(e);
            setVisible(true);
        };
        const onInstalled = () => {
            setVisible(false);
            try { localStorage.setItem(SUPPRESS_KEY, String(Date.now())); } catch {}
        };
        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (!visible || !deferred) return null;

    const dismiss = () => {
        setVisible(false);
        try { localStorage.setItem(SUPPRESS_KEY, String(Date.now())); } catch {}
    };

    const install = async () => {
        try {
            deferred.prompt();
            await deferred.userChoice; // { outcome: 'accepted' | 'dismissed' }
        } finally {
            setDeferred(null);
            setVisible(false);
        }
    };

    return (
        <div
            role="dialog"
            aria-live="polite"
            style={{
                position: 'fixed',
                left: 16,
                right: 16,
                bottom: 16,
                zIndex: 2000,
                margin: '0 auto',
                maxWidth: 460,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(13, 32, 47, 0.98)',
                border: '1px solid rgba(255,125,112,0.35)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                color: '#fff',
                fontFamily: '"Inter", sans-serif',
            }}
        >
            <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'rgba(255,125,112,0.15)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 18,
            }}>
                ⚡
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    Install Daystar Portal
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.35 }}>
                    Get a one-tap app icon on your home screen. Same portal, no browser tab.
                </div>
            </div>
            <div style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
                <button
                    type="button"
                    onClick={dismiss}
                    style={{
                        padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem',
                    }}
                >
                    Not now
                </button>
                <button
                    type="button"
                    onClick={install}
                    style={{
                        padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                        background: '#ff7d70', border: '1px solid #ff7d70',
                        color: '#0d202f', fontWeight: 600, fontSize: '0.82rem',
                    }}
                >
                    Install
                </button>
            </div>
        </div>
    );
}
