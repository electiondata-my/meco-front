import "chart.js/auto";
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
const INTEGER_VARS = new Set<VarKey>([
  "n_candidates",
  "voters_total",
  "voter_turnout",
  "majority",
  "votes_rejected",
]);

function yMin(_values: number[]): number {
  return 0;
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
  if (key.endsWith("_perc")) return `${v.toFixed(1)}%`;
  return v.toLocaleString("en-MY");
}

export default function ElectionsAnalysisChart({ rows, stateCode }: Props) {
  const [varKey, setVarKey] = useState<VarKey>(savedVarKey);
  const isMulti = MULTI_STATE.includes(stateCode);
  const isInteger = INTEGER_VARS.has(varKey);

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
    min: yMin(values),
    ticks: isInteger ? { precision: 0 } : {},
  });

  let chartData: object;
  let chartOptions: object;

  if (isMulti) {
    const { stateLabels, points } = buildMultiState(rows, varKey);
    const yValues = points.map((p) => p.y);
    chartData = {
      datasets: [
        {
          data: points,
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
          callbacks: {
            label: (ctx: { raw: { seat: string }; parsed: { y: number } }) =>
              `${ctx.raw.seat}: ${numLabel(ctx.parsed.y, varKey)}`,
            title: () => "",
          },
        },
      },
      scales: {
        x: {
          min: -0.5,
          max: stateLabels.length - 0.5,
          grid: { display: false },
          ticks: {
            stepSize: 1,
            callback: (val: number) => stateLabels[Math.round(val)] ?? "",
          },
        },
        y: yScaleOpts(yValues),
      },
    };
  } else {
    const { points, labelMap, total } = buildSingleState(rows, varKey);
    const yValues = points.map((p) => p.y);
    chartData = {
      datasets: [
        {
          data: points,
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
          callbacks: {
            label: (ctx: { raw: { seat: string }; parsed: { y: number } }) =>
              `${ctx.raw.seat}: ${numLabel(ctx.parsed.y, varKey)}`,
            title: () => "",
          },
        },
      },
      scales: {
        x: {
          min: 0.5,
          max: total + 0.5,
          title: {
            display: true,
            text: "Constituency (sorted by seat number)",
          },
          ticks: {
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
    <div style={{ height: 400 }}>
      <Scatter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data={chartData as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options={chartOptions as any}
      />
    </div>
  );
}
