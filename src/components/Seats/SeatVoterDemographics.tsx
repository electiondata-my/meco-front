import { useMemo, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { numFormat } from "@lib/helpers";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const FEMALE_COLOR = "hsl(0 84% 48%)";
const MALE_COLOR = "#2563eb";
const FEMALE_FILL_COLOR = "hsl(0 84% 48% / 0.46)";
const MALE_FILL_COLOR = "rgba(37, 99, 235, 0.46)";
const ALL_AGES_KEY = "all-ages";
const ALL_ETHNICITIES_KEY = "all-ethnicities";

type PyramidData = { ages: number[]; male: number[]; female: number[] };
type HeatmapData = { ages: string[] } & Record<string, number[]>;

interface Props {
  pyramid: PyramidData;
  heatmap: HeatmapData;
  translations: { common: Record<string, any>; seats: Record<string, any> };
}

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () =>
      setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// Keep the heatmap hue locked to red; RGB interpolation drifts warm/orange.
function heatBg(t: number, dark: boolean): string {
  if (dark) {
    const lightness = 16 + t * 50;
    return `hsl(0 84% ${lightness}%)`;
  }
  const lightness = 97 - t * 49;
  return `hsl(0 84% ${lightness}%)`;
}

function heatFg(t: number, dark: boolean): string {
  if (dark) return t > 0.55 ? "#450a0a" : "#fecaca";
  return t > 0.55 ? "#fff" : "#991b1b";
}

function tr(ns: Record<string, any>, key: string): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], ns);
  return val != null ? String(val) : "";
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "-";
}

function pyramidTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const thousands = abs / 1000;
    return `${Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return numFormat(abs, "standard", 0);
}

function heatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function heatValue(value: number): string {
  return value.toFixed(1);
}

export default function SeatVoterDemographics({
  pyramid,
  heatmap,
  translations,
}: Props) {
  const dark = useDarkMode();
  const s = (key: string) => tr(translations.seats, key);
  const c = (key: string) => tr(translations.common, key);
  const allAgesLabel = s(ALL_AGES_KEY) || s(`age_groups.${ALL_AGES_KEY}`);
  const allEthnicitiesLabel =
    s(`ethnic_groups.${ALL_ETHNICITIES_KEY}`) || s(ALL_ETHNICITIES_KEY);
  const yoLabel = s("yo") || c("yo");

  // Pyramid
  const labels = useMemo(
    () => pyramid.ages.map((a) => (a >= 100 ? "100+" : String(a))),
    [pyramid.ages],
  );
  const yTickIndexes = useMemo(() => {
    const lastIndex = labels.length - 1;
    if (lastIndex < 0) return new Set<number>();
    if (labels.length <= 13) return new Set(labels.map((_, index) => index));

    const step = Math.ceil(lastIndex / 12);
    const indexes = new Set<number>();
    for (let index = 0; index < lastIndex; index += step) indexes.add(index);
    indexes.add(lastIndex);
    return indexes;
  }, [labels]);
  const maleLabel = s("barmeter.male") || "Male";
  const femaleLabel = s("barmeter.female") || "Female";
  const maleTotal = useMemo(() => sum(pyramid.male), [pyramid.male]);
  const femaleTotal = useMemo(() => sum(pyramid.female), [pyramid.female]);
  const genderTotal = maleTotal + femaleTotal;
  const malePercent = percent(maleTotal, genderTotal);
  const femalePercent = percent(femaleTotal, genderTotal);

  const chartData = useMemo<ChartData<"bar", number[], string>>(
    () => ({
      labels,
      datasets: [
        {
          label: maleLabel,
          data: pyramid.male,
          backgroundColor: MALE_FILL_COLOR,
          borderColor: MALE_COLOR,
          borderWidth: 0.5,
          barPercentage: 1,
          categoryPercentage: 1,
        },
        {
          label: femaleLabel,
          data: pyramid.female.map((v) => -v),
          backgroundColor: FEMALE_FILL_COLOR,
          borderColor: FEMALE_COLOR,
          borderWidth: 0.5,
          barPercentage: 1,
          categoryPercentage: 1,
        },
      ],
    }),
    [femaleLabel, labels, maleLabel, pyramid.female, pyramid.male],
  );

  const equimax = useMemo(() => {
    const all = [...pyramid.male, ...pyramid.female].map(Math.abs);
    return Math.max(...all);
  }, [pyramid]);

  const tickColor = dark ? "#9ca3af" : "#6b7280";
  const gridColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const hoverGuidePlugin = useMemo<Plugin<"bar">>(
    () => ({
      id: "pyramidHoverGuide",
      afterDatasetsDraw: (chart) => {
        if (!chart.tooltip?.opacity) return;
        const tooltipPoint = chart.tooltip?.dataPoints?.[0];
        if (!tooltipPoint) return;

        const y = tooltipPoint.element.y;
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = dark
          ? "rgba(255, 255, 255, 0.42)"
          : "rgba(31, 41, 55, 0.36)";
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.restore();
      },
    }),
    [dark],
  );

  const chartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      indexAxis: "y",
      maintainAspectRatio: false,
      responsive: true,
      interaction: { mode: "index", intersect: false, axis: "y" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const label = items[0]?.label;
              return label ? `${label} ${yoLabel}` : "";
            },
            label: (item) =>
              `${item.dataset.label}: ${item.parsed.x ? numFormat(Math.abs(item.parsed.x), "standard", 0) : "-"}`,
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: -equimax,
          max: equimax,
          grid: {
            display: true,
            color: gridColor,
          },
          ticks: {
            color: tickColor,
            font: { family: "Inter", size: 11 },
            padding: 4,
            callback: (v) => pyramidTick(v as number),
          },
        },
        y: {
          reverse: true,
          stacked: true,
          grid: { display: false },
          ticks: {
            autoSkip: false,
            color: tickColor,
            font: { family: "Inter", size: 11 },
            padding: 4,
            callback: (v) => {
              const index = Number(v);
              return yTickIndexes.has(index) ? labels[index] : "";
            },
          },
          beginAtZero: true,
        },
      },
    }),
    [equimax, dark, labels, yTickIndexes, yoLabel],
  );

  // Heatmap
  const ageGroups = heatmap.ages.filter((a) => a !== ALL_AGES_KEY);
  const allAgesIdx = heatmap.ages.indexOf(ALL_AGES_KEY);
  const grandTotal = heatmap[ALL_ETHNICITIES_KEY]?.[allAgesIdx] ?? 1;

  // All ethnicity keys present in this seat's data, sorted by all-ages % descending
  const ethnicities = Object.keys(heatmap)
    .filter((k) => k !== "ages" && k !== ALL_ETHNICITIES_KEY)
    .sort((a, b) => {
      const aPerc = (heatmap[a]?.[allAgesIdx] ?? 0) / grandTotal;
      const bPerc = (heatmap[b]?.[allAgesIdx] ?? 0) / grandTotal;
      return bPerc - aPerc;
    });

  function cellPerc(ethnicity: string, ageLabel: string): number {
    const idx = heatmap.ages.indexOf(ageLabel);
    return ((heatmap[ethnicity]?.[idx] ?? 0) / grandTotal) * 100;
  }

  const scaleMax = Math.max(cellPerc(ethnicities[0] ?? "", ALL_AGES_KEY), 1);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-8">
      {/* Voter Pyramid — 1/3 */}
      <div className="order-2 flex flex-col gap-3 lg:order-1 lg:w-1/3 lg:shrink-0">
        <h3 className="translate-x-[1ch] text-center font-heading text-heading-2xs font-semibold text-txt-black-900">
          {s("gender_age_distr")}
        </h3>

        {/* Legend */}
        <div className="flex translate-x-[2ch] justify-center gap-6 text-body-sm text-txt-black-700">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-5 rounded-sm"
              style={{
                backgroundColor: FEMALE_FILL_COLOR,
                border: `1px solid ${FEMALE_COLOR}`,
              }}
            />
            {femaleLabel} ({femalePercent})
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-5 rounded-sm"
              style={{
                backgroundColor: MALE_FILL_COLOR,
                border: `1px solid ${MALE_COLOR}`,
              }}
            />
            {maleLabel} ({malePercent})
          </span>
        </div>

        <div style={{ height: "420px", position: "relative" }}>
          <Bar
            data={chartData}
            options={chartOptions}
            plugins={[hoverGuidePlugin]}
          />
        </div>
      </div>

      {/* Heatmap — 2/3 */}
      <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2 lg:w-2/3">
        <h3 className="text-center font-heading text-heading-2xs font-semibold text-txt-black-900">
          {s("heatmap_title")}
        </h3>

        <div className="overflow-x-auto">
          <table
            className="w-full text-right text-body-sm"
            style={{ borderCollapse: "separate", borderSpacing: "2px" }}
          >
            <thead>
              <tr>
                <th className="sticky left-0 z-[3] w-[112px] min-w-[112px] bg-bg-white pb-1 text-left text-body-sm font-normal text-txt-black-500 sm:w-[140px] sm:min-w-[140px] lg:w-[160px] lg:min-w-[160px]" />
                {/* Aggregate age column header */}
                <th className="sticky left-[112px] z-[2] bg-bg-white px-2 pb-1 text-center text-body-sm font-normal text-txt-black-500 sm:left-[140px] lg:left-[160px]">
                  {allAgesLabel}
                </th>
                {ageGroups.map((age) => (
                  <th
                    key={age}
                    className="min-w-[68px] px-2 pb-1 text-center text-body-sm font-normal text-txt-black-500"
                  >
                    {age}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Aggregate row — top, colored */}
              <tr>
                <td className="sticky left-0 z-[3] w-[112px] min-w-[112px] overflow-hidden text-ellipsis whitespace-nowrap bg-bg-white py-2 pr-2 text-right text-body-sm font-medium text-txt-black-900 sm:w-[140px] sm:min-w-[140px] sm:pr-3 lg:w-[160px] lg:min-w-[160px] lg:py-2.5">
                  {allEthnicitiesLabel}
                </td>
                {/* Aggregate row x aggregate column = 100%, always darkest */}
                <td
                  className="sticky left-[112px] z-[2] rounded px-3 py-2 text-center font-medium sm:left-[140px] lg:left-[160px] lg:py-2.5"
                  style={{
                    background: heatBg(1, dark),
                    color: heatFg(1, dark),
                    minWidth: "68px",
                  }}
                >
                  100%
                </td>
                {ageGroups.map((age) => {
                  const perc = cellPerc(ALL_ETHNICITIES_KEY, age);
                  const t = Math.min(perc / scaleMax, 1);
                  return (
                    <td
                      key={age}
                      className="rounded px-3 py-2 text-center font-medium lg:py-2.5"
                      style={{
                        background: heatBg(t, dark),
                        color: heatFg(t, dark),
                        minWidth: "68px",
                      }}
                    >
                      {heatValue(perc)}
                    </td>
                  );
                })}
              </tr>
              {/* Ethnicity rows, sorted by aggregate % desc */}
              {ethnicities.map((eth) => {
                const overallPerc = cellPerc(eth, ALL_AGES_KEY);
                const tOverall = Math.min(overallPerc / scaleMax, 1);
                const ethLabel = s(`ethnic_groups.${eth}`) || eth;
                return (
                  <tr key={eth}>
                    <td className="sticky left-0 z-[3] w-[112px] min-w-[112px] overflow-hidden text-ellipsis whitespace-nowrap bg-bg-white py-2 pr-2 text-right text-body-sm text-txt-black-700 sm:w-[140px] sm:min-w-[140px] sm:pr-3 lg:w-[160px] lg:min-w-[160px] lg:py-2.5">
                      {ethLabel}
                    </td>
                    <td
                      className="sticky left-[112px] z-[2] rounded px-3 py-2 text-center sm:left-[140px] lg:left-[160px] lg:py-2.5"
                      style={{
                        background: heatBg(tOverall, dark),
                        color: heatFg(tOverall, dark),
                        minWidth: "68px",
                      }}
                    >
                      {overallPerc > 0 ? heatPercent(overallPerc) : "-"}
                    </td>
                    {ageGroups.map((age) => {
                      const perc = cellPerc(eth, age);
                      const t = Math.min(perc / scaleMax, 1);
                      return (
                        <td
                          key={age}
                          className="rounded px-3 py-2 text-center lg:py-2.5"
                          style={{
                            background: heatBg(t, dark),
                            color: heatFg(t, dark),
                            minWidth: "68px",
                          }}
                        >
                          {heatValue(perc)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
