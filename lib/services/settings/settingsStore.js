import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

const DEFAULTS = {
    general: {
        appName: 'Daystar Customer Portal',
        appDescription: 'Energy management portal for Daystar Power customers',
        supportEmail: 'support@daystarpower.com',
        defaultTimezone: 'Africa/Lagos',
        dateFormat: 'DD/MM/YYYY',
    },
    security: {
        sessionTimeoutMinutes: 60,
        minPasswordLength: 8,
        requireSpecialChars: true,
        requireNumbers: true,
        requireUppercase: true,
        maxLoginAttempts: 3,
        lockoutDurationMinutes: 15,
        inviteExpiryDays: 30,
        force2FAForAdmins: false,
    },
    email: {
        senderName: 'Daystar Power',
        senderEmail: 'noreply@daystarpower.com',
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: false,
    },
    notifications: {
        sendAlertEmails: true,
        sendLoginNotifications: false,
        sendInvitationOnCreate: true,
        dailyReportEnabled: false,
    },
};

export function getSettings() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            return structuredClone(DEFAULTS);
        }
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        const saved = JSON.parse(raw);
        // Deep merge: defaults win for missing keys
        return {
            general: { ...DEFAULTS.general, ...saved.general },
            security: { ...DEFAULTS.security, ...saved.security },
            email: { ...DEFAULTS.email, ...saved.email },
            notifications: { ...DEFAULTS.notifications, ...saved.notifications },
        };
    } catch {
        return structuredClone(DEFAULTS);
    }
}

export function saveSettings(settings) {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}
