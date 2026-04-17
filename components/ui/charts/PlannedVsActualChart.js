"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { useMemo } from "react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Plugin to draw a minimum-height bar so planned data is visible even at 0
const minBarHeightPlugin = {
  id: 'minBarHeight',
  beforeDraw(chart) {
    const meta = chart.getDatasetMeta(0); // Planned dataset is index 0
    if (!meta || meta.hidden) return;
    meta.data.forEach((bar) => {
      const minPixelHeight = 4;
      if (Math.abs(bar.base - bar.y) < minPixelHeight) {
        bar.y = bar.base - minPixelHeight;
      }
    });
  }
};

// Generate all dates between start and end (inclusive) as 'YYYY-MM-DD'
const daysBetween = (start, end) => {
  const out = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const stop = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= stop) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

// How many days in a given month/year
const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

// Format 'YYYY-MM-DD' to a short label like '12 Mar'
const dayLabel = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export default function PlannedVsActualChart({
  plannedData = [],
  historicPv = [],       // [{date: 'YYYY-MM-DD', value: number(Wh)}]
  startDate,
  endDate
}) {
  const chart = useMemo(() => {
    if (!startDate || !endDate) {
      return { labels: [], datasets: [] };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1) Build the full list of days in the selected range
    const dayKeys = daysBetween(start, end);
    const labels = dayKeys.map(dayLabel);

    // 2) Map historic PV daily data (Wh → kWh) keyed by date
    const pvByDay = {};
    (Array.isArray(historicPv) ? historicPv : []).forEach((d) => {
      const key = new Date(d.date).toISOString().slice(0, 10);
      const wh = Number(d.value || 0);
      pvByDay[key] = (pvByDay[key] || 0) + wh / 1000; // → kWh
    });

    // 3) Distribute monthly planned values evenly across the days of each month
    const plannedByDay = {};
    (Array.isArray(plannedData) ? plannedData : []).forEach((p) => {
      const y = Number(p.year);
      const m = Number(p.month);
      if (!y || !m) return;
      const totalDays = daysInMonth(y, m);
      const dailyValue = (Number(p.expected_value || 0) / 1000) / totalDays; // monthly kWh → daily kWh
      // Fill each day of that month
      for (let d = 1; d <= totalDays; d++) {
        const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        plannedByDay[key] = dailyValue;
      }
    });

    // 4) Build datasets aligned to the day keys
    const plannedValues = dayKeys.map((k) => Math.round((plannedByDay[k] || 0) * 100) / 100);
    const actualValues = dayKeys.map((k) => Math.round((pvByDay[k] || 0) * 100) / 100);

    return {
      labels,
      datasets: [
        {
          label: "Planned (kWh)",
          data: plannedValues,
          backgroundColor: "rgba(248, 122, 110, 0.8)",
        },
        {
          label: "Actual (kWh)",
          data: actualValues,
          backgroundColor: "rgba(105, 91, 206, 0.8)",
        }
      ]
    };
  }, [plannedData, historicPv, startDate, endDate]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} kWh`
        }
      }
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxRotation: 45,
          minRotation: 30,
          maxTicksLimit: 31,
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v) => `${v.toLocaleString()} kWh`
        }
      }
    }
  };

  const hasData =
    chart.labels?.length &&
    (chart.datasets?.[0]?.data?.some(n => n > 0) || chart.datasets?.[1]?.data?.some(n => n > 0));

  if (!hasData) {
    return <p style={{ textAlign: "center", width: '100%' }}>No data available for this period</p>;
  }

  return (
    <div style={{ width: "100%", height: 420 }}>
      <Bar data={chart} options={options} plugins={[minBarHeightPlugin]} />
    </div>
  );
}
