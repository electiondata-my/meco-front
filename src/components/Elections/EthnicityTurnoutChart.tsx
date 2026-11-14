import "chart.js/auto";
import { Bar } from "react-chartjs-2";

export type EthnicGroup = "malay" | "chinese" | "indian" | "other";
export type EthnicityTurnout = Record<
  EthnicGroup,
  { registered: number; current: number; projected: number | null }
>;

export interface EthnicityStrings {
  now: string;
  projected: string;
  note: string;
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

const GROUPS: EthnicGroup[] = ["malay", "chinese", "indian", "other"];
const AXIS_FONT_FAMILY =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Values arrive rounded to 1dp upstream, so toFixed(1) only pads, never re-rounds.
const pct = (v: number) => `${v.toFixed(1)}%`;

export default function EthnicityTurnoutChart({ ethnicity, time, strings, dark, isMobile, height }: Props) {
  const rgb = dark ? "255, 255, 255" : "0, 0, 0";
  const tickColor = dark ? "#A1A1AA" : "#52525B";
  const gridColor = dark ? "rgba(161, 161, 170, 0.10)" : "rgba(113, 113, 122, 0.08)";
  // "Other" is the least certain estimate, so it's drawn lighter and asterisked.
  const solid = GROUPS.map((g) => `rgba(${rgb}, ${g === "other" ? 0.4 : 1})`);
  const outline = GROUPS.map((g) => `rgba(${rgb}, ${g === "other" ? 0.4 : 0.85})`);
  const fill = GROUPS.map((g) => `rgba(${rgb}, ${g === "other" ? 0.04 : 0.08})`);

  // projected is null from 18:00 onward, when the projection no longer applies.
  const hasProjection = GROUPS.every((g) => ethnicity[g].projected != null);

  const datasets = [
    {
      label: time ? `${strings.now} (${time})` : strings.now,
      data: GROUPS.map((g) => ethnicity[g].current),
      backgroundColor: solid,
      borderColor: solid,
      borderWidth: 0,
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
          },
        ]
      : []),
  ];

  // Value label above each bar; reads chart.data so it stays current on every refresh.
  const valueLabelPlugin = {
    id: "valueLabels",
    afterDatasetsDraw(chart: {
      ctx: CanvasRenderingContext2D;
      data: { datasets: { data: (number | null)[] }[] };
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
          ctx.fillStyle = solid[i];
          ctx.fillText(pct(v), bar.x, bar.y - 4);
        });
      });
      ctx.restore();
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
          data={{ labels: GROUPS.map((g) => (g === "other" ? `${strings.groups[g]}*` : strings.groups[g])), datasets } as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          options={chartOptions as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          plugins={[valueLabelPlugin] as any}
        />
      </div>
      <p className="mt-3 text-center text-body-xs text-txt-black-500">{strings.note}</p>
    </div>
  );
}
