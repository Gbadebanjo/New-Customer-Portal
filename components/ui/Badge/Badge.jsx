import classes from './badge.module.css';

/**
 * Small pill-shaped label for statuses. Variants are aligned with the data
 * assurance model (verified / provisional / held / restated) plus a neutral
 * fallback for generic use.
 *
 * Props:
 *   variant  "verified" | "provisional" | "held" | "restated" | "neutral"
 *   children label content
 *   dot      boolean — render a small solid dot at the leading edge
 */
export default function Badge({ variant = 'neutral', children, dot = false }) {
    const variantClass = classes[variant] || classes.neutral;
    return (
        <span className={`${classes.badge} ${variantClass}`}>
            {dot && <span className={classes.dot} style={{ background: 'currentColor' }} />}
            {children}
        </span>
    );
}
