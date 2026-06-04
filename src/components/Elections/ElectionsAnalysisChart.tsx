import "chart.js/auto";
import { StateKeyByName } from "@lib/constants";
import { useEffect, useState } from "react";
import { Scatter } from "react-chartjs-2";

type AnalysisRow = {
  seat: string;
  state: string;
  majority: number | null;
  majority_perc: number | null;
  n_candidates?: number;
  voters_total?: number;
  voter_turnout?: number;
  voter_turnout_perc?: number;
  votes_rejected?: number;
  votes_rejected_perc?: number;
};

export type VarKey = keyof Omit<AnalysisRow, "seat" | "state">;

interface Props {
  rows: AnalysisRow[];
  stateCode: string;
}

const MULTI_STATE = ["mys", "smj"];
const DOT_COLOR = "rgba(239, 68, 68, 0.8)";
const STORAGE_KEY = "meco-elections-state";
const AXIS_FONT_FAMILY =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const AXIS_TICK_COLOR = "#52525B";
const AXIS_TITLE_COLOR = "#3F3F46";
const MOBILE_CHART_HEIGHT = 560;
const DESKTOP_CHART_HEIGHT = 440;
const INTEGER_VARS = new Set<VarKey>([
  "n_candidates",
  "voters_total",
  "voter_turnout",
  "majority",
  "votes_rejected",
]);

function yScaleFloor(values: number[]): { min?: number; suggestedMin?: number } {
  if (values.length === 0) return {};

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const padding = spread > 0 ? spread * 0.08 : Math.max(Math.abs(min) * 0.08, 1);
  const floor = min - padding;

  if (min >= 0 && floor < 0) {
    const visiblePadding = Math.min(padding, Math.max(max * 0.015, 1));
    return { min: -visiblePadding };
  }

  return { suggestedMin: floor };
}

function stateShortLabel(stateName: string): string {
  return (StateKeyByName[stateName] ?? stateName).toUpperCase();
}

function singleStateXPadding(total: number): number {
  return Math.min(Math.max(total * 0.02, 0.8), 1.25);
}

// Derive state order from minimum seat number found in the data
function stateOrder(rows: AnalysisRow[]): string[] {
  const minSeat: Record<string, number> = {};
  for (const row of rows) {
    const n = parseInt(row.seat.match(/\d+/)?.[0] ?? "999");
    if (!(row.state in minSeat) || n < minSeat[row.state]) {
      minSeat[row.state] = n;
    }
  }
  return Object.keys(minSeat).sort((a, b) => minSeat[a] - minSeat[b]);
}

function buildMultiState(rows: AnalysisRow[], varKey: VarKey) {
  const valid = rows.filter((r) => (r[varKey] as number | null | undefined) != null);

  const groups: Record<string, AnalysisRow[]> = {};
  for (const row of valid) {
    (groups[row.state] ??= []).push(row);
  }

  const states = stateOrder(valid).filter((s) => s in groups);

  const points = states.flatMap((state, si) =>
    groups[state].map((row) => ({
      x: si,
      y: row[varKey] as number,
      seat: row.seat,
    })),
  );

  return { stateLabels: states, points };
}

function buildSingleState(rows: AnalysisRow[], varKey: VarKey) {
  const sorted = rows
    .filter((r) => (r[varKey] as number | null | undefined) != null)
    .sort((a, b) => {
      const an = parseInt(a.seat.match(/\d+/)?.[0] ?? "0");
      const bn = parseInt(b.seat.match(/\d+/)?.[0] ?? "0");
      return an - bn;
    });

  const points = sorted.map((row, i) => ({
    x: i + 1,
    y: row[varKey] as number,
    seat: row.seat,
  }));

  const labelMap: Record<number, string> = {};
  sorted.forEach((row, i) => {
    const code = row.seat.match(/^[A-Z]+\d+/)?.[0];
    if (code) labelMap[i + 1] = code;
  });

  return { points, labelMap, total: sorted.length };
}

function savedVarKey(): VarKey {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.varKey && Date.now() - (parsed.ts ?? 0) < 10000) {
      return parsed.varKey as VarKey;
    }
  } catch {}
  return "voter_turnout_perc";
}

function numLabel(v: number, key: VarKey): string {
  if (key.endsWith("_perc")) {
    const value = Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1);
    return `${value}%`;
  }
  return v.toLocaleString("en-MY");
}

function axisNumLabel(v: number, key: VarKey): string {
  if (key.endsWith("_perc")) {
    const value = Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1);
    return `${value}%`;
  }

  if (Math.abs(v) >= 1000) {
    return Intl.NumberFormat("en-MY", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);
  }

  return Number.isInteger(v) ? v.toFixed(0) : v.toLocaleString("en-MY");
}

type TooltipContext = {
  raw: { seat: string };
  parsed: { x: number; y: number };
};

function tooltipValue(ctx: TooltipContext, isMobile: boolean): number {
  return isMobile ? ctx.parsed.x : ctx.parsed.y;
}

function tooltipItemSort(a: TooltipContext, b: TooltipContext, isMobile: boolean): number {
  return tooltipValue(b, isMobile) - tooltipValue(a, isMobile) || a.raw.seat.localeCompare(b.raw.seat);
}

