'use client';
import { FaPrint } from 'react-icons/fa';

/**
 * "Print / Save as PDF" button. Triggers the browser's print dialog — users
 * can print to paper or pick "Save as PDF" as the destination for a shareable
 * file. Print-specific CSS in assetDetails.module.css hides the app shell
 * and lightens the palette for ink-friendly output.
 */
export default function PrintButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            aria-label="Print or save as PDF"
            title="Print or save as PDF"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid var(--ds-accent)',
                borderRadius: 'var(--ds-radius-md)',
                color: 'var(--ds-accent)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                lineHeight: 1.4,
                transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 125, 112, 0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
            <FaPrint size={12} />
            Print / PDF
        </button>
    );
}
