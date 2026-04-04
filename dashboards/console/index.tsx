import { Button, Card } from "@components/index";
import Dropdown from "@components/Dropdown";
import Container from "@components/Container";
import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import { COLOR } from "@lib/constants";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "/api/auth";
const MAX_KEYS = 15;

// --------------- Types ---------------

type Period = "1h" | "24h" | "7d" | "30d";

const PERIOD_HOURS: Record<Period, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

const PERIOD_INTERVAL: Record<Period, string> = {
  "1h": "1m",
  "24h": "10m",
  "7d": "1h",
  "30d": "1d",
};

// Chart-specific colors — cleaner than global COLOR constants
const CHART_GREEN = "#16a34a";
const CHART_GREEN_H = "#16a34a28";
const CHART_GREY = "#a1a1aa";
const CHART_GREY_H = "#a1a1aa28";
const CHART_RED = "#dc2626";
const CHART_RED_H = "#dc262628";
const CHART_CRIMSON = "#be123c";
const CHART_CRIMSON_H = "#be123c18";

interface AnalyticsTotals {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  unique_endpoints: number;
  active_keys: number;
  last_request_at: string | null;
}

interface DailyStatus {
  date: string;
  total_requests: number;
  successful_requests: number;
  client_errors: number;
  server_errors: number;
}

interface DailyLatency {
  date: string;
  p50: number;
  p95: number;
  p99: number;
}

interface EndpointStat {
  endpoint: string;
  total_requests: number;
  successful_requests: number;
  success_rate_pct: number;
  last_used_at: string;
}

interface EndpointHealth {
  endpoint: string;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  total_requests: number;
  successful_requests: number;
}

interface CountryStat {
  country: string;
  total_requests: number;
}

interface RawLog {
  timestamp: string;
  endpoint: string;
  params: string;
  status_code: number;
  latency_ms: number;
  api_key: string;
  country: string;
}

interface ApiKey {
  key: string;
  name: string;
}

interface KeyStat {
  api_key: string;
  total_requests: number;
  successful_requests: number;
  last_used_at: string | null;
  p50_latency_ms?: number;
  p95_latency_ms?: number;
  p99_latency_ms?: number;
}

interface AnalyticsData {
  totals: AnalyticsTotals[];
  daily_status: DailyStatus[];
  daily_latency: DailyLatency[];
  by_endpoint: EndpointStat[];
  endpoint_health: EndpointHealth[];
  by_country: CountryStat[];
  raw_logs: RawLog[];
  by_key: KeyStat[];
}

// --------------- Helpers ---------------

function truncateKey(key: string): string {
  if (key.length <= 16) return key;
  return `${key.slice(0, 12)}…${key.slice(-4)}`;
}

function fmtNum(n: number): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function fmtDate(iso: string): string {
  // Tinybird stores timestamps in UTC without timezone suffix — normalise to UTC before parsing
  const normalized = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(normalized).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMs(ms: number): string {
  if (ms == null || isNaN(ms)) return "—";
  return `${Math.round(ms)}ms`;
}

function latencyStyle(ms: number, warnAt: number, dangerAt: number): React.CSSProperties {
  if (ms == null || isNaN(ms)) return {};
  return {
    color: ms <= warnAt ? "#15803d" : ms <= dangerAt ? "#d97706" : "#dc2626",
  };
}

function successRate(successful: number, total: number): string {
  if (total === 0) return "—";
  return `${((successful / total) * 100).toFixed(1)}%`;
}

// --------------- Sub-components ---------------


function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-4 font-heading text-body-lg font-semibold text-txt-black-900">
      {title}
    </h3>
  );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-otl-gray-200">
      <table className="w-full text-body-sm">{children}</table>
    </div>
  );
}

