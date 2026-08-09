/**
 * Small skeleton primitives so any screen can build loading placeholders
 * that match its layout without importing a heavy loader lib.
 *
 *   <SkeletonBox height={40} />
 *   <SkeletonText lines={3} />
 *   <SkeletonRow />
 *
 * All use var(--ds-border-subtle) so they read on both themes automatically.
 */

const shimmer = {
    background: 'linear-gradient(90deg, var(--ds-surface-raised) 0%, var(--ds-surface-elevated) 40%, var(--ds-surface-raised) 80%)',
    backgroundSize: '200% 100%',
    animation: 'ds-shimmer 1.4s linear infinite',
    borderRadius: 4,
};

export function SkeletonBox({ height = 16, width = '100%', style = {} }) {
    return <div style={{ ...shimmer, height, width, ...style }} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, gap = 8, lastLineWidth = '60%' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap }} aria-hidden="true">
            {Array.from({ length: lines }, (_, i) => (
                <div key={i} style={{ ...shimmer, height: 12, width: i === lines - 1 ? lastLineWidth : '100%' }} />
            ))}
        </div>
    );
}

// Table row skeleton — width can be an array of column-width strings/numbers.
export function SkeletonRow({ columns = ['20%', '40%', '20%', '15%'], height = 12 }) {
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0' }} aria-hidden="true">
            {columns.map((w, i) => (
                <div key={i} style={{ ...shimmer, height, width: w }} />
            ))}
        </div>
    );
}
