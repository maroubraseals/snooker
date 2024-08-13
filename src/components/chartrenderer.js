import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const PlayerChart = ({ playerName, playerStats }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.destroy(); // Destroy previous chart instance
        }

        if (chartRef.current) {
            chartInstance.current = new Chart(chartRef.current, {
                type: 'bar',
                data: {
                    labels: ['Frame Played', 'Frame Won', 'Frame Lost', '', 'Match Played', 'Match Won', 'Match Lost'],
                    datasets: [
                        {
                            label: `${playerName}'s Stats`,
                            backgroundColor: [
                                'rgba(54, 162, 235)',
                                'rgba(255, 99, 132)',
                                'rgba(75, 192, 192)',
                                'rgba(0, 0, 0, 0)', // Transparent color for gap
                                'rgba(255, 206, 86)',
                                'rgba(153, 102, 255)', 
                                'rgba(255, 159, 64)', 
                            ],
                            borderColor: ['black','black','black', 'rgba(0, 0, 0, 0)', 'red', 'red', 'red'],
                            borderWidth: 2,
                            data: playerStats,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false, // Hide x-axis grid lines
                            },
                        },
                        y: {
                            beginAtZero: true,
                        },
                    },
                },
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [playerName, playerStats]); // Re-run effect when playerName or playerStats change

    return (
        <div style={{ width: '600px', height: '400px', margin: '20px auto', border: '1px solid #ccc', borderRadius: '5px', padding: '10px' }}>
            <canvas ref={chartRef}></canvas>
        </div>
    );
};

export default PlayerChart;

