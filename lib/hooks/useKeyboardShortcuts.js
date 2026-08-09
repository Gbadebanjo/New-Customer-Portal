'use client';
import { useEffect, useRef } from 'react';

/**
 * Global keyboard-shortcut handler with support for two-key "leader"
 * sequences (like Gmail's "g i" for inbox).
 *
 * Ignores key presses when the user is typing in an input / textarea /
 * contenteditable element, so shortcuts never steal characters mid-typing.
 *
 * @param {object} shortcuts
 *   Keys are single characters (single-key shortcut) or two characters
 *   separated by a space (leader sequence — e.g. "g d"). Values are the
 *   handler functions to run.
 *
 *   Modifier keys are NOT part of the map — treat this as raw letter/digit
 *   sequences. If you want Ctrl-something, wire it separately.
 *
 * @param {object} options
 *   leaderWindowMs — how long the second key of a two-key sequence has to
 *     land after the first (default 900 ms).
 */
export default function useKeyboardShortcuts(shortcuts, { leaderWindowMs = 900 } = {}) {
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    useEffect(() => {
        let leaderKey = null;
        let leaderTimer = null;

        const clearLeader = () => {
            leaderKey = null;
            if (leaderTimer) {
                clearTimeout(leaderTimer);
                leaderTimer = null;
            }
        };

        const isEditableTarget = (el) => {
            if (!el) return false;
            const tag = el.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
            if (el.isContentEditable) return true;
            return false;
        };

        const handleKeyDown = (e) => {
            // Never steal keys while the user is typing.
            if (isEditableTarget(e.target)) return;
            // Ignore combos with modifiers — those are for the browser / OS.
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

            // Second key of a leader sequence?
            if (leaderKey) {
                const combo = `${leaderKey} ${key}`;
                const handler = shortcutsRef.current[combo];
                clearLeader();
                if (handler) {
                    e.preventDefault();
                    handler(e);
                }
                return;
            }

            // Single-key shortcut?
            const singleHandler = shortcutsRef.current[key];
            if (singleHandler) {
                e.preventDefault();
                singleHandler(e);
                return;
            }

            // Is this key the START of a leader sequence?
            const hasLeader = Object.keys(shortcutsRef.current).some(
                (k) => k.startsWith(`${key} `)
            );
            if (hasLeader) {
                leaderKey = key;
                leaderTimer = setTimeout(clearLeader, leaderWindowMs);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearLeader();
        };
    }, [leaderWindowMs]);
}
