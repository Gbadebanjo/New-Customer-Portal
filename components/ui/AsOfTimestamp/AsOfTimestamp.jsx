import classes from './asOfTimestamp.module.css';

/**
 * Compact "As of <time>" label for KPI cards / data blocks. Shows the given
 * timestamp in the viewer's locale, with a customizable prefix label.
 *
 * Props:
 *   value    ISO string | Date | number | null — the timestamp to display
 *   label    prefix text; defaults to "As of"
 *   locale   Intl locale; omit to use the browser default
 */
export default function AsOfTimestamp({ value, label = 'As of', locale }) {
    if (value == null) return null;

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;

    const formatted = date.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <span className={classes.wrapper} title={date.toISOString()}>
            <span className={classes.label}>{label}</span>
            <time className={classes.value} dateTime={date.toISOString()}>
                {formatted}
            </time>
        </span>
    );
}
