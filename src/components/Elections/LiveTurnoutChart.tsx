import "chart.js/auto";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import EthnicityTurnoutChart, { type EthnicityStrings, type EthnicityTurnout } from "./EthnicityTurnoutChart";

type TurnoutData = {
  latest: { time: string; turnout: number; timestamp: string } | null;
  time: string[];
  se15: (number | null)[];
  ge15: (number | null)[];
  se16: (number | null)[];
  se16_forecast: (number | null)[];
  ethnicity?: EthnicityTurnout | null;
};

interface Props {
  url: string;
  children: ReactNode; // section title, rendered by the Astro page
  caption: string;
  timeLabel: string;
  asOfPrefix: string;
  se15Annotation: string;
  ge15Annotation: string;
  se16Annotation: string;
  forecastPrefix: string;
  hourlyLabel: string;
  byEthnicityLabel: string;
  ethnicityStrings: EthnicityStrings;
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
const MIN_LABEL_GAP = 18;
const REFRESH_MS = 5 * 60 * 1000;

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

// Values arrive rounded to 1dp upstream, so toFixed(1) only pads (7 -> "7.0"), never re-rounds.
const pct = (v: number) => `${v.toFixed(1)}%`;

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
  url,
  children,
  caption,
  timeLabel,
  asOfPrefix,
  se15Annotation,
  ge15Annotation,
  se16Annotation,
  forecastPrefix,
  hourlyLabel,
  byEthnicityLabel,
  ethnicityStrings,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const dark = useDarkMode();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // react-chartjs-2 only reads `plugins` when the chart is created, so the end-label plugin
  // reads its text through this ref to pick up each 5-minute refresh.
  const endLabelsRef = useRef<Record<string, { text: string; color: string }>>({});
  const [data, setData] = useState<TurnoutData | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<"hourly" | "ethnicity">("ethnicity");

  // Fetch in the browser and refresh every 5 minutes, matching the worker's write cadence.
  // A unique query per request bypasses the edge cache, which can serve stale copies
  // (seen at the KUL PoP despite the worker's purge); no-store skips the browser cache.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json: TurnoutData = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [url]);

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

  // Keep the last good data on a failed refresh; hide the section only if nothing ever loaded.
  if (!data && failed) return null;

  const latest = data?.latest ?? null;
  const asOfLabel = latest ? `(${pct(latest.turnout)} ${asOfPrefix} ${latest.time})` : "";
  const title = (
    <h4 className="text-center font-heading text-heading-2xs font-bold">
      {children}
      {asOfLabel && <span className="font-normal"> {asOfLabel}</span>}
    </h4>
  );

  if (!data) {
    return (
      <div className="space-y-6">
        {title}
        <div style={{ height: chartHeight }} />
      </div>
    );
  }

  const se15Color = dark ? SE15_DARK : SE15_LIGHT;
  const se16Color = dark ? SE16_DARK : SE16_LIGHT;
  const tickColor = dark ? "#A1A1AA" : "#52525B";
  const gridColor = dark ? "rgba(161, 161, 170, 0.10)" : "rgba(113, 113, 122, 0.08)";

  const ge15Val = lastValue(data.ge15);
  const se15Val = lastValue(data.se15);
  // From 18:00 the forecast goes null (polls closed), so label the actual SE-16 line instead.
  const hasForecast = lastValueIndex(data.se16_forecast) > lastValueIndex(data.se16);
  const se16EndKey = hasForecast ? "se16_forecast" : "se16";
  const se16EndName = hasForecast ? forecastPrefix : se16Annotation;
  const se16EndVal = lastValue(hasForecast ? data.se16_forecast : data.se16);

  const ge15Text = `${ge15Annotation}: ${pct(ge15Val)}`;
  const se15Text = `${se15Annotation}: ${pct(se15Val)}`;
  const se16EndText = `${se16EndName}: ${pct(se16EndVal)}`;

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
  endLabelsRef.current = {
    ge15: { text: ge15Text, color: GE15_COLOR },
    se15: { text: se15Text, color: se15Color },
    [se16EndKey]: { text: se16EndText, color: se16Color },
  };

