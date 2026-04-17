'use client';

import { useState, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { MdFileDownload } from 'react-icons/md';
import classes from './chart.module.css';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function formatLabel(dateStr, interval) {
    const d = new Date(dateStr);
    if (interval === '1M') return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
    if (interval === '1d') return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function defaultDateRange() {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return {
        from: from.toISOString().slice(0, 10),
        to: now.toISOString().slice(0, 10),
    };
}

export default function PerformanceLineChart({ initialData, assetId }) {
    const defaults = defaultDateRange();
    const [chartData, setChartData] = useState(initialData);
    const [selectedInterval, setSelectedInterval] = useState('1h');
    const [dateFrom, setDateFrom] = useState(defaults.from);
    const [dateTo, setDateTo] = useState(defaults.to);
    const [loading, setLoading] = useState(false);
    const chartRef = useRef(null);

    const handleDownload = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const url = chart.toBase64Image('image/png', 1);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance_chart_${dateFrom}_${dateTo}.png`;
        a.click();
    }, [dateFrom, dateTo]);

    const fetchData = useCallback(async (interval, from, to) => {
        setLoading(true);
        try {
            const fromISO = new Date(from + 'T00:00:00Z').toISOString();
            const toISO = new Date(to + 'T23:59:59Z').toISOString();
            const res = await fetch(
                `/api/ammp/historic-kpi?assetId=${assetId}&dateFrom=${fromISO}&dateTo=${toISO}&interval=${interval}`
            );
            const json = await res.json();
            setChartData(json);
        } catch (e) {
            console.error('PerformanceLineChart fetch error', e);
        } finally {
            setLoading(false);
        }
    }, [assetId]);

    const handleIntervalChange = (intv) => {
        setSelectedInterval(intv);
        fetchData(intv, dateFrom, dateTo);
    };

    const handleFromChange = (e) => {
        setDateFrom(e.target.value);
        fetchData(selectedInterval, e.target.value, dateTo);
    };

    const handleToChange = (e) => {
        setDateTo(e.target.value);
        fetchData(selectedInterval, dateFrom, e.target.value);
    };

    // AMMP KPI fields — handle multiple possible field names defensively
    const actualData = (chartData?.pv_power ?? chartData?.actual_pv_power)?.data || [];
    const expectedData = (chartData?.expected_pv_power ?? chartData?.irradiance_power ?? chartData?.theoretical_power)?.data || [];
    const prData = chartData?.performance_ratio?.data || [];

    // Use the longest dataset as the label base
    const baseData = [actualData, expectedData, prData].reduce((a, b) => a.length >= b.length ? a : b, []);
    const labels = baseData.map(d => formatLabel(d.date, selectedInterval));

    const toMap = (arr) => {
        const m = {};
        arr.forEach(d => { m[d.date] = d.value; });
        return m;
    };

    const actualMap = toMap(actualData);
    const expectedMap = toMap(expectedData);
    const prMap = toMap(prData);
    const baseDates = baseData.map(d => d.date);

    const data = {
        labels,
        datasets: [
            {
                label: 'Actual PV Power (kW)',
                data: baseDates.map(date => {
                    const v = actualMap[date];
                    return v != null ? +(v / 1000).toFixed(3) : null;
                }),
                borderColor: '#FF7D70',
                backgroundColor: 'rgba(255,125,112,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                yAxisID: 'yPower',
                spanGaps: true,
            },
            {
                label: 'Expected PV Power (kW)',
                data: baseDates.map(date => {
                    const v = expectedMap[date];
                    return v != null ? +(v / 1000).toFixed(3) : null;
                }),
                borderColor: '#60A5FA',
                backgroundColor: 'rgba(96,165,250,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                borderDash: [6, 3],
                yAxisID: 'yPower',
                spanGaps: true,
            },
            {
                label: 'Performance Ratio (%)',
                data: baseDates.map(date => {
                    const v = prMap[date];
                    if (v == null) return null;
                    // PR can come as 0-1 (fraction) or 0-100 — normalise to 0-100
                    return +(v <= 1 ? v * 100 : v).toFixed(1);
                }),
                borderColor: '#34D399',
                backgroundColor: 'rgba(52,211,153,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                yAxisID: 'yPR',
                spanGaps: true,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#e1e7ed', boxWidth: 12, font: { size: 12 } },
            },
            tooltip: {
                callbacks: {
                    label: ctx => {
                        if (ctx.dataset.yAxisID === 'yPR') {
                            return `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1) ?? 'N/A'}%`;
                        }
                        return `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2) ?? 'N/A'} kW`;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#b0b7bd', maxTicksLimit: 14, autoSkip: true, font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
            yPower: {
                type: 'linear',
                position: 'left',
                ticks: { color: '#b0b7bd', callback: v => `${v} kW`, font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
                title: { display: true, text: 'Power (kW)', color: '#b0b7bd', font: { size: 11 } },
            },
            yPR: {
                type: 'linear',
                position: 'right',
                min: 0,
                max: 100,
                ticks: { color: '#34D399', callback: v => `${v}%`, font: { size: 11 } },
                grid: { drawOnChartArea: false },
                title: { display: true, text: 'PR (%)', color: '#34D399', font: { size: 11 } },
            },
        },
    };

    const hasData = actualData.length > 0 || expectedData.length > 0 || prData.length > 0;

    return (
        <div className={classes.chartCard}>
            <div className={classes.chartHeader}>
                <h3 className={classes.chartTitle}>Performance — Expected vs Actual</h3>
                <div className={classes.chartControls}>
                    <label style={{ color: '#b0b7bd', fontSize: '0.85rem' }}>From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={handleFromChange}
                        className={classes.dateInput}
                    />
                    <label style={{ color: '#b0b7bd', fontSize: '0.85rem' }}>To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={handleToChange}
                        className={classes.dateInput}
                    />
                    {['1h', '1d', '1M'].map(intv => (
                        <button
                            key={intv}
                            onClick={() => handleIntervalChange(intv)}
                            className={classes.intervalBtn}
                            style={{
                                background: selectedInterval === intv ? '#34D399' : '#1c384e',
                                color: selectedInterval === intv ? '#0d2638' : '#fff',
                            }}
                        >
                            {intv}
                        </button>
                    ))}
                    <button
                        onClick={handleDownload}
                        className={classes.downloadBtn}
                        title="Download chart as PNG"
                    >
                        <MdFileDownload size={20} />
                    </button>
                </div>
            </div>
            {loading ? (
                <div className={`${classes.chartBodyTall} ${classes.chartPlaceholder}`}>Loading...</div>
            ) : !hasData ? (
                <div className={`${classes.chartBodyTall} ${classes.chartPlaceholder}`}>No performance data available for this period</div>
            ) : (
                <div className={classes.chartBodyTall}>
                    <Line ref={chartRef} data={data} options={options} />
                </div>
            )}
        </div>
    );
}
