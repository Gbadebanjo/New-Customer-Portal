'use client';
import { useEffect, useState } from 'react';
import { getPeriodComparison } from '@/lib/controllers/energy/getPeriodComparison';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import Badge from '@/components/ui/Badge/Badge';
import { toCommaAmount } from '@/utils/constants';

const PERIODS = [
    { key: 'day',   label: 'Daily' },
    { key: 'week',  label: 'Weekly' },
    { key: 'month', label: 'Monthly' },
];

function sourceBadge(source) {
    if (source === 'verified') return { variant: 'verified', label: 'Verified' };
    if (source === 'partial')  return { variant: 'provisional', label: 'Partially verified' };
    if (source === 'raw')      return { variant: 'provisional', label: 'Provisional' };
    return { variant: 'provisional', label: 'Live' };
}

/**
 * Solar-production comparison card — user picks Daily / Weekly / Monthly.
 * Compares the current period to the previous equivalent, showing kWh
 * delta and % change. Uses the resolver so NOC-verified numbers are shown
 * whenever available (badge tells the user which they see).
 */
export default function PeriodComparisonCard({ userId }) {
    const [period, setPeriod] = useState('week');
    const [state, setState] = useState({ loading: true, data: null });

    useEffect(() => {
        let cancelled = false;
        setState((s) => ({ ...s, loading: true }));
        (async () => {
            const data = await getPeriodComparison(userId, period);
            if (!cancelled) setState({ loading: false, data });
        })();
        return () => { cancelled = true; };
    }, [userId, period]);

    const d = state.data;
    const available = d?.available;
    const positive = d?.deltaKwh != null && d.deltaKwh >= 0;
    const badge = available ? sourceBadge(d.currentSource) : null;

    return (
        <div style={{
            padding: '18px 22px',
            borderRadius: 14,
            background: 'rgba(59, 68, 75, 0.65)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            width: '100%',
            boxSizing: 'border-box',
        }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12,
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <h3 style={{
                        fontSize: '1.05rem', fontWeight: 600, margin: 0,
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        Solar production trend
                        <InfoTooltip title="Solar production trend">
                            Compares your solar output this period to the equivalent previous period. Uses our team-verified numbers when available; falls back to raw meter readings otherwise.
                        </InfoTooltip>
                    </h3>
                    {available && d?.solarSiteCount != null && (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                            Across your {d.solarSiteCount} solar site{d.solarSiteCount === 1 ? '' : 's'}
                            {d.totalSiteCount > d.solarSiteCount && (
                                <> · {d.totalSiteCount - d.solarSiteCount} non-solar site{d.totalSiteCount - d.solarSiteCount === 1 ? '' : 's'} excluded</>
                            )}
                        </span>
                    )}
                </div>
                <div style={{ display: 'inline-flex', gap: 4 }}>
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => setPeriod(p.key)}
                            style={{
                                padding: '5px 12px',
                                borderRadius: 8,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: '1px solid ' + (period === p.key ? 'rgba(255,125,112,0.5)' : 'rgba(255,255,255,0.1)'),
                                background: period === p.key ? 'rgba(255,125,112,0.14)' : 'transparent',
                                color: period === p.key ? '#ff9770' : 'rgba(255,255,255,0.7)',
                            }}
                        >{p.label}</button>
                    ))}
                </div>
            </div>

            {state.loading ? (
                <div style={{ padding: '18px 0', color: 'rgba(255,255,255,0.55)' }}>
                    Loading comparison…
                </div>
            ) : !available ? (
                <div style={{
                    padding: '16px 18px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: '0.88rem',
                }}>
                    {d?.reason === 'no-solar-sites'
                        ? 'Your account has no solar-producing sites, so there is no production to trend here.'
                        : d?.reason === 'no-sites'
                            ? 'No sites are attached to your account yet.'
                            : 'Data is not available for this period yet.'}
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 20,
                    alignItems: 'end',
                }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>
                            {d.currentLabel}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.1, marginTop: 2, fontFamily: 'Kanit, sans-serif' }}>
                            {toCommaAmount(Math.round(d.currentKwh))} kWh
                        </div>
                        {badge && (
                            <div style={{ marginTop: 6 }}>
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>
                            {d.previousLabel}
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontFamily: 'Kanit, sans-serif' }}>
                            {d.previousHasData ? `${toCommaAmount(Math.round(d.previousKwh))} kWh` : '—'}
                        </div>
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>
                            Change
                        </div>
                        {d.deltaPct == null ? (
                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
                                No previous period to compare
                            </div>
                        ) : (
                            <div style={{
                                marginTop: 2,
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: positive ? '#4caf50' : '#ff7d70',
                                fontFamily: 'Kanit, sans-serif',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                            }}>
                                <span>{positive ? '▲' : '▼'}</span>
                                <span>{Math.abs(Math.round(d.deltaPct))}%</span>
                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                                    ({positive ? '+' : ''}{toCommaAmount(Math.round(d.deltaKwh))} kWh)
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