  const endLabelPlugin = {
    id: "endLabels",
    afterDatasetsDraw(chart: {
      ctx: CanvasRenderingContext2D;
      chartArea: { top: number; bottom: number };
      data: { datasets: { label?: string; data: (number | null)[] }[] };
      getDatasetMeta: (i: number) => { data: { x: number; y: number }[] };
    }) {
      const { ctx } = chart;
      const labels: { text: string; color: string; x: number; y: number }[] = [];
      chart.data.datasets.forEach((dataset, di) => {
        const spec = dataset.label ? endLabelsRef.current[dataset.label] : undefined;
        if (!spec) return;
        const idx = lastValueIndex(dataset.data);
        const point = chart.getDatasetMeta(di).data[idx];
        if (!point) return;
        labels.push({ text: spec.text, color: spec.color, x: point.x, y: point.y });
      });
      // Push overlapping labels apart to a minimum gap, keeping them inside the chart area.
      labels.sort((a, b) => a.y - b.y);
      for (let i = 1; i < labels.length; i++) {
        labels[i].y = Math.max(labels[i].y, labels[i - 1].y + MIN_LABEL_GAP);
      }
      for (let i = labels.length - 1; i >= 0; i--) {
        const limit = i === labels.length - 1 ? chart.chartArea.bottom : labels[i + 1].y - MIN_LABEL_GAP;
        labels[i].y = Math.min(labels[i].y, limit);
      }
      ctx.save();
      ctx.font = `600 13px ${AXIS_FONT_FAMILY}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      labels.forEach((label) => {
        ctx.fillStyle = label.color;
        ctx.fillText(label.text, label.x + LABEL_OFFSET, label.y);
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
    se16: se16Annotation,
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
            return `${name}: ${pct(ctx.parsed.y ?? 0)}`;
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
    { color: GE15_COLOR, dashed: false, name: ge15Annotation, value: pct(ge15Val) },
    { color: se16Color, dashed: hasForecast, name: se16EndName, value: pct(se16EndVal) },
    { color: se15Color, dashed: false, name: se15Annotation, value: pct(se15Val) },
  ];

  // The ethnicity estimate can be missing from a run; hide the toggle and fall back to hourly.
  const ethnicity = data.ethnicity ?? null;
  const showEthnicity = view === "ethnicity" && ethnicity != null;
  const toggleBtn = (active: boolean) =>
    `flex h-full items-center justify-center rounded-md px-3 text-body-sm font-medium transition-all ${
      active ? "border border-otl-gray-200 bg-bg-dialog-active text-txt-black-900 shadow-button" : "text-txt-black-500"
    }`;
  const toggle = ethnicity && (
    <div className="flex justify-center">
      <div className="inline-grid h-[34px] grid-cols-2 rounded-lg bg-bg-washed p-0.5">
        <button type="button" aria-pressed={!showEthnicity} onClick={() => setView("hourly")} className={toggleBtn(!showEthnicity)}>
          {hourlyLabel}
        </button>
        <button type="button" aria-pressed={showEthnicity} onClick={() => setView("ethnicity")} className={toggleBtn(showEthnicity)}>
          {byEthnicityLabel}
        </button>
      </div>
    </div>
  );

  const tableSeries = [
    { label: ge15Annotation, values: data.ge15 },
    { label: se15Annotation, values: data.se15 },
    { label: se16Annotation, values: data.se16 },
    { label: forecastPrefix, values: data.se16_forecast },
  ];

  return (
    <div className="space-y-6">
      {title}
      {toggle}
      <div className="mx-auto w-full lg:w-3/4">
        {showEthnicity && ethnicity ? (
          <EthnicityTurnoutChart
            ethnicity={ethnicity}
            time={latest?.time ?? null}
            strings={ethnicityStrings}
            dark={dark}
            isMobile={isMobile}
            height={chartHeight}
          />
        ) : (
          <>
            {isMobile && (
              <div className="flex justify-center">
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
          </>
        )}
      </div>

      {/* Machine-readable copy of the chart data (canvas isn't scrapeable) */}
      <table className="sr-only">
        <caption>{caption} {asOfLabel}</caption>
        <thead>
          <tr>
            <th>{timeLabel}</th>
            {tableSeries.map((s) => <th key={s.label}>{s.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.time.map((time, i) => (
            <tr key={time}>
              <th>{time}</th>
              {tableSeries.map((s) => <td key={s.label}>{s.values[i] == null ? "" : pct(s.values[i] as number)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
