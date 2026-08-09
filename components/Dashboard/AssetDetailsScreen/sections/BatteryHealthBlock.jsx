import AmmpServices from '@/lib/services/ammp/AmmpServices';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';

/**
 * Battery health summary for hybrid / battery-only sites. Reads
 * historic-battery-data over the last 24h and picks out the latest available
 * value for each metric — SOC, charge/discharge, temperature, cycle count,
 * plus life-to-date totals.
 *
 * Only mounted when siteType.hasBattery on the parent. Renders nothing if
 * the endpoint returns no data (fails silently).
 */
export default async function BatteryHealthBlock({ assetId, token }) {
    if (!token || !assetId) return null;

    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    let data = null;
    try {
        data = await AmmpServices().getHistoricBatteryData(token, assetId, from, to, '15m');
    } catch { /* silent */ }
    if (!data) return null;

    const latest = (series) => {
        const arr = series?.data;
        if (!Array.isArray(arr)) return null;
        for (let i = arr.length - 1; i >= 0; i--) {
            const v = arr[i]?.value;
            if (typeof v === 'number' && !isNaN(v)) return v;
        }
        return null;
    };

    const soc = latest(data.soc);
    const charge = latest(data.battery_charge_power);
    const discharge = latest(data.battery_discharge_power);
    const temp = latest(data.battery_temperature);
    const voltage = latest(data.battery_voltage);
    const cycles = latest(data.cycle_count);
    const ltdCharge = latest(data.life_to_date_charge);
    const ltdDischarge = latest(data.life_to_date_discharge);

    // If literally every value is null there's no signal to show — hide.
    const anyValue = [soc, charge, discharge, temp, voltage, cycles, ltdCharge, ltdDischarge]
        .some((v) => v != null);
    if (!anyValue) return null;

    const cards = [
        soc != null       && { label: 'State of charge', value: `${Math.round(soc)} %`, tip: 'How full the battery is right now.' },
        (charge != null || discharge != null) && {
            label: 'Charge / Discharge (now)',
            value: `${fmtPower(charge)} / ${fmtPower(discharge)}`,
            tip: 'Instantaneous flow into and out of the battery, in kilowatts.',
        },
        temp != null      && { label: 'Temperature', value: `${Math.round(temp)} °C`, tip: 'Cell temperature — high readings shorten battery life.' },
        voltage != null   && { label: 'Voltage',     value: `${voltage.toFixed(1)} V` },
        cycles != null    && { label: 'Cycle count', value: Math.round(cycles).toLocaleString(), tip: 'Total charge–discharge cycles the pack has completed.' },
        ltdDischarge != null && {
            label: 'Life-to-date discharge',
            value: `${(ltdDischarge / 1000).toFixed(1)} MWh`,
            tip: 'Total energy the battery has delivered since installation.',
        },
    ].filter(Boolean);

    return (
        <div style={{ padding: '0 20px', marginTop: 20 }}>
            <h2 style={{
                color: '#4b7a9c', fontSize: '1.5rem', fontWeight: 600, marginBottom: 12,
                fontFamily: 'Kanit, sans-serif',
            }}>
                Battery Health
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginLeft: 12, fontWeight: 400 }}>
                    Last reading (past 24 h)
                </span>
            </h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
            }}>
                {cards.map((c) => (
                    <div key={c.label} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12,
                        padding: '14px 18px',
                    }}>
                        <div style={{
                            color: 'rgba(255,255,255,0.65)',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 4,
                        }}>
                            {c.label}
                            {c.tip && (
                                <InfoTooltip title={c.label} placement="bottom">{c.tip}</InfoTooltip>
                            )}
                        </div>
                        <div style={{
                            color: '#fff',
                            fontSize: '1.6rem',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            fontFamily: 'Kanit, sans-serif',
                        }}>{c.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function fmtPower(w) {
    if (w == null) return '—';
    return `${(w / 1000).toFixed(1)} kW`;
}
