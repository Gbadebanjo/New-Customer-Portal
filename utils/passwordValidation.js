export const PASSWORD_RULES = [
    { id: 'length',    label: 'At least 8 characters',          test: (p) => p.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter (A–Z)',      test: (p) => /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'One lowercase letter (a–z)',      test: (p) => /[a-z]/.test(p) },
    { id: 'number',    label: 'One number (0–9)',                test: (p) => /[0-9]/.test(p) },
    { id: 'symbol',    label: 'One special character (!@#$…)',   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_LEVELS = [
    { score: 1, label: 'Weak',        color: '#ef4444' },
    { score: 2, label: 'Fair',        color: '#f97316' },
    { score: 3, label: 'Good',        color: '#eab308' },
    { score: 4, label: 'Strong',      color: '#84cc16' },
    { score: 5, label: 'Very Strong', color: '#22c55e' },
];

export function getPasswordStrength(password) {
    if (!password) return null;
    const score = PASSWORD_RULES.filter((r) => r.test(password)).length;
    return { ...(STRENGTH_LEVELS[score - 1] || STRENGTH_LEVELS[0]), score };
}

export function validatePassword(password) {
    const failed = PASSWORD_RULES.filter((r) => !r.test(password));
    if (failed.length === 0) return null;
    return `Password must include: ${failed.map((r) => r.label.toLowerCase()).join(', ')}.`;
}
