import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

const DonutChartComponent = ({ totals }) => {
      // Defensive defaults
    const pv = totals?.TotalMostRecentPvPower || 0;
    const genset = totals?.TotalMostRecentGensetPower || 0;
    const grid = totals?.TotalMostRecentPowerFromGrid || 0;

    const total = pv + genset + grid;


    // Calculate percentages
    const pvPercent = Math.floor((pv / total) * 100) || 0;
    const gensetPercent = Math.floor((genset / total) * 100) || 0;
    const gridPercent = Math.floor((totals?.TotalMostRecentPowerFromGrid / total) * 100) || 0;

    const data = {
        labels: [
            "Power Supplied  Solar",
            'Power Supplied  Generator',
            'Power Supplied the Grid'
        ],
        datasets: [
            {
                label: '',
                data: [pvPercent, gensetPercent, gridPercent],
                backgroundColor: ['#FF7D70', '#0F69ED', '#00C9FF'],
                hoverBackgroundColor: ['#FF7D70', '#0F69ED', '#00C9FF'],
                borderWidth: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        cutout: '75%',
    };

    const legendItems = [
        { label: "Solar", color: "#FF7D70", percent: pvPercent },
        { label: "Generator", color: "#0F69ED", percent: gensetPercent },
        { label: "Grid", color: "#00C9FF", percent: gridPercent },
    ];

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '18px',
            justifyContent: 'center',
            width: '100%',
        }}>
            <div style={{
                width: 'min(250px, 80vw)',
                height: 'min(250px, 80vw)',
                position: 'relative',
                flexShrink: 0,
            }}>
                <Doughnut data={data} options={options} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {legendItems.map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{
                            display: 'inline-block',
                            width: 14,
                            height: 14,
                            background: item.color,
                            borderRadius: '50%',
                            marginRight: 8,
                            flexShrink: 0,
                        }} />
                        <span style={{ minWidth: 70 }}>{item.label}</span>
                        <span style={{ fontWeight: 600, marginLeft: 8 }}>{item.percent}%</span>
                    </div>
                ))}
            </div>
        </div>
    );

};

export default DonutChartComponent;