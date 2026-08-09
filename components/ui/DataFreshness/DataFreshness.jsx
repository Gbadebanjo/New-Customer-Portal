import classes from './dataFreshness.module.css';

/**
 * Health indicator for a site's telemetry. Buckets the age of the last
 * received data point into Live / Delayed / Offline / Unknown states with a
 * colored dot and a compact "last heard" label.
 *
 * Thresholds (configurable via props):
 *   liveWithinMinutes     ≤ 15 min → "Live"
 *   delayedWithinMinutes  ≤ 60 min → "Delayed"
 *   otherwise                     → "Offline"
 *   null / missing                → "Unknown"
 *
 * Props:
 *   lastReceived           ISO string | Date | number | null
 *   liveWithinMinutes      number, default 15
 *   delayedWithinMinutes   number, default 60
 *   compact                boolean — if true, hides the "last heard" tail (dot + label only)
 */
export default function DataFreshness({
    lastReceived,
    liveWithinMinutes = 15,
    delayedWithinMinutes = 60,
    compact = false,
}) {
    if (lastReceived == null || lastReceived === '') {
        return (
            <span className={`${classes.badge} ${classes.unknown}`} title="Telemetry status unknown">
                <span className={classes.dot} />
                Unknown
            </span>
        );
    }

    const date = lastReceived instanceof Date ? lastReceived : new Date(lastReceived);
    if (isNaN(date.getTime())) {
        return (
            <span className={`${classes.badge} ${classes.unknown}`} title="Invalid timestamp">
                <span className={classes.dot} />
                Unknown
            </span>
        );
    }

    const ageMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));

    let variant, label;
    if (ageMinutes <= liveWithinMinutes) {
        variant = classes.live;
        label = 'Healthy';
    } else if (ageMinutes <= delayedWithinMinutes) {
        variant = classes.delayed;
        label = 'Delayed';
    } else {
        // Reword "Offline" — the raw provider-status label reads as panic
        // for customers. "Reconnecting" is honest without alarm.
        variant = classes.offline;
        label = 'Reconnecting';
    }

    const tail = compact ? '' : ` · ${formatAge(ageMinutes)}`;

    return (
        <span className={`${classes.badge} ${variant}`} title={`Last heard from site: ${date.toLocaleString()}`}>
            <span className={classes.dot} />
            {label}{tail}
        </span>
    );
}

function formatAge(minutes) {
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
