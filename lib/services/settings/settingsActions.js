'use server';
import { getSettings, saveSettings } from './settingsStore';

export async function loadSettings() {
    return getSettings();
}

export async function updateSettings(section, data) {
    const current = getSettings();
    current[section] = { ...current[section], ...data };
    saveSettings(current);
    return { success: true };
}
