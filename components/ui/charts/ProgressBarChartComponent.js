'use client'
import React from 'react';
import Chart from 'chart.js/auto';
import PowerSupGeneratorIcon from "@/components/ui/icons/dashboardIcons/PowerSupGeneratorIcon";
import PowerSupSolarIcon from "@/components/ui/icons/dashboardIcons/PowerSupSolarIcon";
import PowerSupGridIcon from "@/components/ui/icons/dashboardIcons/PowerSupGridIcon";

const labelData = [
    {
        icon: <PowerSupSolarIcon style={{ marginRight: 8, verticalAlign: 'middle' }} />,
        label: "Energy from solar"
    },
    {
        icon: <PowerSupGridIcon style={{ marginRight: 8, verticalAlign: 'middle' }} />,
        label: "Energy from grid"
    },
    {
        icon: <PowerSupGeneratorIcon style={{ marginRight: 8, verticalAlign: 'middle' }} />,
        label: "Energy from generator"
    }
];

const BAR_HEIGHT = 10; // px

const ProgressBarChartComponent = ({ progressData }) => {
    const values = [
        progressData?.energyFromSolar || 0,
        progressData?.energyFromGrid || 0,
        progressData?.energyFromGenerator || 0,
    ];
    const max = Math.max(...values, 1); // Prevent division by zero

    // Bar colors
    const colors = ['#FF7D70', '#0F69ED', '#00C9FF'];

    return (
        <div
            style={{
                width: '100%',
                maxWidth: 900,
                margin: '0 auto',
                padding: 16,
            }}
        >
            {labelData.map((item, idx) => (
                <div
                    key={item.label}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 3fr',
                        alignItems: 'center',
                        borderBottom: '1px solid #263c4c',
                        marginBottom: idx !== labelData.length - 1 ? 28 : 0,
                        paddingBottom: 16,
                        gap: 24,
                    }}
                >
                    {/* Label and icon */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: BAR_HEIGHT,
                    }}>
                        {item.icon}
                        <span style={{
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            marginLeft: 4
                        }}>
                            {item.label}
                        </span>
                    </div>
                    {/* Value on top of bar */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        height: '100%',
                        width: '100%',
                    }}>
                        <span style={{
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '0.95rem',
                            marginBottom: 4,
                            marginLeft: 2,
                        }}>
                            {values[idx]}
                        </span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            height: BAR_HEIGHT,
                            background: '#263c4c',
                            borderRadius: 10,
                            overflow: 'hidden',
                        }}>
                            <div
                                style={{
                                    height: BAR_HEIGHT,
                                    width: `${(values[idx] / max) * 100}%`,
                                    background: colors[idx],
                                    borderRadius: 10,
                                    transition: 'width 0.5s',
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProgressBarChartComponent;