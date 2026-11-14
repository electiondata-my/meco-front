import "chart.js/auto";
import { Bar } from "react-chartjs-2";

export type EthnicGroup = "malay" | "chinese" | "indian";
// The feed also includes "other", which isn't charted but counts toward the electorate.
export type EthnicityTurnout = Record<
  EthnicGroup | "other",
  {
    registered: number;
    current: number;
    projected: number | null;
    ge15?: number | null;
    // false when the GE-15 estimate failed out-of-sample validation.
    ge15_citable?: boolean;
  }
>;

export interface EthnicityStrings {
  now: string;
  projected: string;
  note: string;
  shareOfVoters: string;
  se16: string;
  ge15: string;
  groups: Record<EthnicGroup, string>;
}

interface Props {
  ethnicity: EthnicityTurnout;
  time: string | null;
  strings: EthnicityStrings;
  dark: boolean;
  isMobile: boolean;
  height: number;
}

const GROUPS: EthnicGroup[] = ["malay", "chinese", "indian"];
const AXIS_FONT_FAMILY =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Values arrive rounded to 1dp upstream, so toFixed(1) only pads, never re-rounds.
const pct = (v: number) => `${v.toFixed(1)}%`;
const GE15_COLOR = "#d7292f"; // matches GE15_COLOR in LiveTurnoutChart

// Diagonal-line fill for the less certain bars. Built lazily at draw time (needs a DOM).
const HATCH = 10;
const hatchCache = new Map<string, CanvasPattern>();
function hatch(color: string): CanvasPattern | string {
  const cached = hatchCache.get(color);
  if (cached) return cached;
  const tile = document.createElement("canvas");
  tile.width = HATCH;
  tile.height = HATCH;
  const tctx = tile.getContext("2d");
  if (!tctx) return color;
  tctx.strokeStyle = color;
  tctx.lineWidth = 1.5;
  tctx.beginPath();
  // Main diagonal plus the two corner stubs, so the stripes join seamlessly across tiles.
  for (const [x0, y0, x1, y1] of [
    [0, HATCH, HATCH, 0],
    [-1, 1, 1, -1],
    [HATCH - 1, HATCH + 1, HATCH + 1, HATCH - 1],
  ]) {
    tctx.moveTo(x0, y0);
    tctx.lineTo(x1, y1);
  }
  tctx.stroke();
  const pattern = tctx.createPattern(tile, "repeat");
  if (!pattern) return color;
  hatchCache.set(color, pattern);
  return pattern;
}

