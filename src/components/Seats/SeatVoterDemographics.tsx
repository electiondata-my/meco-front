import { useMemo, useRef, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { numFormat } from "@lib/helpers";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

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

// Light mode: danger-50 (254,242,242) → danger-900 (127,29,29)
// Dark mode:  (45,12,12) → danger-400 (248,113,113)
function heatBg(t: number, dark: boolean): string {
  if (dark) {
    const r = Math.round(45 + t * 203);
    const g = Math.round(12 + t * 101);
    const b = Math.round(12 + t * 101);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const r = Math.round(254 - t * 127);
  const g = Math.round(242 - t * 213);
  const b = Math.round(242 - t * 213);
  return `rgb(${r}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
}

function heatFg(t: number, dark: boolean): string {
  if (dark) return t > 0.55 ? "#2d0c0c" : "#fca5a5";
  return t > 0.55 ? "#fff" : "#7f1d1d";
}

function tr(ns: Record<string, any>, key: string): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], ns);
  return val != null ? String(val) : "";
}

export default function SeatVoterDemographics({
  pyramid,
  heatmap,
  translations,
}: Props) {
  const dark = useDarkMode();
  const chartRef = useRef<any>(null);
  const s = (key: string) => tr(translations.seats, key);

  // ── Pyramid ──────────────────────────────────────────────────────────────
  const labels = pyramid.ages.map((a) => (a >= 100 ? "100+" : String(a)));

  const chartData = useMemo<ChartData<"bar", number[], string>>(
    () => ({
      labels,
      datasets: [
        {
          label: s("barmeter.male") || "Male",
          data: pyramid.male,
          backgroundColor: "#6BA8FF",
          barPercentage: 1,
          categoryPercentage: 1,
        },
        {
          label: s("barmeter.female") || "Female",
          data: pyramid.female.map((v) => -v),
          backgroundColor: "#FF8DA1",
          barPercentage: 1,
          categoryPercentage: 1,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const equimax = useMemo(() => {
    const all = [...pyramid.male, ...pyramid.female].map(Math.abs);
    return Math.max(...all);
  }, [pyramid]);

  const tickColor = dark ? "#9ca3af" : "#6b7280";
  const gridColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

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
            callback: (v) => numFormat(Math.abs(v as number), "compact", 0),
          },
        },
        y: {
          reverse: true,
          stacked: true,
          grid: { display: false },
          ticks: {
            color: tickColor,
            font: { family: "Inter", size: 11 },
            padding: 4,
            maxTicksLimit: 12,
          },
          beginAtZero: true,
        },
      },
    }),
    [equimax, dark],
  );

  // ── Heatmap ───────────────────────────────────────────────────────────────
  const ageGroups = heatmap.ages.filter((a) => a !== "overall");
  const overallAgeIdx = heatmap.ages.indexOf("overall");
  const grandTotal = heatmap.overall?.[overallAgeIdx] ?? 1;

  // All ethnicity keys present in this seat's data, sorted by overall% descending
  const ethnicities = Object.keys(heatmap)
    .filter((k) => k !== "ages" && k !== "overall")
    .sort((a, b) => {
    const aPerc = (heatmap[a]?.[overallAgeIdx] ?? 0) / grandTotal;
    const bPerc = (heatmap[b]?.[overallAgeIdx] ?? 0) / grandTotal;
    return bPerc - aPerc;
  });

  function cellPerc(ethnicity: string, ageLabel: string): number {
    const idx = heatmap.ages.indexOf(ageLabel);
    return ((heatmap[ethnicity]?.[idx] ?? 0) / grandTotal) * 100;
  }

  // Scale max: largest non-overall-row cell value
  const scaleMax = Math.max(
    ...ethnicities.flatMap((e) =>
      ageGroups.map((age) => cellPerc(e, age)),
    ),
  );

  // col count for colSpan: label + overall + spacer + age cols
  const totalCols = 1 + 1 + 1 + ageGroups.length;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-8">
      {/* Voter Pyramid — 1/3 */}
      <div className="flex flex-col gap-3 lg:w-1/3 lg:shrink-0">
        <h3 className="text-center font-heading text-heading-2xs font-semibold text-txt-black-900">
          {s("gender_age_distr")}
        </h3>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-body-sm text-txt-black-700">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-5 rounded-sm bg-[#FF8DA1]" />
            {s("barmeter.female") || "Female"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-5 rounded-sm bg-[#6BA8FF]" />
            {s("barmeter.male") || "Male"}
          </span>
        </div>

        <div style={{ height: "420px", position: "relative" }}>
          <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Heatmap — 2/3 */}
      <div className="flex min-w-0 flex-col gap-3 lg:w-2/3">
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
                <th className="pb-1 text-left text-body-sm font-normal text-txt-black-500" />
                {/* Overall col header */}
                <th className="pb-1 px-2 text-body-sm font-normal text-txt-black-500">
                  {s("ethnic_groups.overall") || "Overall"}
                </th>
                {/* Spacer after overall col */}
                <th style={{ width: "8px", padding: 0 }} />
                {ageGroups.map((age) => (
                  <th
                    key={age}
                    className="pb-1 px-2 text-body-sm font-normal text-txt-black-500"
                  >
                    {age}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Overall row — top, colored */}
              <tr>
                <td className="pr-3 py-1 text-left text-body-sm font-medium text-txt-black-900 whitespace-nowrap">
                  {s("ethnic_groups.overall") || "Overall"}
                </td>
                {/* overall × overall = 100%, always darkest */}
                <td
                  className="rounded px-2 py-1 tabular-nums font-medium"
                  style={{
                    background: heatBg(1, dark),
                    color: heatFg(1, dark),
                    minWidth: "52px",
                  }}
                >
                  100%
                </td>
                <td style={{ padding: 0 }} />
                {ageGroups.map((age) => {
                  const perc = cellPerc("overall", age);
                  const t = Math.min(perc / scaleMax, 1);
                  return (
                    <td
                      key={age}
                      className="rounded px-2 py-1 tabular-nums font-medium"
                      style={{
                        background: heatBg(t, dark),
                        color: heatFg(t, dark),
                        minWidth: "52px",
                      }}
                    >
                      {perc.toFixed(1)}%
                    </td>
                  );
                })}
              </tr>
              {/* Spacer row after overall */}
              <tr>
                <td colSpan={totalCols} style={{ height: "6px", padding: 0 }} />
              </tr>
              {/* Ethnicity rows, sorted by overall% desc */}
              {ethnicities.map((eth) => {
                const overallPerc = cellPerc(eth, "overall");
                const tOverall = Math.min(overallPerc / scaleMax, 1);
                return (
                  <tr key={eth}>
                    <td className="pr-3 py-1 text-left text-body-sm text-txt-black-700 whitespace-nowrap">
                      {s(`ethnic_groups.${eth}`) || eth}
                    </td>
                    <td
                      className="rounded px-2 py-1 tabular-nums"
                      style={{
                        background: heatBg(tOverall, dark),
                        color: heatFg(tOverall, dark),
                        minWidth: "52px",
                      }}
                    >
                      {overallPerc > 0 ? `${overallPerc.toFixed(1)}%` : "—"}
                    </td>
                    <td style={{ padding: 0 }} />
                    {ageGroups.map((age) => {
                      const perc = cellPerc(eth, age);
                      const t = Math.min(perc / scaleMax, 1);
                      return (
                        <td
                          key={age}
                          className="rounded px-2 py-1 tabular-nums"
                          style={{
                            background: heatBg(t, dark),
                            color: heatFg(t, dark),
                            minWidth: "52px",
                          }}
                        >
                          {perc > 0 ? `${perc.toFixed(1)}%` : "—"}
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
