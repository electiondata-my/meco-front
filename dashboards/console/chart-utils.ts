import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { Period } from "./utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

// Forces the legend block to a fixed height on every chart so both plot areas are pixel-identical
export const fixedLegendPlugin = {
  id: "fixedLegend",
  beforeInit(chart: ChartJS) {
    const legend = chart.legend as any;
    if (!legend) return;
    const originalFit = legend.fit?.bind(legend);
    if (!originalFit) return;
    legend.fit = function () {
      originalFit();
      this.height = 36;
    };
  },
};

export const CHART_OPTIONS_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: { legend: { position: "top" as const } },
  scales: {
    y: { grid: { color: "rgba(128,128,128,0.15)" } },
  },
};

// Tinybird returns timestamps as "YYYY-MM-DD HH:MM:SS" (space separator, no timezone).
// Luxon requires a proper ISO 8601 string with T separator and timezone.
export function toUtcIso(s: string): string {
  const withT = s.replace(" ", "T");
  return /[Zz]|[+-]\d{2}:?\d{2}$/.test(withT) ? withT : withT + "Z";
}

// Time-scale x-axis config, human-readable per period
export function timeXAxis(period: Period) {
  const unit: Record<Period, "minute" | "hour" | "day"> = {
    "1h": "minute",
    "24h": "hour",
    "7d": "hour",
    "30d": "day",
  };
  const fmt: Record<Period, string> = {
    "1h": "HH:mm",
    "24h": "HH:mm",
    "7d": "d MMM HH:mm",
    "30d": "d MMM",
  };
  const u = unit[period];
  return {
    type: "time" as const,
    time: {
      unit: u,
      displayFormats: { [u]: fmt[period] },
      tooltipFormat: "d MMM yyyy, HH:mm",
    },
    grid: { display: false },
    ticks: { maxRotation: 0 },
  };
}