function Th({ children, right, center }: { children: React.ReactNode; right?: boolean; center?: boolean }) {
  return (
    <th
      className={clx(
        "border-b border-otl-gray-200 bg-bg-black-100 px-4 py-2.5 text-body-xs font-semibold uppercase tracking-widest text-txt-black-500",
        right ? "text-right" : center ? "text-center" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, right, center, mono }: { children: React.ReactNode; right?: boolean; center?: boolean; mono?: boolean }) {
  return (
    <td
      className={clx(
        "border-b border-otl-gray-200 px-4 py-3 text-txt-black-900",
        right ? "text-right" : center ? "text-center" : "text-left",
        mono && "font-mono text-body-xs",
      )}
    >
      {children}
    </td>
  );
}

function StatusBadge({ code }: { code: number }) {
  const isSuccess = code < 400;
  const isClientErr = code >= 400 && code < 500;
  return (
    <span
      className={clx(
        "rounded px-1.5 py-0.5 font-mono text-body-xs",
        isSuccess && "bg-bg-success-100 text-txt-success",
        isClientErr && "bg-bg-warning-100 text-txt-warning",
        !isSuccess && !isClientErr && "bg-bg-danger-100 text-txt-danger",
      )}
    >
      {code}
    </span>
  );
}


// Forces the legend block to a fixed height on every chart so both plot areas are pixel-identical
const fixedLegendPlugin = {
  id: "fixedLegend",
  beforeInit(chart: ChartJS) {
    const legend = chart.legend as any;
    if (!legend) return;
    const originalFit = legend.fit?.bind(legend);
    if (!originalFit) return;
    legend.fit = function () {
      originalFit();
      this.height = 36;
    };
  },
};

const CHART_OPTIONS_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: { legend: { position: "top" as const } },
  scales: {
    y: { grid: { color: "rgba(128,128,128,0.15)" } },
  },
};

// Tinybird returns timestamps as "YYYY-MM-DD HH:MM:SS" (space separator, no timezone).
// Luxon requires a proper ISO 8601 string with T separator and timezone.
function toUtcIso(s: string): string {
  const withT = s.replace(" ", "T");
  return /[Zz]|[+-]\d{2}:?\d{2}$/.test(withT) ? withT : withT + "Z";
}

// Time-scale x-axis config, human-readable per period
function timeXAxis(period: Period) {
  const unit: Record<Period, "minute" | "hour" | "day"> = {
    "1h": "minute",
    "24h": "hour",
    "7d": "hour",
    "30d": "day",
  };
  const fmt: Record<Period, string> = {
    "1h": "HH:mm",
    "24h": "HH:mm",
    "7d": "d MMM HH:mm",
    "30d": "d MMM",
  };
  const u = unit[period];
  return {
    type: "time" as const,
    time: {
      unit: u,
      displayFormats: { [u]: fmt[period] },
      tooltipFormat: "d MMM yyyy, HH:mm",
    },
    grid: { display: false },
    ticks: { maxRotation: 0 },
  };
}

// --------------- Main Dashboard ---------------

export default function ConsoleDashboard() {
  const { t } = useTranslation("console");
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [period, setPeriod] = useState<Period>("1h");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyNameError, setNewKeyNameError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  // Raw logs filters
  const [logsErrorsOnly, setLogsErrorsOnly] = useState(false);
  const [logsSlowOnly, setLogsSlowOnly] = useState(false);
  const [logsKeyFilter, setLogsKeyFilter] = useState<string>("");

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    import("chartjs-adapter-luxon");
    setMounted(true);
    // Session check
    fetch(`${AUTH_URL}/me`, { credentials: "include" }).then(r => {
      if (!r.ok) router.replace("/signin");
      else setSessionChecked(true);
    }).catch(() => router.replace("/signin"));
  }, []);

  const fetchAnalytics = useCallback((p: Period) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    fetch(`${AUTH_URL}/analytics/me?hours=${PERIOD_HOURS[p]}&interval=${PERIOD_INTERVAL[p]}`, {
      credentials: "include",
    })
      .then(async r => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then(data => setAnalytics(data))
      .catch(e => setAnalyticsError(e.message))
      .finally(() => setAnalyticsLoading(false));
  }, []);

  // On initial load: try 1h, then use last_request_at from 30d to pick the right period
  const fetchAnalyticsWithFallback = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      // Step 1: fetch 1h
      const r1h = await fetch(`${AUTH_URL}/analytics/me?hours=1&interval=1m`, { credentials: "include" });
      if (!r1h.ok) throw new Error("Failed to load analytics");
      const data1h: AnalyticsData = await r1h.json();

      if ((data1h.totals?.[0]?.total_requests ?? 0) > 0) {
        setPeriod("1h");
        setAnalytics(data1h);
        return;
      }

      // Step 2: fetch 30d to find last_request_at
      const r30d = await fetch(`${AUTH_URL}/analytics/me?hours=720&interval=1d`, { credentials: "include" });
      if (!r30d.ok) throw new Error("Failed to load analytics");
      const data30d: AnalyticsData = await r30d.json();

      const lastAt = data30d.totals?.[0]?.last_request_at;
      if (!lastAt) {
        // New user — stay on 1h with empty data
        setPeriod("1h");
        setAnalytics(data1h);
        return;
      }

      // Step 3: compute the minimal period that covers the last request
      const normalized = /[Zz]|[+-]\d{2}:?\d{2}$/.test(lastAt) ? lastAt : lastAt + "Z";
      const hoursSince = (Date.now() - new Date(normalized).getTime()) / (1000 * 60 * 60);

      if (hoursSince <= 24) {
        const r = await fetch(`${AUTH_URL}/analytics/me?hours=24&interval=10m`, { credentials: "include" });
        if (!r.ok) throw new Error("Failed to load analytics");
        setPeriod("24h");
        setAnalytics(await r.json());
      } else if (hoursSince <= 168) {
        const r = await fetch(`${AUTH_URL}/analytics/me?hours=168&interval=1h`, { credentials: "include" });
        if (!r.ok) throw new Error("Failed to load analytics");
        setPeriod("7d");
        setAnalytics(await r.json());
      } else {
        // Already have the data
        setPeriod("30d");
        setAnalytics(data30d);
      }
    } catch (e: any) {
      setAnalyticsError(e.message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchKeys = useCallback(() => {
    setKeysLoading(true);
    fetch(`${AUTH_URL}/keys`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setKeys(data.keys ?? []))
      .catch(() => setKeys([]))
      .finally(() => setKeysLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    fetchAnalyticsWithFallback();
    fetchKeys();
  }, [sessionChecked]);

  const handleLogout = async () => {
    await fetch(`${AUTH_URL}/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    router.replace("/openapi");
  };

  const handleGenerateKey = async () => {
    const trimmed = newKeyName.trim();
    if (!trimmed) { setNewKeyNameError(t("error.name_required")); return; }
    if (!/^[a-z0-9-]+$/.test(trimmed)) { setNewKeyNameError(t("error.name_format")); return; }
    if (trimmed.length > 40) { setNewKeyNameError(t("error.name_length")); return; }
    if (keys.some(k => k.name === trimmed)) { setNewKeyNameError(t("error.name_duplicate")); return; }

    setNewKeyNameError(null);
    setGenerating(true);
    try {
      const res = await fetch(`${AUTH_URL}/keys/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setNewKeyNameError(err.error ?? t("error.generate_failed"));
        return;
      }
      setNewKeyName("");
      fetchKeys();
      fetchAnalytics(period);
    } catch {
      setNewKeyNameError(t("error.generate_failed"));
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteKey = async (key: ApiKey) => {
    setRevokeTarget(key);
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    const key = revokeTarget;
    setRevokeTarget(null);
    await fetch(`${AUTH_URL}/keys/${encodeURIComponent(key.key)}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
    fetchKeys();
    fetchAnalytics(period);
  };

  const handleCopy = (key: ApiKey) => {
    navigator.clipboard.writeText(key.key).then(() => {
      setCopiedKey(key.key);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  if (!sessionChecked) return null;

  const totals = analytics?.totals?.[0];
  const successRatePct = totals
    ? successRate(totals.successful_requests, totals.total_requests)
    : "—";

  // Merge keys with analytics by_key
  const keyStatMap = new Map<string, KeyStat>(
    (analytics?.by_key ?? []).map(k => [k.api_key, k]),
  );

  const keyNameMap = new Map<string, string>(keys.map(k => [k.key, k.name]));

  // Filtered raw logs
  const filteredLogs = (analytics?.raw_logs ?? []).filter(log => {
    if (logsErrorsOnly && log.status_code < 400) return false;
    if (logsSlowOnly && log.latency_ms <= 500) return false;
    if (logsKeyFilter && log.api_key !== logsKeyFilter) return false;
    return true;
  });


  return (
    <Container as="div" className="py-8 lg:py-12">
      <div className="col-span-full mx-auto flex w-full max-w-screen-xl flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="flex max-w-[727px] flex-col items-center space-y-4 lg:space-y-6">
            <h1 className="font-heading text-heading-sm font-semibold text-txt-black-900 lg:text-heading-md">
              {t("header")}
            </h1>
            <p className="text-body-sm text-txt-black-700 lg:text-body-md">
              {t("description")}
            </p>
          </div>

          {/* Time window toggle + sign out */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="flex rounded-lg border border-otl-gray-200 p-0.5">
                  {(["1h", "24h", "7d", "30d"] as Period[]).map(p => (
                    <button
                      key={p}
                      onClick={() => { setPeriod(p); fetchAnalytics(p); }}
                      className={clx(
                        "rounded-md px-3 py-1 text-body-sm font-medium transition",
                        period === p
                          ? "bg-bg-black-900 text-txt-white"
                          : "text-txt-black-500 hover:text-txt-black-900",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <span className={clx("text-body-xs text-txt-black-500 transition-opacity", analyticsLoading ? "opacity-100" : "opacity-0")}>
                  {t("loading")}
                </span>
              </div>
              <Button variant="default" onClick={handleLogout}>
                {t("sign_out")}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Key Management ── */}
        <section>
          <SectionHeader title={t("section.keys")} />

          {keys.length < MAX_KEYS && (
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => { setNewKeyName(e.target.value); setNewKeyNameError(null); }}
                  onKeyDown={e => e.key === "Enter" && handleGenerateKey()}
                  placeholder={t("key_placeholder")}
                  className="w-72 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 text-body-sm text-txt-black-900 outline-none focus:border-otl-gray-400"
                />
                <Button
                  variant="default"
                  disabled={generating}
                  onClick={handleGenerateKey}
                  className="shrink-0 border-transparent bg-bg-black-900 text-txt-white shadow-none hover:border-transparent hover:bg-red-600 active:bg-red-700"
                >
                  {generating ? t("generating") : t("generate_key")}
                </Button>
              </div>
              {newKeyNameError && (
                <p className="mt-1.5 pl-3 text-body-xs text-txt-danger">{newKeyNameError}</p>
              )}
            </div>
          )}

          {keys.length >= MAX_KEYS && (
            <p className="mb-3 text-body-xs text-txt-black-500">
              {t("max_keys_reached", { count: MAX_KEYS })}
            </p>
          )}

          {keysLoading ? (
            <p className="text-body-sm text-txt-black-500">{t("loading_keys")}</p>
          ) : keys.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-body-sm text-txt-black-500">
                {t("no_keys")}
              </p>
            </Card>
          ) : (
            <TableWrapper>
              <thead>
                <tr>
                  <Th>{t("table.name")}</Th>
                  <Th>{t("table.actions")}</Th>
                  <Th right>{t("table.requests")}</Th>
                  <Th right>{t("table.success_rate")}</Th>
                  <Th right>{t("table.p50_latency")}</Th>
                  <Th right>{t("table.p95_latency")}</Th>
                  <Th right>{t("table.p99_latency")}</Th>
                  <Th right>{t("table.last_used")}</Th>
                </tr>
              </thead>
              <tbody>
                {keys.map(key => {
                  const stat = keyStatMap.get(key.key);
                  return (
                    <tr key={key.key} className="hover:bg-bg-black-50">
                      <Td mono>{key.name}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(key)}
                            className={clx(
                              "rounded px-2 py-1 text-body-xs font-medium transition",
                              copiedKey === key.key
                                ? "bg-bg-success-100 text-txt-success"
                                : "border border-otl-gray-200 text-txt-black-700 hover:bg-bg-black-100",
                            )}
                          >
                            {copiedKey === key.key ? t("copied") : t("copy")}
                          </button>
                          <button
                            onClick={() => handleDeleteKey(key)}
                            className="rounded px-2 py-1 text-body-xs font-medium text-txt-danger transition hover:bg-bg-danger-100"
                          >
                            {t("revoke")}
                          </button>
                        </div>
                      </Td>
                      <Td right>{stat ? fmtNum(stat.total_requests) : "—"}</Td>
                      <Td right>
                        {stat
                          ? successRate(stat.successful_requests, stat.total_requests)
                          : "—"}
                      </Td>
                      <Td right>
                        <span style={latencyStyle(stat?.p50_latency_ms ?? NaN, 200, 500)}>{fmtMs(stat?.p50_latency_ms ?? NaN)}</span>
                      </Td>
                      <Td right>
                        <span style={latencyStyle(stat?.p95_latency_ms ?? NaN, 500, 1000)}>{fmtMs(stat?.p95_latency_ms ?? NaN)}</span>
                      </Td>
                      <Td right>
                        <span style={latencyStyle(stat?.p99_latency_ms ?? NaN, 500, 1000)}>{fmtMs(stat?.p99_latency_ms ?? NaN)}</span>
                      </Td>
                      <Td right mono>
                        {stat?.last_used_at ? fmtDate(stat.last_used_at) : t("not_used")}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrapper>
          )}
        </section>

        {analyticsError && (
          <Card className="border-txt-danger bg-bg-danger-100 p-4">
            <p className="text-body-sm text-txt-danger">{analyticsError}</p>
          </Card>
        )}

        {/* ── Overview Stats + Charts ── */}
        <section>
          <SectionHeader title={t("section.health")} />

          {mounted && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Request volume */}
            <Card className="flex flex-col gap-4 p-5">
              <div>
                <h4 className="mb-3 text-body-lg font-semibold text-txt-black-900">{t("chart.request_volume")}</h4>
                <div className="flex gap-12">
                  <div>
                    <p className="text-body-xs text-txt-black-500">{t("stat.total_requests")}</p>
                    <p className="font-heading text-body-lg font-semibold text-txt-black-900">
                      {totals ? fmtNum(totals.total_requests) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-body-xs text-txt-black-500">{t("stat.success_rate")}</p>
                    <p className="font-heading text-body-lg font-semibold text-txt-black-900">
                      {successRatePct}
                    </p>
                  </div>
                </div>
              </div>
              <div className="h-72">
                {analytics?.daily_status?.length ? (
                  <Bar
                    data={{
                      datasets: [
                        {
                          label: t("chart.successful"),
                          data: analytics.daily_status.map(d => ({ x: toUtcIso(d.date), y: d.successful_requests })),
                          backgroundColor: CHART_GREEN_H,
                          borderColor: CHART_GREEN,
                          borderWidth: 1,
                          stack: "a",
                        },
                        {
                          label: t("chart.client_errors"),
                          data: analytics.daily_status.map(d => ({ x: toUtcIso(d.date), y: d.client_errors })),
                          backgroundColor: CHART_GREY_H,
                          borderColor: CHART_GREY,
                          borderWidth: 1,
                          stack: "a",
                        },
                        {
                          label: t("chart.server_errors"),
                          data: analytics.daily_status.map(d => ({ x: toUtcIso(d.date), y: d.server_errors })),
                          backgroundColor: CHART_RED_H,
                          borderColor: CHART_RED,
                          borderWidth: 1,
                          stack: "a",
                        },
                      ],
                    }}
                    plugins={[fixedLegendPlugin]}
                    options={{
                      ...CHART_OPTIONS_BASE,
                      scales: {
                        x: { ...timeXAxis(period), stacked: true },
                        y: { ...CHART_OPTIONS_BASE.scales.y, stacked: true },
                      },
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-body-sm text-txt-black-500">
                    {t("no_data")}
                  </div>
                )}
              </div>
            </Card>

            {/* Latency percentiles */}
            <Card className="flex flex-col gap-4 p-5">
              <div>
                <h4 className="mb-3 text-body-lg font-semibold text-txt-black-900">{t("chart.median_tail_latency")}</h4>
                <div className="flex gap-12">
                  {(["p50", "p95", "p99"] as const).map(key => {
                    const val = analytics?.daily_latency?.length
                      ? analytics.daily_latency[analytics.daily_latency.length - 1][key]
                      : NaN;
                    return (
                      <div key={key}>
                        <p className="text-body-xs text-txt-black-500">{t(`table.${key}_latency`)}</p>
                        <p className="font-heading text-body-lg font-semibold text-txt-black-900">
                          {fmtMs(val)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="h-72">
                {analytics?.daily_latency?.length ? (
                  <Line
                    data={{
                      datasets: [
                        {
                          label: t("chart.median_p50"),
                          data: analytics.daily_latency.map(d => ({ x: toUtcIso(d.date), y: d.p50 })),
                          borderColor: COLOR.PRIMARY,
                          backgroundColor: COLOR.PRIMARY_H,
                          fill: "start",
                          tension: 0,
                          borderWidth: 1.5,
                          pointRadius: 0,
                          pointStyle: "circle" as const,
                        },
                        {
                          label: t("chart.near_tail_p95"),
                          data: analytics.daily_latency.map(d => ({ x: toUtcIso(d.date), y: d.p95 })),
                          borderColor: CHART_GREY,
                          backgroundColor: "transparent",
                          fill: false,
                          tension: 0,
                          borderWidth: 1.5,
                          pointRadius: 0,
                          pointStyle: "circle" as const,
                        },
                        {
                          label: t("chart.tail_p99"),
                          data: analytics.daily_latency.map(d => ({ x: toUtcIso(d.date), y: d.p99 })),
                          borderColor: CHART_CRIMSON,
                          backgroundColor: CHART_CRIMSON_H,
                          fill: false,
                          tension: 0,
                          borderWidth: 1.5,
                          pointRadius: 0,
                          pointStyle: "circle" as const,
                        },
                      ],
                    }}
                    plugins={[fixedLegendPlugin]}
                    options={{
                      ...CHART_OPTIONS_BASE,
                      plugins: {
                        ...CHART_OPTIONS_BASE.plugins,
                        legend: {
                          position: "top" as const,
                          labels: { usePointStyle: true, pointStyle: "circle" as const, boxWidth: 6, boxHeight: 6, padding: 10 },
                        },
                        tooltip: {
                          callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${Math.round(ctx.parsed.y)}ms`,
                          },
                        },
                      },
                      scales: {
                        x: {
                          ...timeXAxis(period),
                          afterDataLimits: (scale: any) => {
                            const pad = (scale.max - scale.min) * 0.01;
                            scale.min -= pad;
                            scale.max += pad;
                          },
                        },
                        y: {
                          grid: { color: "rgba(128,128,128,0.15)" },
                          ticks: {
                            maxTicksLimit: 4,
                            callback: (val: string | number) => `${val}ms`,
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-body-sm text-txt-black-500">
                    {t("no_data")}
                  </div>
                )}
              </div>
            </Card>
          </div>
          )}
        </section>

        {/* ── Endpoint Health ── */}
        <section>
          <SectionHeader title={t("section.endpoint_health")} />
          <TableWrapper>
            <thead>
              <tr>
                <Th>{t("table.endpoint")}</Th>
                <Th right>{t("table.requests")}</Th>
                <Th right>{t("table.success_rate")}</Th>
                <Th right>{t("table.p50_latency")}</Th>
                <Th right>{t("table.p95_latency")}</Th>
                <Th right>{t("table.p99_latency")}</Th>
              </tr>
            </thead>
            <tbody>
              {analytics?.endpoint_health?.length ? (
                analytics.endpoint_health.map(ep => (
                  <tr key={ep.endpoint} className="hover:bg-bg-black-50">
                    <Td mono>{ep.endpoint}</Td>
                    <Td right>{fmtNum(ep.total_requests)}</Td>
                    <Td right>{successRate(ep.successful_requests, ep.total_requests)}</Td>
                    <Td right>
                      <span style={latencyStyle(ep.p50_latency_ms, 200, 500)}>{fmtMs(ep.p50_latency_ms)}</span>
                    </Td>
                    <Td right>
                      <span style={latencyStyle(ep.p95_latency_ms, 500, 1000)}>{fmtMs(ep.p95_latency_ms)}</span>
                    </Td>
                    <Td right>
                      <span style={latencyStyle(ep.p99_latency_ms, 500, 1000)}>{fmtMs(ep.p99_latency_ms)}</span>
                    </Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-body-sm text-txt-black-500">
                    {t("no_health_data")}
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrapper>
        </section>

        {/* ── Raw Logs ── */}
        <section>
          <SectionHeader title={t("section.raw_logs")} />
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-body-sm text-txt-black-700">
              <input
                type="checkbox"
                checked={logsErrorsOnly}
                onChange={e => setLogsErrorsOnly(e.target.checked)}
                className="rounded"
              />
              {t("filter.errors_only")}
            </label>
            <label className="flex items-center gap-1.5 text-body-sm text-txt-black-700">
              <input
                type="checkbox"
                checked={logsSlowOnly}
                onChange={e => setLogsSlowOnly(e.target.checked)}
                className="rounded"
              />
              {t("filter.slow_only")}
            </label>
            {keys.length > 0 && (
              <Dropdown
                width="w-fit"
                placeholder={t("filter.all_keys")}
                options={keys.map(k => ({ label: k.name, value: k.key }))}
                selected={logsKeyFilter ? { label: keys.find(k => k.key === logsKeyFilter)?.name ?? logsKeyFilter, value: logsKeyFilter } : undefined}
                onChange={opt => setLogsKeyFilter(opt?.value ?? "")}
                anchor="left"
                enableClear
              />
            )}
          </div>

          <TableWrapper>
            <thead>
              <tr>
                <Th>{t("table.timestamp")}</Th>
                <Th>{t("table.key")}</Th>
                <Th>{t("table.endpoint")}</Th>
                <Th>{t("table.params")}</Th>
                <Th center>{t("table.status")}</Th>
                <Th right>{t("table.latency")}</Th>
                <Th center>{t("table.country")}</Th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length ? (
                filteredLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-bg-black-50">
                    <Td mono>{fmtDate(log.timestamp)}</Td>
                    <Td mono>{keyNameMap.get(log.api_key) ?? truncateKey(log.api_key)}</Td>
                    <Td mono>{log.endpoint}</Td>
                    <Td mono>{log.params}</Td>
                    <Td center>
                      <StatusBadge code={log.status_code} />
                    </Td>
                    <Td right>
                      <span className="font-medium" style={latencyStyle(log.latency_ms, 200, 500)}>{fmtMs(log.latency_ms)}</span>
                    </Td>
                    <Td center>{log.country}</Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-body-sm text-txt-black-500"
                  >
                    {analyticsLoading ? t("loading_logs") : t("no_logs")}
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrapper>

        </section>
      </div>

      {/* Revoke confirmation modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRevokeTarget(null)}>
          <div
            className="w-full max-w-sm rounded-xl border border-otl-gray-200 bg-bg-white p-6 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="mb-2 font-heading text-body-lg font-semibold text-txt-black-900">
              {t("revoke_modal.title", { name: revokeTarget.name })}
            </h3>
            <p className="mb-6 text-body-sm text-txt-black-500">
              {t("revoke_modal.description")}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="default" onClick={() => setRevokeTarget(null)}>
                {t("cancel")}
              </Button>
              <Button
                variant="default"
                onClick={confirmRevoke}
                className="border-transparent bg-txt-danger text-txt-white shadow-none hover:border-transparent hover:bg-red-700 active:bg-red-800"
              >
                {t("revoke")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
