'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyPrefs, setFavoriteSites } from '@/lib/controllers/userPrefs/prefsActions';

const STORAGE_KEY = 'daystar.favoriteSites';

/**
 * Persistent user favorites — server-synced across devices, backed by the
 * per-user prefs store. localStorage is used as an offline mirror so the
 * initial paint is instant (no server round-trip on first render).
 *
 * Flow:
 *   1. Read localStorage synchronously → paint immediately.
 *   2. Ask the server for the authoritative list → reconcile.
 *   3. Any change (toggle/clear) writes to localStorage AND fires a
 *      debounced server save so other devices pick it up on their next
 *      reconcile.
 *
 * API is unchanged from the previous localStorage-only version so all
 * existing callers keep working.
 */
export default function useFavoriteSites() {
    const [favorites, setFavorites] = useState(() => new Set());
    const [hydrated, setHydrated] = useState(false);
    const saveTimerRef = useRef(null);
    const skipNextSaveRef = useRef(true); // don't push server data back on first reconcile

    // 1. Instant hydration from localStorage.
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) setFavorites(new Set(arr.map(String)));
            }
        } catch { /* corrupted or missing — start empty */ }
        setHydrated(true);
    }, []);

    // 2. Reconcile with the server once. Server wins on load.
    useEffect(() => {
        let cancelled = false;
        getMyPrefs().then((prefs) => {
            if (cancelled) return;
            if (prefs && Array.isArray(prefs.favoriteSites)) {
                skipNextSaveRef.current = true; // this state update is FROM the server
                setFavorites(new Set(prefs.favoriteSites.map(String)));
            }
        }).catch(() => { /* offline — keep local */ });
        return () => { cancelled = true; };
    }, []);

    // 3. Persist changes: localStorage immediately, server debounced.
    useEffect(() => {
        if (!hydrated) return;

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
        } catch { /* quota / disabled — silent */ }

        if (skipNextSaveRef.current) {
            skipNextSaveRef.current = false;
            return;
        }

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            setFavoriteSites([...favorites]).catch(() => { /* offline — local wins for now */ });
        }, 400);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [favorites, hydrated]);

    const isFavorite = useCallback((id) => favorites.has(String(id)), [favorites]);

    const toggle = useCallback((id) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            const key = String(id);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const clearAll = useCallback(() => setFavorites(new Set()), []);

    return { favorites, isFavorite, toggle, clearAll, hydrated };
}
