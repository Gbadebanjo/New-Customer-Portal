import Badge from '@/components/ui/Badge/Badge';
import InfoTooltip from '@/components/ui/InfoTooltip/InfoTooltip';
import classes from './compare.module.css';

function fmt(n, digits = 0) {
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n);
}

function pct(n) {
    if (n == null || isNaN(n)) return '—';
    return `${Math.round(n)}%`;
}

// Map the per-site data-source flag produced by getCompareData into a small
// Badge — the customer can see at a glance whether these numbers have been
// signed off, are still being reviewed, or are live/unverified.
function dataSourceBadge(source) {
    switch (source) {
        case 'verified': return { label: 'Verified',      variant: 'verified',    title: 'Every day in this range has been reviewed by our team.' };
        case 'partial':  return { label: 'Partly verified', variant: 'provisional', title: 'Some days in this range have been reviewed; others are still being processed.' };
        case 'raw':      return { label: 'Awaiting review', variant: 'provisional', title: 'These figures have been recorded but not yet reviewed by our team.' };
        case 'live':     return { label: 'Live',          variant: 'neutral',     title: 'These figures came straight from the site meters; verification will follow.' };
        default:         return null;
    }
}

function relativeTime(iso) {
    if (!iso) return 'Unknown';
    const then = new Date(iso).getTime();
    if (isNaN(then)) return 'Unknown';
    const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// Reusable header cell with an optional ⓘ tooltip next to the label.
function TH({ children, tooltip, title }) {
    return (
        <th>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {children}
                {tooltip && (
                    <InfoTooltip title={title || (typeof children === 'string' ? children : undefined)} placement="bottom">
                        {tooltip}
                    </InfoTooltip>
                )}
            </span>
        </th>
    );
}

// Simple SVG bar chart — one bar per site, scaled to the max value.
function BarRow({ sites, valueOf, label, tooltip, unit, digits = 0 }) {
    const max = Math.max(1, ...sites.map((s) => valueOf(s) || 0));
    return (
        <div className={classes.barBlock}>
            <div className={classes.barBlockLabel}>
                {label}
                {tooltip && (
                    <InfoTooltip title={label} placement="bottom">{tooltip}</InfoTooltip>
                )}
            </div>
            {sites.map((s) => {
                const v = valueOf(s) || 0;
                const width = Math.round((v / max) * 100);
                return (
                    <div key={s.id} className={classes.barRow}>
                        <span className={classes.barRowName}>{s.name}</span>
                        <div className={classes.barTrack}>
                            <div
                                className={classes.barFill}
                                style={{ width: `${width}%` }}
                            />
                        </div>
                        <span className={classes.barRowValue}>
                            {fmt(v, digits)}{unit ? ` ${unit}` : ''}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Renders the compare results — a side-by-side table plus a couple of
 * simple bar rows for at-a-glance comparison.
 */
export default function CompareResults({ data }) {
    if (!data || !Array.isArray(data.sites) || data.sites.length === 0) {
        return <div className={classes.empty}>Nothing to compare — those sites may not have data yet.</div>;
    }
    const { sites, windowDays, sourceMix } = data;

    // Overall verification badge for the window. Uses the resolver's
    // sourceMix — one authoritative summary for the whole result set.
    const verifBadge = (() => {
        if (!sourceMix) return null;
        const total = sourceMix.verified + sourceMix.raw + sourceMix.live + sourceMix.unavailable;
        if (total === 0) return null;
        if (sourceMix.verified === total) {
            return { label: 'All data verified', variant: 'verified' };
        }
        if (sourceMix.verified > 0) {
            return { label: `Partially verified — ${sourceMix.verified}/${total} days`, variant: 'provisional' };
        }
        return { label: 'Live data — pending verification', variant: 'neutral' };
    })();

    return (
        <div className={classes.results}>
            <h2 className={classes.resultsTitle} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {sites.length} sites · last {windowDays} days
                {verifBadge && (
                    <Badge variant={verifBadge.variant}>{verifBadge.label}</Badge>
                )}
            </h2>

            <BarRow
                sites={sites}
                valueOf={(s) => s.solarKwh}
                label="Solar produced (kWh)"
                tooltip={
                    <>
                        Total electricity your panels generated over the selected window,
                        measured directly from your inverters. Bigger sites will naturally
                        produce more — compare against capacity below to see who&rsquo;s working
                        their array hardest.
                    </>
                }
                unit="kWh"
                digits={0}
            />
            <BarRow
                sites={sites}
                valueOf={(s) => s.co2AvoidedKg}
                label="CO₂ avoided (kg)"
                tooltip={
                    <>
                        Carbon emissions kept out of the air because these sites ran on
                        solar instead of the grid. Shown as <strong>Verified</strong> when
                        the figure came straight from your site&rsquo;s environmental readings,
                        or <strong>Estimated</strong> when we calculated it from solar
                        production (~0.55 kg CO<sub>2</sub> per kWh).
                    </>
                }
                unit="kg"
                digits={0}
            />

            <div className={classes.tableWrap}>
                <table className={classes.compareTable}>
                    <thead>
                        <tr>
                            <TH>Site</TH>
                            <TH
                                tooltip={
                                    <>
                                        The site&rsquo;s installed solar capacity — the maximum power
                                        the array can deliver under ideal sunlight. A useful yardstick
                                        for judging whether a site&rsquo;s output looks right for its size.
                                    </>
                                }
                            >
                                Capacity
                            </TH>
                            <TH
                                tooltip={
                                    <>
                                        Total kilowatt-hours of electricity your panels generated
                                        across the selected window. Same number as the bar above.
                                    </>
                                }
                            >
                                Solar produced
                            </TH>
                            <TH
                                title="Solar share"
                                tooltip={
                                    <>
                                        Share of the site&rsquo;s total electricity that came from solar
                                        over this window — the rest came from grid or generator.
                                        <br /><br />
                                        <strong>High (80%+)</strong> — mostly solar; grid/genset just topped up.<br />
                                        <strong>Mid (40–70%)</strong> — hybrid; solar carried a meaningful share.<br />
                                        <strong>Low (&lt;30%)</strong> — solar contributed little, either due
                                        to low output (weather, downtime) or heavy consumption.<br />
                                        <strong>—</strong> — no consumption data was reported for this window.
                                    </>
                                }
                            >
                                Solar share
                            </TH>
                            <TH
                                title="CO₂ avoided"
                                tooltip={
                                    <>
                                        Same figure as the CO<sub>2</sub> bar above. The badge shows
                                        whether it came straight from your site&rsquo;s environmental
                                        reading (<strong>Verified</strong>) or was calculated from
                                        solar production (<strong>Estimated</strong>).
                                    </>
                                }
                            >
                                CO₂ avoided
                            </TH>
                            <TH
                                title="Last heard"
                                tooltip={
                                    <>
                                        How long ago we last received data from this site.
                                        Anything over an hour is worth checking — the site may be
                                        offline or its logger may have dropped.
                                    </>
                                }
                            >
                                Last heard
                            </TH>
                            <TH
                                title="Data"
                                tooltip={
                                    <>
                                        Whether the numbers on this row have been reviewed by
                                        our team. <strong>Verified</strong> = fully signed off,{' '}
                                        <strong>Partly verified</strong> = some days still being
                                        reviewed, <strong>Awaiting review</strong> = recorded but
                                        not yet checked, <strong>Live</strong> = straight from
                                        the meters.
                                    </>
                                }
                            >
                                Data
                            </TH>
                        </tr>
                    </thead>
                    <tbody>
                        {sites.map((s) => {
                            const dataBadge = dataSourceBadge(s.dataSource);
                            return (
                                <tr key={s.id}>
                                    <td>{s.name}</td>
                                    <td>{s.capacityKw != null ? `${fmt(s.capacityKw)} kW` : '—'}</td>
                                    <td>{fmt(s.solarKwh)} kWh</td>
                                    <td>{pct(s.solarSharePct)}</td>
                                    <td>
                                        {fmt(s.co2AvoidedKg)} kg{' '}
                                        <Badge variant={s.co2Source === 'verified' ? 'verified' : 'provisional'}>
                                            {s.co2Source === 'verified' ? 'Verified' : 'Estimated'}
                                        </Badge>
                                    </td>
                                    <td>{relativeTime(s.lastReceived)}</td>
                                    <td>
                                        {dataBadge && (
                                            <span title={dataBadge.title}>
                                                <Badge variant={dataBadge.variant}>{dataBadge.label}</Badge>
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
