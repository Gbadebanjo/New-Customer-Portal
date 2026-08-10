export default function SessionsList({ sessions }) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
        return <div style={{ color: '#7c8796', fontSize: 13, marginTop: 12 }}>No sessions on record.</div>;
    }

    return (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sessions.map((s) => (
                <div key={s.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 1fr auto',
                    gap: 12, alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    fontSize: 12,
                }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        color: s.active ? '#4caf50' : '#7c8796',
                        fontWeight: 600,
                    }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: s.active ? '#4caf50' : '#7c8796',
                        }} />
                        {s.active ? 'Active' : 'Expired'}
                    </span>
                    <span style={{ color: '#a0afbf' }}>
                        Started {s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}
                    </span>
                    <span style={{ color: '#a0afbf' }}>
                        {s.active ? 'Expires' : 'Expired'} {s.expiresAt ? new Date(s.expiresAt).toLocaleString() : '—'}
                    </span>
                    <span style={{ color: '#7c8796', fontFamily: 'monospace', fontSize: 10 }}>
                        {s.id.slice(0, 8)}…
                    </span>
                </div>
            ))}
        </div>
    );
}
