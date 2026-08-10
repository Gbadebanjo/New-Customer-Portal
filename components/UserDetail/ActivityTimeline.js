// Groups events by day so the visual scan matches "when things happened"
// rather than a raw scrolling list of timestamps. Each event tries to
// pull a human-readable summary out of the raw extra_properties JSON.

function parseExtras(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return null; }
}

function summariseExtras(extras) {
    if (!extras) return '';
    const bits = [];
    if (extras.method) bits.push(extras.method);
    if (extras.attempts !== undefined) bits.push(`${extras.attempts} attempts`);
    if (extras.by) bits.push(`by ${extras.by}`);
    if (extras.targetEmail) bits.push(`→ ${extras.targetEmail}`);
    return bits.join(' · ');
}

function toneFor(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('failed') || n.includes('locked') || n.includes('ratelimit')) return '#f87171';
    if (n.includes('reset') || n.includes('2fa') || n.includes('twofactor')) return '#ffc107';
    if (n.includes('succeeded') || n.includes('enabled') || n.includes('activated')) return '#4caf50';
    if (n.includes('created') || n.includes('updated')) return '#60a5fa';
    return '#7c8796';
}

function dayLabel(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yday = new Date(today); yday.setDate(today.getDate() - 1);
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, yday))  return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ActivityTimeline({ events }) {
    if (!Array.isArray(events) || events.length === 0) {
        return <div style={{ color: '#7c8796', fontSize: 13, marginTop: 12 }}>No recorded activity.</div>;
    }

    // Group by day using the label as the key.
    const groups = new Map();
    for (const e of events) {
        const key = dayLabel(e.createdAt);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(e);
    }

    return (
        <div style={{ marginTop: 12 }}>
            {[...groups.entries()].map(([day, items]) => (
                <div key={day} style={{ marginBottom: 20 }}>
                    <div style={{
                        fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4,
                        color: '#7c8796', marginBottom: 8,
                    }}>{day}</div>
                    <div style={{
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                        {items.map((e, i) => {
                            const extras = parseExtras(e.extra);
                            const summary = summariseExtras(extras);
                            const tone = toneFor(e.name);
                            const time = new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            return (
                                <div key={i} style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute', left: -21, top: 6,
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: tone,
                                    }} />
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ color: '#e1e7ed', fontSize: 13, fontWeight: 500 }}>{e.name}</span>
                                        <span style={{ color: '#7c8796', fontSize: 11 }}>{e.source}</span>
                                        {e.ip && <span style={{ color: '#7c8796', fontSize: 11 }}>· {e.ip}</span>}
                                        <span style={{ color: '#7c8796', fontSize: 11, marginLeft: 'auto' }}>{time}</span>
                                    </div>
                                    {summary && (
                                        <div style={{ color: '#a0afbf', fontSize: 12, marginTop: 2 }}>{summary}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
