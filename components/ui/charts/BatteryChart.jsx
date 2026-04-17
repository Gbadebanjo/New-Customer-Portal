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

function formatTimeLabel(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function BatteryChart({ initialData, assetId }) {
    const [chartData, setChartData] = useState(initialData);
    const [selectedInterval, setSelectedInterval] = useState('15m');
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);
    const chartRef = useRef(null);

    const handleDownload = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const url = chart.toBase64Image('image/png', 1);
        const a = document.createElement('a');
        a.href = url;
        a.download = `battery_chart_${selectedDate}.png`;
        a.click();
    }, [selectedDate]);

    const fetchData = useCallback(async (interval, date) => {
        setLoading(true);
        try {
            const from = new Date(date + 'T00:00:00Z').toISOString();
            const to = new Date(date + 'T23:59:59Z').toISOString();
            const res = await fetch(
                `/api/ammp/historic-battery?assetId=${assetId}&dateFrom=${from}&dateTo=${to}&interval=${interval}`
            );
            const json = await res.json();
            setChartData(json);
        } catch (e) {
            console.error('BatteryChart fetch error', e);
        } finally {
            setLoading(false);
        }
    }, [assetId]);

    const handleIntervalChange = (intv) => {
        setSelectedInterval(intv);
        fetchData(intv, selectedDate);
    };

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
        fetchData(selectedInterval, e.target.value);
    };

    const socData = chartData?.battery_soc?.data || [];
    const chargeData = chartData?.battery_charge_power?.data || [];
    const dischargeData = chartData?.battery_discharge_power?.data || [];

    // Use SOC timestamps as labels (most reliable), fall back to charge data
    const baseData = socData.length > 0 ? socData : chargeData;
    const labels = baseData.map(d => formatTimeLabel(d.date));

    // Build a lookup by date string for alignment
    const toMap = (arr) => {
        const m = {};
        arr.forEach(d => { m[d.date] = d.value; });
        return m;
    };
    const socMap = toMap(socData);
    const chargeMap = toMap(chargeData);
    const dischargeMap = toMap(dischargeData);

    const baseDates = baseData.map(d => d.date);

    const data = {
        labels,
        datasets: [
            {
                label: 'Charge Power (kW)',
                data: baseDates.map(date => {
                    const v = chargeMap[date];
                    return v != null ? +(v / 1000).toFixed(3) : null;
                }),
                borderColor: '#52D869',
                backgroundColor: 'rgba(82,216,105,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                yAxisID: 'yPower',
                spanGaps: true,
            },
            {
                label: 'Discharge Power (kW)',
                data: baseDates.map(date => {
                    const v = dischargeMap[date];
                    return v != null ? +(v / 1000).toFixed(3) : null;
                }),
                borderColor: '#FF4444',
                backgroundColor: 'rgba(255,68,68,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                yAxisID: 'yPower',
                spanGaps: true,
            },
            {
                label: 'State of Charge (%)',
                data: baseDates.map(date => {
                    const v = socMap[date];
                    return v != null ? +v.toFixed(1) : null;
                }),
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255,215,0,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                yAxisID: 'ySOC',
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
                        if (ctx.dataset.yAxisID === 'ySOC') {
                            return `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1) ?? 'N/A'}%`;
                        }
                        return `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2) ?? 'N/A'} kW`;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#b0b7bd', maxTicksLimit: 12, autoSkip: true, font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
            yPower: {
                type: 'linear',
                position: 'left',
                ticks: { color: '#b0b7bd', callback: v => `${v} kW`, font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
                title: { display: true, text: 'Power (kW)', color: '#b0b7bd', font: { size: 11 } },
            },
            ySOC: {
                type: 'linear',
                position: 'right',
                min: 0,
                max: 100,
                ticks: { color: '#FFD700', callback: v => `${v}%`, font: { size: 11 } },
                grid: { drawOnChartArea: false },
                title: { display: true, text: 'SOC (%)', color: '#FFD700', font: { size: 11 } },
            },
        },
    };

    const hasData = socData.length > 0 || chargeData.length > 0 || dischargeData.length > 0;

    return (
        <div className={classes.chartCard}>
            <div className={classes.chartHeader}>
                <h3 className={classes.chartTitle}>Battery System</h3>
                <div className={classes.chartControls}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className={classes.dateInput}
                    />
                    {['15m', '1h'].map(intv => (
                        <button
                            key={intv}
                            onClick={() => handleIntervalChange(intv)}
                            className={classes.intervalBtn}
                            style={{ background: selectedInterval === intv ? '#52D869' : '#1c384e' }}
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
                <div className={`${classes.chartBody} ${classes.chartPlaceholder}`}>Loading...</div>
            ) : !hasData ? (
                <div className={`${classes.chartBody} ${classes.chartPlaceholder}`}>No battery data available for this period</div>
            ) : (
                <div className={classes.chartBody}>
                    <Line ref={chartRef} data={data} options={options} />
                </div>
            )}
        </div>
    );
}
