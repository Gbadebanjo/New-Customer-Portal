'use client';
import { useState } from 'react';
import { updateSettings } from '@/lib/services/settings/settingsActions';

const TIMEZONES = [
    'Africa/Lagos', 'Africa/Abidjan', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Cairo',
    'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
    'Asia/Dubai', 'Asia/Kolkata', 'UTC',
];

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'D MMM YYYY'];

function SectionCard({ title, description, children }) {
    return (
        <div style={{
            background: '#0a1c2a', borderRadius: 12, padding: '1.5rem 2rem',
            marginBottom: '1.5rem', border: '1px solid rgba(173,216,230,0.1)',
        }}>
            <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ color: '#e1e7ed', fontSize: '1.05rem', fontWeight: 700 }}>{title}</div>
                {description && <div style={{ color: '#7c8796', fontSize: '0.85rem', marginTop: 4 }}>{description}</div>}
            </div>
            {children}
        </div>
    );
}

function FieldRow({ label, hint, children }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '0.75rem 1.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
                <div style={{ color: '#e1e7ed', fontWeight: 500, fontSize: '0.95rem' }}>{label}</div>
                {hint && <div style={{ color: '#7c8796', fontSize: '0.78rem', marginTop: 2 }}>{hint}</div>}
            </div>
            <div>{children}</div>
        </div>
    );
}

const inputStyle = {
    background: '#123751', border: '1px solid #1e3d55', borderRadius: 8,
    padding: '0.5rem 0.875rem', color: '#e1e7ed', fontSize: '0.95rem',
    width: '100%', height: 44,
};

const selectStyle = { ...inputStyle };

function Toggle({ checked, onChange }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: 48, height: 26, borderRadius: 13, cursor: 'pointer',
                background: checked ? '#ff7d70' : '#1c384e',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.1)',
            }}
        >
            <div style={{
                position: 'absolute', top: 3, left: checked ? 24 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
            }} />
        </div>
    );
}

function ToggleRow({ label, hint, checked, onChange }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
            <div>
                <div style={{ color: '#e1e7ed', fontWeight: 500, fontSize: '0.95rem' }}>{label}</div>
                {hint && <div style={{ color: '#7c8796', fontSize: '0.78rem', marginTop: 2 }}>{hint}</div>}
            </div>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}

function SaveButton({ onClick, saving }) {
    return (
        <button
            onClick={onClick}
            disabled={saving}
            style={{
                padding: '10px 28px', background: saving ? '#1c384e' : '#ff7d70',
                border: 'none', borderRadius: 8, color: '#fff',
                fontWeight: 700, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer',
                marginTop: '0.5rem',
            }}
        >
            {saving ? 'Saving…' : 'Save Changes'}
        </button>
    );
}

function SavedBanner() {
    return (
        <div style={{
            padding: '8px 16px', background: '#0e2e1e', border: '1px solid #4caf50',
            borderRadius: 8, color: '#4caf50', fontSize: '0.9rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: '0.5rem',
        }}>
            ✓ Settings saved
        </div>
    );
}

const TABS = ['General', 'Security', 'Email', 'Notifications'];

