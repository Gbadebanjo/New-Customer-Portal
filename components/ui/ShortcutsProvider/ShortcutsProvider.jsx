'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useKeyboardShortcuts from '@/lib/hooks/useKeyboardShortcuts';
import Modal from '@/components/ui/Modal/Modal';

const SHORTCUTS = [
    { keys: ['?'], label: 'Show / hide this help' },
    { keys: ['⌘/Ctrl', 'K'], label: 'Open command palette' },
    { keys: ['g', 'd'], label: 'Go to Dashboard', href: '/dashboard' },
    { keys: ['g', 's'], label: 'Go to Support', href: '/support' },
    { keys: ['g', 'r'], label: 'Go to Reports', href: '/reports' },
    { keys: ['g', 'a'], label: 'Go to Alerts', href: '/alerts' },
    { keys: ['g', 'p'], label: 'Go to Profile', href: '/profile' },
];

function Kbd({ children }) {
    return (
        <kbd style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 24,
            height: 24,
            padding: '0 6px',
            background: 'var(--ds-surface-raised)',
            border: '1px solid var(--ds-border)',
            borderRadius: 6,
            color: 'var(--ds-text)',
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '0.75rem',
            fontWeight: 600,
            lineHeight: 1,
        }}>
            {children}
        </kbd>
    );
}

/**
 * Global keyboard-shortcuts glue. Mounted once in the app shell — registers
 * navigation shortcuts and owns the help modal that "?" toggles.
 */
export default function ShortcutsProvider() {
    const router = useRouter();
    const [helpOpen, setHelpOpen] = useState(false);

    useKeyboardShortcuts({
        '?':   () => setHelpOpen((o) => !o),
        'g d': () => router.push('/dashboard'),
        'g s': () => router.push('/support'),
        'g r': () => router.push('/reports'),
        'g a': () => router.push('/alerts'),
        'g p': () => router.push('/profile'),
    });

    return (
        <Modal
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            title="Keyboard shortcuts"
            width={480}
        >
            <p style={{ color: 'var(--ds-text-muted)', fontSize: '0.85rem', marginTop: 0, marginBottom: 16 }}>
                Use these anywhere in the portal (won&rsquo;t fire while you&rsquo;re typing in a field).
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                    {SHORTCUTS.map(({ keys, label }) => (
                        <tr key={keys.join('-')}>
                            <td style={{
                                padding: '10px 0',
                                borderBottom: '1px solid var(--ds-border-subtle)',
                                width: 130,
                                verticalAlign: 'middle',
                            }}>
                                {keys.map((k, i) => (
                                    <span key={i} style={{ marginRight: 4 }}>
                                        <Kbd>{k}</Kbd>
                                        {i < keys.length - 1 && (
                                            <span style={{ margin: '0 4px', color: 'var(--ds-text-hint)', fontSize: '0.75rem' }}>then</span>
                                        )}
                                    </span>
                                ))}
                            </td>
                            <td style={{
                                padding: '10px 0',
                                borderBottom: '1px solid var(--ds-border-subtle)',
                                color: 'var(--ds-text)',
                                fontSize: '0.9rem',
                                verticalAlign: 'middle',
                            }}>
                                {label}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p style={{ color: 'var(--ds-text-hint)', fontSize: '0.75rem', marginTop: 16, marginBottom: 0 }}>
                Press <Kbd>?</Kbd> anytime to bring this back. Press <Kbd>Esc</Kbd> to close.
            </p>
        </Modal>
    );
}
