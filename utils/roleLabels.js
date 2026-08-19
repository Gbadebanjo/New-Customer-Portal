// Short display labels for roles so long names like "Daystar Customer Admin"
// don't overflow / get ellipsised in tight UI spots like the sidebar role
// badge. Falls back to the raw role name when there's no mapping.
// Compact labels used in the right-sidebar role badge. `DCA` and
// `Portal Adm` are deliberate abbreviations — the badge is a tight
// pill, and the full role name is still exposed via the wrapper's
// `title` attribute for hover / screen-reader disclosure.
const SHORT_LABELS = {
    'Admin': 'Admin',
    'Daystar Portal Admin': 'Portal Adm',
    'Daystar Customer Admin': 'DCA',
    'Customer User': 'Customer',
    'Customer': 'Customer',
};

// Acronyms used only in very tight spaces (e.g. the sidebar role pill). The
// full role name is exposed via the element's `title` for accessibility and
// for anyone who wants to know what the acronym stands for.
const ACRONYMS = {
    'Daystar Customer Admin': 'DCA',
    'Customer User': 'User',
};

/**
 * Returns the compact acronym for a role if one exists (e.g. "DCP"), else
 * the raw role name. Use this inside a wrapper that exposes the full name
 * via `title` so users can hover to expand.
 */
export function roleAcronym(name) {
    if (!name) return '';
    return ACRONYMS[name] || name;
}

export function shortRoleLabel(name) {
    if (!name) return '';
    return SHORT_LABELS[name] || name;
}

/**
 * Given a user's roles array, produce a short label for the badge.
 * - Single role: uses the short label for that role.
 * - Multiple roles: shows the strongest one (Admin > Portal Admin > Customer
 *   Admin > Customer) with "+N more" if there are others.
 */
const RANK = ['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin', 'Customer User', 'Customer'];

export function summarizeRoles(roles) {
    if (!Array.isArray(roles) || roles.length === 0) return 'Profile';
    const names = roles.map((r) => r?.name).filter(Boolean);
    if (names.length === 0) return 'Profile';
    const sorted = [...names].sort((a, b) => {
        const ra = RANK.indexOf(a); const rb = RANK.indexOf(b);
        return (ra === -1 ? Infinity : ra) - (rb === -1 ? Infinity : rb);
    });
    const primary = shortRoleLabel(sorted[0]);
    const extras = sorted.length - 1;
    return extras > 0 ? `${primary} +${extras}` : primary;
}
