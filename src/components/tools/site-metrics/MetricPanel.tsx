import { COLOR } from "@lib/constants";
import { clx } from "@lib/helpers";
import { Line } from "react-chartjs-2";
import type { ChartOptions, Plugin } from "chart.js";
import { DateTime } from "luxon";
import type { MetricKey, SiteMetricsRow } from "./types";
import {
  formatAxis,
  formatDaily,
  formatTooltipValue,
  formatTotal,
  rowValue,
  toUtcIso,
} from "./utils";

const MAX_X_TICKS = 6;
const GRID_COLOR = "rgba(128,128,128,0.15)";
const HOVER_DAY_GUIDE_COLOR = "rgba(24,24,27,0.6)";

const hoverDayGuidePlugin: Plugin<"line"> = {
  id: "siteMetricsHoverDayGuide",
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements();
    const x = active?.[0]?.element.x;

    if (!Number.isFinite(x)) return;

    const { ctx, chartArea } = chart;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = HOVER_DAY_GUIDE_COLOR;
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

type MetricPanelProps = {
  title: string;
  dailyLabel: string;
  totalLabel: string;
  metricKey: MetricKey;
  rows: SiteMetricsRow[];
  daily: number;
  total: number;
  color: string;
  colorH: string;
  loading: boolean;
  mounted: boolean;
  chartOptions: ChartOptions<"line">;
  chartPixelRatio: number;
};

export default function MetricPanel({
  title,
  dailyLabel,
  totalLabel,
  metricKey,
  rows,
  daily,
  total,
  color,
  colorH,
  loading,
  mounted,
  chartOptions,
  chartPixelRatio,
}: MetricPanelProps) {
  const hasData = rows.length > 0;

  return (
    <div className="flex min-h-0 flex-col bg-bg-white p-3 lg:h-full lg:p-3">
      <div className="shrink-0">
        <h2 className="text-body-lg font-semibold text-txt-black-900">
          {title}
        </h2>
        <div className="mt-1.5 flex gap-6">
          <div>
            <p className="text-body-xs text-txt-black-500">{dailyLabel}</p>
            <p className="font-heading text-body-lg font-semibold text-txt-black-900">
              {loading ? "—" : formatDaily(daily)}
            </p>
          </div>
          <div>
            <p className="text-body-xs text-txt-black-500">{totalLabel}</p>
            <p className="font-heading text-body-lg font-semibold text-txt-black-900">
              {loading ? "—" : formatTotal(total)}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-3 min-h-0 w-full flex-1 max-lg:h-[min(42svh,13rem)] lg:mt-2">
        {loading ? (
          <div className="flex h-full items-center justify-center text-body-sm text-txt-black-500">
            …
          </div>
        ) : mounted && hasData ? (
          <Line
            key={chartPixelRatio}
            data={{
              datasets: [
                {
                  label: title,
                  data: rows.map((row) => ({
                    x: toUtcIso(`${row["timeseries.date"]} 00:00:00`),
                    y: rowValue(row, metricKey),
                  })),
                  borderColor: color,
                  backgroundColor: colorH,
                  borderWidth: 1.25,
                  pointRadius: 0,
                  pointHoverRadius: 3,
                  fill: true,
                  tension: 0,
                },
              ],
            }}
            options={{ ...chartOptions, devicePixelRatio: chartPixelRatio }}
            plugins={[hoverDayGuidePlugin]}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-body-sm text-txt-black-500">
            —
          </div>
        )}
      </div>
    </div>
  );
}

export const ROW_COLORS = [
  { color: COLOR.PRIMARY, colorH: COLOR.PRIMARY_H },
  { color: COLOR.PRIMARY, colorH: COLOR.PRIMARY_H },
  { color: COLOR.PRIMARY, colorH: COLOR.PRIMARY_H },
  { color: COLOR.DANGER, colorH: COLOR.DANGER_H },
  { color: COLOR.DANGER, colorH: COLOR.DANGER_H },
  { color: COLOR.DANGER, colorH: COLOR.DANGER_H },
] as const;

function buildXTickValues(min: number, max: number): number[] {
  const range = max - min;
  if (!Number.isFinite(range) || range <= 0) return [max];

  const step = range / (MAX_X_TICKS - 1);
  return Array.from({ length: MAX_X_TICKS }, (_, i) =>
    i === MAX_X_TICKS - 1 ? max : min + step * i,
  );
}

function formatXLabel(ms: number): string {
  return DateTime.fromMillis(ms, { zone: "utc" }).toFormat("d MMM");
}

export function buildChartOptions(): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeInOutSine" },
    transitions: { resize: { animation: { duration: 0 } } },
    interaction: { mode: "index", intersect: false },
    layout: {
      padding: { top: 2, bottom: 4, left: 0, right: 2 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${formatTooltipValue(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        type: "time",
        alignToPixels: true,
        time: {
          unit: "day",
          round: "day",
          displayFormats: { day: "d MMM" },
          tooltipFormat: "d MMM yyyy",
        },
        grid: { display: false },
        border: { display: false },
        afterBuildTicks: (scale) => {
          const values = buildXTickValues(scale.min, scale.max);
          scale.ticks = values.map((value) => ({
            value,
            label: formatXLabel(value),
          }));
        },
        ticks: {
          source: "labels",
          autoSkip: false,
          maxRotation: 0,
          color: COLOR.DIM,
          font: { size: 12, family: "Inter" },
        },
      },
      y: {
        beginAtZero: true,
        alignToPixels: true,
        border: { display: false },
        grid: {
          color: GRID_COLOR,
          lineWidth: 1,
        },
        ticks: {
          maxTicksLimit: 6,
          color: COLOR.DIM,
          font: { size: 12, family: "Inter" },
          callback: (value) => formatAxis(value),
        },
      },
    },
  };
}