export default function EthnicityTurnoutChart({ ethnicity, time, strings, dark, isMobile, height }: Props) {
  const rgb = dark ? "255, 255, 255" : "0, 0, 0";
  const tickColor = dark ? "#A1A1AA" : "#52525B";
  const gridColor = dark ? "rgba(161, 161, 170, 0.10)" : "rgba(113, 113, 122, 0.08)";
  const se16Color = `rgb(${rgb})`;
  const solid = GROUPS.map(() => se16Color);
  const outline = GROUPS.map(() => `rgba(${rgb}, 0.85)`);
  const fill = GROUPS.map(() => `rgba(${rgb}, 0.08)`);
  // Less certain bars are hatched with an outline: Indian SE-16 (asterisked) and any GE-15
  // estimate that isn't validated out of sample.
  const se16Hatched = GROUPS.map((g) => g === "indian");
  const ge15Hatched = GROUPS.map((g) => ethnicity[g].ge15_citable === false);
  const barFill = (color: string, hatched: boolean[]) => (c: { dataIndex: number }) =>
    hatched[c.dataIndex] ? hatch(color) : color;
  const barBorder = (hatched: boolean[]) => hatched.map((h) => (h ? 1.5 : 0));

  // projected is null from 18:00 onward, when the projection no longer applies.
  const hasProjection = GROUPS.every((g) => ethnicity[g].projected != null);

  // Two-line x-axis label: group name, then its share of the whole electorate.
  const electorate = Object.values(ethnicity).reduce((sum, e) => sum + e.registered, 0);
  const labels = GROUPS.map((g) => [
    g === "indian" ? `${strings.groups[g]}*` : strings.groups[g],
    `(${strings.shareOfVoters.replace("{{share}}", `${((ethnicity[g].registered / electorate) * 100).toFixed(1)}%`)})`,
  ]);

  const hasGe15 = GROUPS.every((g) => ethnicity[g].ge15 != null);
  const ge15Colors = GROUPS.map(() => GE15_COLOR);

  // valueColors is read by valueLabelPlugin; Chart.js ignores the extra key.
  const datasets = [
    {
      // After polls close there's no projection, so "Now (18:00)" is the final SE-16 figure.
      label: hasProjection ? (time ? `${strings.now} (${time})` : strings.now) : strings.se16,
      data: GROUPS.map((g) => ethnicity[g].current),
      backgroundColor: barFill(se16Color, se16Hatched),
      borderColor: solid,
      borderWidth: barBorder(se16Hatched),
      valueColors: solid,
    },
    ...(hasProjection
      ? [
          {
            label: strings.projected,
            data: GROUPS.map((g) => ethnicity[g].projected),
            backgroundColor: fill,
            borderColor: outline,
            borderWidth: 2,
            borderDash: [6, 4],
            valueColors: solid,
          },
        ]
      : []),
    ...(hasGe15
      ? [
          {
            label: strings.ge15,
            data: GROUPS.map((g) => ethnicity[g].ge15),
            backgroundColor: barFill(GE15_COLOR, ge15Hatched),
            borderColor: ge15Colors,
            borderWidth: barBorder(ge15Hatched),
            valueColors: ge15Colors,
          },
        ]
      : []),
  ];

  // Value label above each bar; reads chart.data so it stays current on every refresh.
  const valueLabelPlugin = {
    id: "valueLabels",
    afterDatasetsDraw(chart: {
      ctx: CanvasRenderingContext2D;
      data: { datasets: { data: (number | null)[]; valueColors: string[] }[] };
      getDatasetMeta: (i: number) => { hidden: boolean | null; data: { x: number; y: number }[] };
    }) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = `600 ${isMobile ? 11 : 13}px ${AXIS_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      chart.data.datasets.forEach((dataset, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((bar, i) => {
          const v = dataset.data[i];
          if (v == null) return;
          ctx.fillStyle = dataset.valueColors[i];
          ctx.fillText(pct(v), bar.x, bar.y - 4);
        });
      });
      ctx.restore();
    },
  };

  // Chart.js has no legend-to-chart gap option, so pad the legend's fitted height.
  const legendGapPlugin = {
    id: "legendGap",
    beforeInit(chart: { legend: { fit: () => void; height: number } }) {
      const fit = chart.legend.fit;
      chart.legend.fit = function () {
        fit.call(this);
        this.height += 12;
      };
    },
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { top: 24 } },
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: tickColor, font: { family: AXIS_FONT_FAMILY, size: isMobile ? 12 : 14 }, boxWidth: 14 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            `${ctx.dataset.label ?? ""}: ${pct(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tickColor, font: { family: AXIS_FONT_FAMILY, size: isMobile ? 12 : 14, weight: 500 } },
      },
      y: {
        beginAtZero: true,
        suggestedMax: 80,
        border: { display: false },
        grid: { color: gridColor },
        ticks: {
          color: tickColor,
          font: { family: AXIS_FONT_FAMILY, size: isMobile ? 12 : 14, weight: 500 },
          padding: 8,
          callback: (val: number | string) => `${val}%`,
        },
      },
    },
  };

  return (
    <div>
      <div style={{ height }}>
        <Bar
          key={`${dark ? "dark" : "light"}-${isMobile ? "m" : "d"}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={{ labels, datasets } as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          options={chartOptions as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          plugins={[valueLabelPlugin, legendGapPlugin] as any}
        />
      </div>
      <p className="mx-auto mt-3 max-w-xl text-center text-body-xs text-txt-black-500">{strings.note}</p>
    </div>
  );
}
