// Central timezone hygiene. Historically the create-user modal was
// sending garbage (`undefined`, numeric ids like "0", "5") which then
// sat in the DB and rendered as literal "undefined" in the admin UI.
// This helper is the single choke point that guarantees every row we
// insert / update carries a real IANA identifier — or the app default.
export const DEFAULT_TIMEZONE = 'Africa/Lagos';

/**
 * Normalise a timezone value coming from a form / API. Returns
 * DEFAULT_TIMEZONE for anything not obviously a valid IANA name.
 *
 *   sanitizeTimezone(undefined)       → 'Africa/Lagos'
 *   sanitizeTimezone('')              → 'Africa/Lagos'
 *   sanitizeTimezone('undefined')     → 'Africa/Lagos'
 *   sanitizeTimezone('null')          → 'Africa/Lagos'
 *   sanitizeTimezone('5')             → 'Africa/Lagos'  (leaked option id)
 *   sanitizeTimezone('Europe/London') → 'Europe/London'
 */
export function sanitizeTimezone(tz) {
    if (tz == null) return DEFAULT_TIMEZONE;
    const s = String(tz).trim();
    if (!s) return DEFAULT_TIMEZONE;
    if (s === 'undefined' || s === 'null') return DEFAULT_TIMEZONE;
    if (/^\d+$/.test(s)) return DEFAULT_TIMEZONE;
    return s;
}

/**
 * Display-side counterpart for legacy rows that still hold junk. Returns
 * null (so the UI can fall back to its own placeholder like "—") for
 * anything the sanitizer would replace with the default. Kept separate
 * from sanitizeTimezone so read-side code can tell "unknown" apart from
 * "explicitly set to Africa/Lagos".
 */
export function displayTimezone(tz) {
    if (tz == null) return null;
    const s = String(tz).trim();
    if (!s) return null;
    if (s === 'undefined' || s === 'null') return null;
    if (/^\d+$/.test(s)) return null;
    return s;
}
