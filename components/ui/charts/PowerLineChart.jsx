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


export default function PowerLineChart({ initialData, assetId }) {
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
        a.download = `power_chart_${selectedDate}.png`;
        a.click();
    }, [selectedDate]);

    const fetchData = useCallback(async (interval, date) => {
        setLoading(true);
        try {
            const from = new Date(date + 'T00:00:00Z').toISOString();
            const to = new Date(date + 'T23:59:59Z').toISOString();
            const res = await fetch(
                `/api/ammp/historic-power?assetId=${assetId}&dateFrom=${from}&dateTo=${to}&interval=${interval}`
            );
            const json = await res.json();
            setChartData(json);
        } catch (e) {
            console.error('PowerLineChart fetch error', e);
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

    const pvData = chartData?.pv_power?.data || [];
    const consumptionData = chartData?.consumption_power?.data || [];
    const gridData = (chartData?.external_power ?? chartData?.power_from_grid)?.data || [];

    const labels = pvData.map(d => formatTimeLabel(d.date));

    const data = {
        labels,
        datasets: [
            {
                label: 'PV Power',
                data: pvData.map(d => d.value != null ? +(d.value / 1000).toFixed(3) : null),
                borderColor: '#FF7D70',
                backgroundColor: 'rgba(255,125,112,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: true,
                spanGaps: true,
            },
            {
                label: 'Consumption',
                data: consumptionData.map(d => d.value != null ? +(d.value / 1000).toFixed(3) : null),
                borderColor: '#00C9FF',
                backgroundColor: 'rgba(0,201,255,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: true,
                spanGaps: true,
            },
            {
                label: 'Grid Power',
                data: gridData.map(d => d.value != null ? +(d.value / 1000).toFixed(3) : null),
                borderColor: '#0F69ED',
                backgroundColor: 'rgba(15,105,237,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: true,
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
                    label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2) ?? 'N/A'} kW`,
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#b0b7bd', maxTicksLimit: 12, autoSkip: true, font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
            y: {
                ticks: { color: '#b0b7bd', callback: v => `${v} kW`, font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
        },
    };

    const hasData = pvData.length > 0 || consumptionData.length > 0 || gridData.length > 0;

    return (
        <div className={classes.chartCard}>
            <div className={classes.chartHeader}>
                <h3 className={classes.chartTitle}>Power Sources</h3>
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
                            style={{ background: selectedInterval === intv ? '#FF7D70' : '#1c384e' }}
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
                <div className={`${classes.chartBody} ${classes.chartPlaceholder}`}>No power data available for this period</div>
            ) : (
                <div className={classes.chartBody}>
                    <Line ref={chartRef} data={data} options={options} />
                </div>
            )}
        </div>
    );
}
