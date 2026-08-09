import fs from 'fs';
import path from 'path';

// Per-user preferences kept as a single JSON file so nothing has to change
// in the DB. Keyed by userId. Shape:
//   { "<userId>": { weeklyDigestEnabled, favoriteSites: [], updatedAt } }
//
// Same pattern as the app settings store — cheap, atomic, no migration.
const PREFS_FILE = path.join(process.cwd(), 'data', 'user-prefs.json');

const DEFAULTS_PER_USER = () => ({
    weeklyDigestEnabled: false,
    favoriteSites: [],
    updatedAt: null,
});

function readAll() {
    try {
        if (!fs.existsSync(PREFS_FILE)) return {};
        return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf-8')) || {};
    } catch {
        return {};
    }
}

function writeAll(obj) {
    const dir = path.dirname(PREFS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PREFS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
}

export function getUserPrefs(userId) {
    if (!userId) return DEFAULTS_PER_USER();
    const all = readAll();
    return { ...DEFAULTS_PER_USER(), ...(all[userId] || {}) };
}

export function updateUserPrefs(userId, patch) {
    if (!userId) return DEFAULTS_PER_USER();
    const all = readAll();
    const current = { ...DEFAULTS_PER_USER(), ...(all[userId] || {}) };
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    all[userId] = next;
    writeAll(all);
    return next;
}

export function getAllPrefs() {
    return readAll();
}