export default function ElectionsAnalysisChart({ rows, stateCode }: Props) {
  const [varKey, setVarKey] = useState<VarKey>(savedVarKey);
  const [isMobile, setIsMobile] = useState(false);
  const isMulti = MULTI_STATE.includes(stateCode);
  const isInteger = INTEGER_VARS.has(varKey);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent<{ varKey: string }>).detail.varKey as VarKey;
      setVarKey(key);
    };
    document.addEventListener("elections-var-change", handler);
    return () => document.removeEventListener("elections-var-change", handler);
  }, []);

  const yScaleOpts = (values: number[]) => ({
    beginAtZero: false,
    ...yScaleFloor(values),
    border: { display: false },
    grid: {
      color: "rgba(113, 113, 122, 0.16)",
    },
    ticks: {
      color: AXIS_TICK_COLOR,
      font: {
        family: AXIS_FONT_FAMILY,
        size: 14,
        weight: 500,
      },
      padding: 8,
      maxRotation: 0,
      minRotation: 0,
      callback: (val: number | string) => {
        const value = typeof val === "number" ? val : Number(val);
        if (value < 0) return "";
        return axisNumLabel(value, varKey);
      },
      ...(isInteger ? { precision: 0 } : {}),
    },
  });

  const xTickOpts = {
    align: "center",
    color: AXIS_TICK_COLOR,
    font: {
      family: AXIS_FONT_FAMILY,
      size: 14,
      weight: 500,
    },
    padding: 8,
    maxRotation: 0,
    minRotation: 0,
  };

  let chartData: object;
  let chartOptions: object;
  const chartHeight = isMobile ? MOBILE_CHART_HEIGHT : DESKTOP_CHART_HEIGHT;

  if (isMulti) {
    const { stateLabels, points } = buildMultiState(rows, varKey);
    const yValues = points.map((p) => p.y);
    const chartPoints = isMobile
      ? points.map((p) => ({
          x: p.y,
          y: stateLabels.length - 1 - p.x,
          seat: p.seat,
        }))
      : points;
    chartData = {
      datasets: [
        {
          data: chartPoints,
          backgroundColor: DOT_COLOR,
          pointRadius: 8,
          pointHoverRadius: 10,
        },
      ],
    };
    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          itemSort: (a: TooltipContext, b: TooltipContext) => tooltipItemSort(a, b, isMobile),
          callbacks: {
            label: (ctx: TooltipContext) =>
              `${ctx.raw.seat}: ${numLabel(tooltipValue(ctx, isMobile), varKey)}`,
            title: () => "",
          },
        },
      },
      scales: isMobile
        ? {
            x: yScaleOpts(yValues),
            y: {
              min: -0.5,
              max: stateLabels.length - 0.5,
              grid: { display: false },
              afterBuildTicks: (axis: { ticks: { value: number }[] }) => {
                axis.ticks = stateLabels.map((_, i) => ({ value: i }));
              },
              ticks: {
                ...xTickOpts,
                stepSize: 1,
                callback: (val: number) => stateShortLabel(stateLabels[stateLabels.length - 1 - Math.round(val)] ?? ""),
              },
            },
          }
        : {
            x: {
              min: -0.5,
              max: stateLabels.length - 0.5,
              grid: { display: false },
              afterBuildTicks: (axis: { ticks: { value: number }[] }) => {
                axis.ticks = stateLabels.map((_, i) => ({ value: i }));
              },
              ticks: {
                ...xTickOpts,
                stepSize: 1,
                callback: (val: number) => stateShortLabel(stateLabels[Math.round(val)] ?? ""),
              },
            },
            y: yScaleOpts(yValues),
          },
    };
  } else {
    const { points, labelMap, total } = buildSingleState(rows, varKey);
    const xPadding = singleStateXPadding(total);
    const yValues = points.map((p) => p.y);
    const chartPoints = isMobile
      ? points.map((p) => ({
          x: p.y,
          y: total - p.x + 1,
          seat: p.seat,
        }))
      : points;
    chartData = {
      datasets: [
        {
          data: chartPoints,
          backgroundColor: DOT_COLOR,
          pointRadius: 8,
          pointHoverRadius: 10,
        },
      ],
    };
    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          itemSort: (a: TooltipContext, b: TooltipContext) => tooltipItemSort(a, b, isMobile),
          callbacks: {
            label: (ctx: TooltipContext) =>
              `${ctx.raw.seat}: ${numLabel(tooltipValue(ctx, isMobile), varKey)}`,
            title: () => "",
          },
        },
      },
      scales: isMobile
        ? {
            x: yScaleOpts(yValues),
            y: {
              min: 1 - xPadding,
              max: total + xPadding,
              title: {
                display: true,
                text: "Constituency (sorted by seat number)",
                color: AXIS_TITLE_COLOR,
                font: {
                  family: AXIS_FONT_FAMILY,
                  size: 14,
                  weight: 600,
                },
                padding: {
                  bottom: 0,
                },
              },
              afterBuildTicks: (axis: { ticks: { value: number }[] }) => {
                axis.ticks = Array.from({ length: total }, (_, i) => ({ value: i + 1 }));
              },
              ticks: {
                ...xTickOpts,
                stepSize: 1,
                maxTicksLimit: 20,
                callback: (val: number) => labelMap[total - Math.round(val) + 1] ?? "",
              },
            },
          }
        : {
            x: {
              min: 1 - xPadding,
              max: total + xPadding,
              afterBuildTicks: (axis: { ticks: { value: number }[] }) => {
                axis.ticks = Array.from({ length: total }, (_, i) => ({ value: i + 1 }));
              },
              title: {
                display: true,
                text: "Constituency (sorted by seat number)",
                color: AXIS_TITLE_COLOR,
                font: {
                  family: AXIS_FONT_FAMILY,
                  size: 14,
                  weight: 600,
                },
                padding: {
                  top: 10,
                },
              },
              ticks: {
                ...xTickOpts,
                stepSize: 1,
                maxTicksLimit: 20,
                callback: (val: number) => labelMap[val] ?? "",
              },
            },
            y: yScaleOpts(yValues),
          },
    };
  }

  return (
    <div style={{ height: chartHeight }}>
      <Scatter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data={chartData as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options={chartOptions as any}
      />
    </div>
  );
}
