import Link from 'next/link';
import HomeIcon from '@/components/ui/icons/HomeIcon';
import BackButton from '@/components/ui/BackButton/BackButton';
import UserDetailActions from './UserDetailActions';
import ActivityTimeline from './ActivityTimeline';
import SessionsList from './SessionsList';
import { displayTimezone } from '@/lib/utils/timezone';

// A value counts as "empty" for display when it's null/undefined, an
// empty/whitespace string, or one of the sentinel strings we know
// legacy rows have leaked ('undefined', 'null'). Anything else prints
// as-is; the Field component falls back to '—' when this returns null.
function displayValue(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;
    if (s === 'undefined' || s === 'null') return null;
    return s;
}

// Formats a role list for display; falls back to "—" when empty.
function rolesLabel(user) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    if (!roles.length) return '—';
    return roles.map((r) => r?.name).filter(Boolean).join(', ');
}

function StatPill({ label, value, tone = 'neutral' }) {
    const bg = {
        neutral: 'rgba(255,255,255,0.06)',
        good:    'rgba(76,175,80,0.14)',
        warn:    'rgba(255,193,7,0.16)',
        bad:     'rgba(248,113,113,0.14)',
    }[tone];
    const color = {
        neutral: '#e1e7ed',
        good:    '#4caf50',
        warn:    '#ffc107',
        bad:     '#f87171',
    }[tone];
    return (
        <div style={{
            background: bg, color, border: `1px solid ${color}33`,
            padding: '4px 10px', borderRadius: 6, fontSize: 11,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4,
            display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
            {label}{value !== undefined && (<><span style={{ opacity: 0.6 }}>·</span>{value}</>)}
        </div>
    );
}

function Field({ label, value }) {
    const clean = displayValue(value);
    return (
        <div>
            <div style={{ fontSize: 11, color: '#7c8796', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, color: '#e1e7ed', wordBreak: 'break-word' }}>{clean || '—'}</div>
        </div>
    );
}

export default async function UserDetailScreen({ user, customerName, callerIsAdmin, activity, sessions, failedLoginCount, failedLoginWindowDays }) {
    const activeSessionCount = sessions.filter((s) => s.active).length;
    const initials = ((user.name?.[0] || '') + (user.surname?.[0] || '')).toUpperCase()
        || (user.username?.[0] || 'U').toUpperCase();

    return (
        <div style={{ padding: 0, background: '#0d202f', minHeight: '100vh', color: '#e1e7ed' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 6, fontSize: 14, color: '#b0b7bd', borderBottom: '1px solid rgba(173,216,230,0.1)' }}>
                <Link href="/dashboard"><HomeIcon /></Link>
                <span>|&nbsp;Admin&nbsp;|&nbsp;Users&nbsp;|&nbsp;</span>
                <span style={{ color: '#e1e7ed', fontWeight: 500 }}>{user.email || user.username}</span>
                <span style={{ marginLeft: 'auto' }}><BackButton /></span>
            </div>

            <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 20px', display: 'grid', gap: 20 }}>
                {/* Identity card */}
                <section style={{
                    background: 'linear-gradient(180deg, #163a54 0%, #10293b 100%)',
                    borderRadius: 14, padding: '22px 24px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'grid', gridTemplateColumns: '68px 1fr auto', gap: 20, alignItems: 'center',
                }}>
                    <div style={{
                        width: 68, height: 68, borderRadius: '50%',
                        background: 'rgba(255,125,112,0.18)',
                        border: '1px solid rgba(255,125,112,0.4)',
                        color: '#ff9770', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 26, fontWeight: 700,
                    }}>{initials}</div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                            {[user.name, user.surname].filter(Boolean).join(' ') || user.username || '(no name)'}
                        </div>
                        <div style={{ fontSize: 13, color: '#b0b7bd', marginTop: 2 }}>{user.email}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                            <StatPill label={rolesLabel(user)} tone="neutral" />
                            {user.not_active
                                ? <StatPill label="Inactive" tone="bad" />
                                : <StatPill label="Active" tone="good" />}
                            {user.is_locked_out && <StatPill label="Locked" tone="bad" />}
                            <StatPill label={user.totp_enabled ? '2FA on' : '2FA off'} tone={user.totp_enabled ? 'good' : 'warn'} />
                            {user.email_confirmed
                                ? <StatPill label="Email verified" tone="good" />
                                : <StatPill label="Email unverified" tone="warn" />}
                        </div>
                    </div>
                    <UserDetailActions
                        userId={user.id}
                        isLocked={!!user.is_locked_out}
                        userEmail={user.email}
                        canImpersonate={Array.isArray(user.roles) && user.roles.some((r) => r?.name === 'Customer')}
                        isAdmin={!!callerIsAdmin}
                    />
                </section>

                {/* Metadata grid */}
                <section style={sectionStyle}>
                    <SectionHeader title="Details" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 12 }}>
                        <Field label="Username" value={user.username} />
                        <Field label="Phone" value={user.phone_number} />
                        <Field label="Customer" value={customerName || (user.customer ? '(unresolved)' : null)} />
                        <Field label="Timezone" value={displayTimezone(user.timezone)} />
                        <Field label="Failed logins" value={`${failedLoginCount} in last ${failedLoginWindowDays} days`} />
                        <Field label="Active sessions" value={String(activeSessionCount)} />
                        <Field label="Created" value={user.created_at ? new Date(user.created_at).toLocaleString() : (user.creation_time ? new Date(user.creation_time).toLocaleString() : '—')} />
                        <Field label="Last modified" value={user.updated_at ? new Date(user.updated_at).toLocaleString() : (user.modification_time ? new Date(user.modification_time).toLocaleString() : '—')} />
                    </div>
                </section>

                {/* Sessions */}
                <section style={sectionStyle}>
                    <SectionHeader title="Sessions" subtitle="Active sign-ins. Use the actions panel above to force-logout everywhere." />
                    <SessionsList sessions={sessions} />
                </section>

                {/* Activity timeline */}
                <section style={sectionStyle}>
                    <SectionHeader
                        title="Activity"
                        subtitle="Combined security + audit events for this user, newest first (up to 100)."
                    />
                    <ActivityTimeline events={activity} />
                </section>
            </div>
        </div>
    );
}

function SectionHeader({ title, subtitle }) {
    return (
        <div>
            <div style={{ color: '#4b7a9c', fontSize: 16, fontWeight: 600, letterSpacing: 0.3 }}>{title}</div>
            {subtitle && (
                <div style={{ color: '#7c8796', fontSize: 12, marginTop: 2 }}>{subtitle}</div>
            )}
        </div>
    );
}

const sectionStyle = {
    background: '#0a1c2a',
    borderRadius: 14,
    padding: '20px 24px',
    border: '1px solid rgba(255,255,255,0.05)',
};
