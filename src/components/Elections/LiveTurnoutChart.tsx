import "chart.js/auto";
import { Fragment, useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

type TurnoutData = {
  time: string[];
  se15: (number | null)[];
  ge15: (number | null)[];
  se16: (number | null)[];
  se16_forecast: (number | null)[];
};

interface Props {
  data: TurnoutData;
  se15Annotation: string;
  ge15Annotation: string;
  forecastPrefix: string;
}

const GE15_COLOR = "#d7292f";
const SE15_LIGHT = "#031a93";
const SE15_DARK = "#7c9cff";
const SE16_LIGHT = "#000000";
const SE16_DARK = "#ffffff";
const AXIS_FONT_FAMILY =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const MOBILE_CHART_HEIGHT = 380;
const DESKTOP_CHART_HEIGHT = 420;
const LABEL_OFFSET = 10;

function lastValueIndex(arr: (number | null)[]): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return i;
  }
  return -1;
}

function lastValue(arr: (number | null)[]): number {
  const i = lastValueIndex(arr);
  return i >= 0 ? (arr[i] as number) : 0;
}

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export default function LiveTurnoutChart({
  data,
  se15Annotation,
  ge15Annotation,
  forecastPrefix,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const dark = useDarkMode();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // On mobile a tap opens the tooltip; dismiss it when tapping anywhere off the chart.
  useEffect(() => {
    if (!isMobile) return;
    const dismiss = (e: Event) => {
      const chart = chartRef.current;
      if (!chart || chart.canvas.contains(e.target as Node)) return;
      chart.setActiveElements([]);
      chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
      chart.update();
    };
    document.addEventListener("touchstart", dismiss);
    document.addEventListener("click", dismiss);
    return () => {
      document.removeEventListener("touchstart", dismiss);
      document.removeEventListener("click", dismiss);
    };
  }, [isMobile]);

  const chartHeight = isMobile ? MOBILE_CHART_HEIGHT : DESKTOP_CHART_HEIGHT;

  const se15Color = dark ? SE15_DARK : SE15_LIGHT;
  const se16Color = dark ? SE16_DARK : SE16_LIGHT;
  const tickColor = dark ? "#A1A1AA" : "#52525B";
  const gridColor = dark ? "rgba(161, 161, 170, 0.10)" : "rgba(113, 113, 122, 0.08)";

  const ge15Val = lastValue(data.ge15);
  const se15Val = lastValue(data.se15);
  const forecastVal = lastValue(data.se16_forecast);

  const ge15Text = `${ge15Annotation}: ${ge15Val.toFixed(1)}%`;
  const se15Text = `${se15Annotation}: ${se15Val.toFixed(1)}%`;
  const forecastText = `${forecastPrefix}: ${forecastVal.toFixed(1)}%`;

  const lineBase = {
    tension: 0.3,
    pointRadius: 3,
    pointHoverRadius: 5,
    borderWidth: 2.5,
    spanGaps: false,
  };

  const chartData = {
    labels: data.time,
    datasets: [
      { ...lineBase, label: "se15", data: data.se15, borderColor: se15Color, backgroundColor: se15Color },
      { ...lineBase, label: "ge15", data: data.ge15, borderColor: GE15_COLOR, backgroundColor: GE15_COLOR },
      { ...lineBase, label: "se16", data: data.se16, borderColor: se16Color, backgroundColor: se16Color },
      {
        ...lineBase,
        label: "se16_forecast",
        data: data.se16_forecast,
        borderColor: se16Color,
        backgroundColor: se16Color,
        borderDash: [6, 6],
      },
    ],
  };

  // Each series is direct-labelled in the right margin, aligned to its line's endpoint.
  const endLabels: Record<string, { text: string; color: string }> = {
    ge15: { text: ge15Text, color: GE15_COLOR },
    se15: { text: se15Text, color: se15Color },
    se16_forecast: { text: forecastText, color: se16Color },
  };

  const endLabelPlugin = {
    id: "endLabels",
    afterDatasetsDraw(chart: {
      ctx: CanvasRenderingContext2D;
      data: { datasets: { label?: string; data: (number | null)[] }[] };
      getDatasetMeta: (i: number) => { data: { x: number; y: number }[] };
    }) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = `600 13px ${AXIS_FONT_FAMILY}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      chart.data.datasets.forEach((dataset, di) => {
        const spec = dataset.label ? endLabels[dataset.label] : undefined;
        if (!spec) return;
        const idx = lastValueIndex(dataset.data);
        const point = chart.getDatasetMeta(di).data[idx];
        if (!point) return;
        ctx.fillStyle = spec.color;
        ctx.fillText(spec.text, point.x + LABEL_OFFSET, point.y);
      });
      ctx.restore();
    },
  };

  // Dashed vertical guide at the hovered point so it's clear which hour is being read.
  const crosshairPlugin = {
    id: "crosshair",
    beforeDatasetsDraw(chart: {
      ctx: CanvasRenderingContext2D;
      chartArea: { top: number; bottom: number };
      tooltip?: { getActiveElements: () => { element: { x: number } }[] };
    }) {
      const active = chart.tooltip?.getActiveElements() ?? [];
      if (active.length === 0) return;
      const x = active[0].element.x;
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = dark ? "rgba(228, 228, 231, 0.5)" : "rgba(82, 82, 91, 0.45)";
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };

  // Tooltip: single "Jul 2026" line (dedupe se16 actual vs forecast at the join),
  // ordered Jul 2026 → ge15 → se15.
  const tooltipRank: Record<string, number> = { ge15: 0, se16: 1, se16_forecast: 1, se15: 2 };
  const tooltipName: Record<string, string> = {
    se15: se15Annotation,
    ge15: ge15Annotation,
    se16: forecastPrefix,
    se16_forecast: forecastPrefix,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { left: 8, right: isMobile ? 12 : 172, top: isMobile ? 4 : 12, bottom: 12 } },
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        bodySpacing: 6,
        padding: 10,
        boxPadding: 6,
        bodyAlign: "right" as const,
        itemSort: (a: { dataset: { label?: string } }, b: { dataset: { label?: string } }) =>
          (tooltipRank[a.dataset.label ?? ""] ?? 9) - (tooltipRank[b.dataset.label ?? ""] ?? 9),
        filter: (ctx: { dataset: { label?: string }; dataIndex: number; parsed: { y: number | null } }) => {
          if (ctx.parsed.y == null) return false;
          if (ctx.dataset.label === "se16_forecast" && data.se16[ctx.dataIndex] != null) return false;
          return true;
        },
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const name = ctx.dataset.label ? tooltipName[ctx.dataset.label] ?? ctx.dataset.label : "";
            return `${name}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: tickColor,
          font: { family: AXIS_FONT_FAMILY, size: isMobile ? 12 : 14, weight: 500 },
          padding: 8,
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          // On mobile show every other hour so labels don't collide.
          callback: (_val: number | string, index: number) =>
            isMobile && index % 2 !== 0 ? "" : data.time[index],
        },
      },
      y: {
        beginAtZero: true,
        max: 80,
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

  // On mobile the end-of-line labels can't fit, so use a compact legend instead.
  const legendItems = [
    { color: GE15_COLOR, dashed: false, name: ge15Annotation, value: `${ge15Val.toFixed(1)}%` },
    { color: se16Color, dashed: true, name: forecastPrefix, value: `${forecastVal.toFixed(1)}%` },
    { color: se15Color, dashed: false, name: se15Annotation, value: `${se15Val.toFixed(1)}%` },
  ];

  return (
    <div>
      {isMobile && (
        <div className="mt-6 flex justify-center">
          <div className="grid grid-cols-[auto_auto_auto] items-center gap-x-2 gap-y-1.5 text-body-sm text-txt-black-700">
            {legendItems.map((item) => (
              <Fragment key={item.name}>
                <span
                  className="inline-block w-5 shrink-0"
                  style={{ borderTop: `2.5px ${item.dashed ? "dashed" : "solid"} ${item.color}` }}
                />
                <span className="text-right">{item.name}:</span>
                <span>{item.value}</span>
              </Fragment>
            ))}
          </div>
        </div>
      )}
      <div style={{ height: chartHeight }}>
        <Line
          key={`${dark ? "dark" : "light"}-${isMobile ? "m" : "d"}`}
          ref={chartRef}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={chartData as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          options={chartOptions as any}
          plugins={(isMobile ? [crosshairPlugin] : [endLabelPlugin, crosshairPlugin]) as any}
        />
      </div>
    </div>
  );
}
