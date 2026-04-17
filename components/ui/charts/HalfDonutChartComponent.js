"use client"
import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

const HalfDonutChartComponent = ({ numerator }) => {

    const data = {
        labels: [],
        datasets: [
            {
                label: 'Power Sources',
                data: [
                    numerator,
                    (100 - numerator),
                ],
                backgroundColor: ['#FF7D70', '#325168'],
                hoverBackgroundColor: ['#FF7D70', '#325168'],
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
        cutout: '70%',
        circumference: 180,
        rotation: 270,
    };

    const chartContainerStyle = {
        width: '100px', // Set the desired width
        height: '100px', // Set the desired height
        position: 'relative',

    };

    return (
        <div style={chartContainerStyle}>
            <Doughnut data={data} options={options} />
        </div>
    );
};

export default HalfDonutChartComponent;
