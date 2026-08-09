import AmmpServices from '@/lib/services/ammp/AmmpServices';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';

/**
 * Yield-loss breakdown — where lost solar production went over the last
 * 30 days. Reads technical-kpis/pv-yield-losses and renders a horizontal
 * stacked bar so it's obvious at a glance which loss category dominates.
 *
 * We deliberately don't drill into every named loss AMMP might return —
 * we group them into "Soiling / shading", "Inverter clipping", "Grid / genset
 * outage", "Curtailment", "Other". Anything we don't recognise rolls into
 * Other so a schema change doesn't blank the chart.
 */
export default async function YieldLossBlock({ assetId, token }) {
    if (!token || !assetId) return null;

    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    let payload = null;
    try {
        payload = await AmmpServices().getTechnicalPvYieldLosses(token, assetId, from, to, '1d');
    } catch { /* silent */ }

    const buckets = extractBuckets(payload);
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    if (total <= 0) return null;

    const rows = [
        { key: 'soiling',    label: 'Soiling / shading',    color: '#f4a742' },
        { key: 'clipping',   label: 'Inverter clipping',    color: '#60a5fa' },
        { key: 'outage',     label: 'Grid / genset outage', color: '#ef4444' },
        { key: 'curtail',    label: 'Curtailment',          color: '#a78bfa' },
        { key: 'other',      label: 'Other',                color: '#94a3b8' },
    ].filter((r) => buckets[r.key] > 0);

    return (
        <div style={{ padding: '0 20px', marginTop: 20 }}>
            <h2 style={{
                color: '#4b7a9c', fontSize: '1.5rem', fontWeight: 600, marginBottom: 6,
                fontFamily: 'Kanit, sans-serif', display: 'flex', alignItems: 'center', gap: 8,
            }}>
                Where your kWh went
                <InfoTooltip title="Yield loss breakdown" placement="bottom">
                    We compare your actual solar output over the last 30 days against what the array could
                    have produced under ideal conditions. The difference is broken down here by likely cause.
                    Persistent categories point to something to investigate.
                </InfoTooltip>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginLeft: 4, fontWeight: 400 }}>
                    {Math.round(total).toLocaleString()} kWh unrealised over 30 days
                </span>
            </h2>

            {/* Stacked bar */}
            <div style={{
                display: 'flex',
                height: 26,
                borderRadius: 8,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                marginTop: 8,
            }}>
                {rows.map((r) => {
                    const pct = (buckets[r.key] / total) * 100;
                    return (
                        <div key={r.key} title={`${r.label}: ${pct.toFixed(1)}%`} style={{
                            width: `${pct}%`,
                            background: r.color,
                            transition: 'width 0.3s ease',
                        }} />
                    );
                })}
            </div>

            {/* Legend + numeric breakdown */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
                marginTop: 14,
            }}>
                {rows.map((r) => {
                    const pct = (buckets[r.key] / total) * 100;
                    return (
                        <div key={r.key} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 8,
                        }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, minWidth: 0, color: '#cbd5e1', fontSize: '0.85rem' }}>{r.label}</span>
                            <span style={{ color: '#fff', fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', fontWeight: 600 }}>
                                {pct.toFixed(1)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// AMMP's yield-loss endpoint returns a `data` object whose keys vary by
// tenant. We map every recognisable key into one of five buckets; unknown
// keys fall into `other` so the chart never crashes on a rename.
function extractBuckets(payload) {
    const buckets = { soiling: 0, clipping: 0, outage: 0, curtail: 0, other: 0 };
    const data = payload?.data;
    if (!data || typeof data !== 'object') return buckets;

    for (const [key, series] of Object.entries(data)) {
        const total = sumSeries(series);
        if (total <= 0) continue;
        const bucket = classifyLoss(key);
        buckets[bucket] += total;
    }
    return buckets;
}

function sumSeries(series) {
    const arr = series?.data;
    if (!Array.isArray(arr)) return 0;
    let s = 0;
    for (const p of arr) if (typeof p?.value === 'number' && p.value > 0) s += p.value;
    return s;
}

function classifyLoss(rawKey) {
    const k = rawKey.toLowerCase();
    if (/soil|shad|dust|dirt/.test(k))       return 'soiling';
    if (/clip|inverter/.test(k))             return 'clipping';
    if (/outage|down|grid|genset/.test(k))   return 'outage';
    if (/curtail|export/.test(k))            return 'curtail';
    return 'other';
}
