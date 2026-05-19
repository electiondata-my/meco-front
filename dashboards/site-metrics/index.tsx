import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
} from "chart.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import MetricPanel, { ROW_COLORS, buildChartOptions } from "./MetricPanel";
import MetricRow from "./MetricRow";
import { DATE_FROM, METRICS, PERIODS, type Period, type SiteMetricsRow } from "./types";
import { dailyCallout, metricTotal } from "./utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

const TB_BASE = process.env.NEXT_PUBLIC_API_URL_TB ?? "";

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={clx("size-4", spinning && "animate-spin")}
    >
      <path
        fillRule="evenodd"
        d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PeriodPills({
  period,
  setPeriod,
  loading,
  fetchData,
  t,
}: {
  period: Period;
  setPeriod: (p: Period) => void;
  loading: boolean;
  fetchData: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg border border-otl-gray-200 p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={clx(
              "rounded-md px-3 py-1 text-body-sm font-medium transition",
              period === p
                ? "bg-bg-black-900 text-txt-white"
                : "text-txt-black-500 hover:text-txt-black-900",
            )}
          >
            {t(`period.${p}`)}
          </button>
        ))}
      </div>
      <button
        onClick={fetchData}
        disabled={loading}
        aria-label="Refresh"
        className="flex size-8 items-center justify-center rounded-lg border border-otl-gray-200 text-txt-black-500 transition hover:text-txt-black-900 disabled:opacity-40"
      >
        <RefreshIcon spinning={loading} />
      </button>
    </div>
  );
}

export default function SiteMetricsDashboard() {
  const { t } = useTranslation("site-metrics");
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState<Period>("30d");
  const [allRows, setAllRows] = useState<SiteMetricsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("chartjs-adapter-luxon");
    setMounted(true);
  }, []);

  const fetchData = useCallback(() => {
    const token = process.env.NEXT_PUBLIC_TINYBIRD_TOKEN;
    const url = `${TB_BASE}/v0/pipes/site_metrics.json?token=${token}&date_from=${DATE_FROM}`;

    setLoading(true);
    setError(null);

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load site metrics");
        return r.json();
      })
      .then((json) => setAllRows(json?.data ?? []))
      .catch((e) => {
        setAllRows([]);
        setError(e instanceof Error ? e.message : "Failed to load site metrics");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rows = useMemo(() => {
    if (period === "all") return allRows;
    const days: Record<Exclude<Period, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const d = new Date();
    d.setDate(d.getDate() - days[period]);
    const cutoff = d.toISOString().slice(0, 10);
    return allRows.filter((row) => row["timeseries.date"] >= cutoff);
  }, [allRows, period]);

  const chartOptions = useMemo(() => buildChartOptions(), []);

  const pillsProps = { period, setPeriod, loading, fetchData, t };

  return (
    <div className="w-full px-4.5 md:px-6">
      <div className="mx-auto w-full max-w-screen-xl">
        {error && (
          <p className="py-3 text-center text-body-sm text-txt-danger">{error}</p>
        )}

        {/* ── Mobile layout ── */}
        <div className="lg:hidden pb-8">
          <div className="flex flex-col items-center gap-3 px-3 py-6">
            <h1 className="font-heading text-heading-sm font-semibold text-txt-black-900">
              {t("meta.title")}
            </h1>
            <PeriodPills {...pillsProps} />
          </div>

          <div>
            <div className="grid grid-cols-[1fr_4rem_3rem_3.5rem] items-center gap-3 border-b border-otl-gray-100 px-4 py-2">
              <span />
              <span className="text-center text-xs font-semibold uppercase tracking-wider text-txt-black-400">
                {t("trend")}
              </span>
              <span className="text-right text-xs font-semibold uppercase tracking-wider text-txt-black-400">
                {t("daily")}
              </span>
              <span className="text-right text-xs font-semibold uppercase tracking-wider text-txt-black-400">
                {t("total")}
              </span>
            </div>

            {METRICS.map((metric, index) => {
              const { color, colorH } = ROW_COLORS[index];
              return (
                <MetricRow
                  key={metric.key}
                  title={t(metric.labelKey)}
                  metricKey={metric.key}
                  rows={rows}
                  daily={dailyCallout(rows, metric.key)}
                  total={metricTotal(rows, metric.key)}
                  color={color}
                  colorH={colorH}
                  loading={loading}
                  mounted={mounted}
                />
              );
            })}
          </div>
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden lg:flex lg:h-[calc(100svh-4rem)] lg:w-full lg:flex-col">
          <div className="flex flex-col items-center gap-3 px-3 py-6">
            <h1 className="font-heading text-heading-sm font-semibold text-txt-black-900">
              {t("meta.title")}
            </h1>
            <PeriodPills {...pillsProps} />
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2">
            {METRICS.map((metric, index) => {
              const { color, colorH } = ROW_COLORS[index];
              return (
                <div key={metric.key} className="flex min-h-0 flex-col">
                  <MetricPanel
                    title={t(metric.labelKey)}
                    dailyLabel={t("daily")}
                    totalLabel={t("total")}
                    metricKey={metric.key}
                    rows={rows}
                    daily={dailyCallout(rows, metric.key)}
                    total={metricTotal(rows, metric.key)}
                    color={color}
                    colorH={colorH}
                    loading={loading}
                    mounted={mounted}
                    chartOptions={chartOptions}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