export default function SettingsClient({ initialSettings }) {
    const [activeTab, setActiveTab] = useState('General');
    const [settings, setSettings] = useState(initialSettings);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null); // tab name that was just saved

    const update = (section, key, value) => {
        setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
        setSaved(null);
    };

    const save = async (section) => {
        setSaving(true);
        try {
            await updateSettings(section, settings[section]);
            setSaved(section);
        } finally {
            setSaving(false);
        }
    };

    const g = settings.general;
    const s = settings.security;
    const e = settings.email;
    const n = settings.notifications;

    return (
        <div style={{ padding: '1.5rem 2rem' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #1c384e', marginBottom: '2rem' }}>
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setSaved(null); }}
                        style={{
                            padding: '0.75rem 1.5rem', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
                            color: activeTab === tab ? '#ff7d70' : '#7c8796',
                            borderBottom: activeTab === tab ? '2px solid #ff7d70' : '2px solid transparent',
                            marginBottom: -2, transition: 'color 0.15s',
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* General */}
            {activeTab === 'General' && (
                <>
                    <SectionCard title="Application" description="Basic information about this portal instance">
                        <FieldRow label="Application Name" hint="Shown in the browser tab and emails">
                            <input style={inputStyle} value={g.appName} onChange={(e) => update('general', 'appName', e.target.value)} />
                        </FieldRow>
                        <FieldRow label="Description" hint="Brief description of this portal">
                            <input style={inputStyle} value={g.appDescription} onChange={(e) => update('general', 'appDescription', e.target.value)} />
                        </FieldRow>
                        <FieldRow label="Support Email" hint="Displayed to users on error screens">
                            <input style={inputStyle} type="email" value={g.supportEmail} onChange={(e) => update('general', 'supportEmail', e.target.value)} />
                        </FieldRow>
                    </SectionCard>
                    <SectionCard title="Locale" description="Date and timezone defaults for new users">
                        <FieldRow label="Default Timezone">
                            <select style={selectStyle} value={g.defaultTimezone} onChange={(e) => update('general', 'defaultTimezone', e.target.value)}>
                                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </FieldRow>
                        <FieldRow label="Date Format">
                            <select style={selectStyle} value={g.dateFormat} onChange={(e) => update('general', 'dateFormat', e.target.value)}>
                                {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </FieldRow>
                    </SectionCard>
                    {saved === 'general' ? <SavedBanner /> : <SaveButton onClick={() => save('general')} saving={saving} />}
                </>
            )}

            {/* Security */}
            {activeTab === 'Security' && (
                <>
                    <SectionCard title="Session" description="User session and inactivity settings">
                        <FieldRow label="Session Timeout" hint="Minutes of inactivity before logout">
                            <input style={inputStyle} type="number" min={5} max={1440} value={s.sessionTimeoutMinutes} onChange={(e) => update('security', 'sessionTimeoutMinutes', parseInt(e.target.value))} />
                        </FieldRow>
                    </SectionCard>
                    <SectionCard title="Password Policy" description="Rules enforced when users create or reset passwords">
                        <FieldRow label="Minimum Length">
                            <input style={inputStyle} type="number" min={6} max={64} value={s.minPasswordLength} onChange={(e) => update('security', 'minPasswordLength', parseInt(e.target.value))} />
                        </FieldRow>
                        <ToggleRow label="Require Special Characters" hint="Password must include ! @ # $ % etc."
                            checked={s.requireSpecialChars} onChange={(v) => update('security', 'requireSpecialChars', v)} />
                        <ToggleRow label="Require Numbers"
                            checked={s.requireNumbers} onChange={(v) => update('security', 'requireNumbers', v)} />
                        <ToggleRow label="Require Uppercase Letters"
                            checked={s.requireUppercase} onChange={(v) => update('security', 'requireUppercase', v)} />
                    </SectionCard>
                    <SectionCard title="Account Lockout" description="Automatic protection against brute-force attacks">
                        <FieldRow label="Max Failed Login Attempts" hint="Account locks after this many consecutive failures">
                            <input style={inputStyle} type="number" min={1} max={20} value={s.maxLoginAttempts} onChange={(e) => update('security', 'maxLoginAttempts', parseInt(e.target.value))} />
                        </FieldRow>
                        <FieldRow label="Lockout Duration (minutes)" hint="How long the account stays locked">
                            <input style={inputStyle} type="number" min={5} max={1440} value={s.lockoutDurationMinutes} onChange={(e) => update('security', 'lockoutDurationMinutes', parseInt(e.target.value))} />
                        </FieldRow>
                    </SectionCard>
                    <SectionCard title="Two-Factor Authentication">
                        <ToggleRow label="Require 2FA for Admin users" hint="Admins and Portal Admins must enable 2FA"
                            checked={s.force2FAForAdmins} onChange={(v) => update('security', 'force2FAForAdmins', v)} />
                    </SectionCard>
                    {saved === 'security' ? <SavedBanner /> : <SaveButton onClick={() => save('security')} saving={saving} />}
                </>
            )}

            {/* Email */}
            {activeTab === 'Email' && (
                <>
                    <SectionCard title="Sender Identity" description="How outgoing emails appear to recipients">
                        <FieldRow label="Sender Name" hint="Display name in the 'From' field">
                            <input style={inputStyle} value={e.senderName} onChange={(ev) => update('email', 'senderName', ev.target.value)} />
                        </FieldRow>
                        <FieldRow label="Sender Email Address">
                            <input style={inputStyle} type="email" value={e.senderEmail} onChange={(ev) => update('email', 'senderEmail', ev.target.value)} />
                        </FieldRow>
                    </SectionCard>
                    <SectionCard title="SMTP Server" description="Configure for custom mail delivery. Leave empty to use SendGrid (default).">
                        <FieldRow label="SMTP Host">
                            <input style={inputStyle} placeholder="e.g. smtp.mailgun.org" value={e.smtpHost} onChange={(ev) => update('email', 'smtpHost', ev.target.value)} />
                        </FieldRow>
                        <FieldRow label="SMTP Port">
                            <input style={inputStyle} type="number" value={e.smtpPort} onChange={(ev) => update('email', 'smtpPort', parseInt(ev.target.value))} />
                        </FieldRow>
                        <ToggleRow label="Use TLS / Secure" hint="Enable for port 465; disable for 587 STARTTLS"
                            checked={e.smtpSecure} onChange={(v) => update('email', 'smtpSecure', v)} />
                        <div style={{ background: '#0a1c2a', borderRadius: 8, padding: '0.875rem 1rem', color: '#7c8796', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            SMTP credentials (username / password / API key) are managed via environment variables:
                            <code style={{ display: 'block', marginTop: '0.5rem', color: '#60a5fa', fontSize: '0.8rem' }}>
                                SENDGRID_API_KEY, SMTP_USER, SMTP_PASS
                            </code>
                        </div>
                    </SectionCard>
                    {saved === 'email' ? <SavedBanner /> : <SaveButton onClick={() => save('email')} saving={saving} />}
                </>
            )}

            {/* Notifications */}
            {activeTab === 'Notifications' && (
                <>
                    <SectionCard title="Email Notifications" description="Control which automated emails the system sends">
                        <ToggleRow label="Send Alert Emails" hint="Email admin users when system alerts are triggered"
                            checked={n.sendAlertEmails} onChange={(v) => update('notifications', 'sendAlertEmails', v)} />
                        <ToggleRow label="Send Invitation on User Create" hint="Automatically email a setup link when a new user is created"
                            checked={n.sendInvitationOnCreate} onChange={(v) => update('notifications', 'sendInvitationOnCreate', v)} />
                        <ToggleRow label="Notify User on Login from New IP" hint="Sends a security notification for unrecognised locations"
                            checked={n.sendLoginNotifications} onChange={(v) => update('notifications', 'sendLoginNotifications', v)} />
                    </SectionCard>
                    <SectionCard title="Reports" description="Scheduled report delivery">
                        <ToggleRow label="Daily Performance Report" hint="Send a daily summary email to subscribed users"
                            checked={n.dailyReportEnabled} onChange={(v) => update('notifications', 'dailyReportEnabled', v)} />
                    </SectionCard>
                    {saved === 'notifications' ? <SavedBanner /> : <SaveButton onClick={() => save('notifications')} saving={saving} />}
                </>
            )}
        </div>
    );
}
