import { Button, Card } from "@components/index";
import Dropdown from "@components/Dropdown";
import Container from "@components/Container";
import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import { COLOR } from "@lib/constants";
import { Bar, Line } from "react-chartjs-2";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCopyToClipboard } from "@hooks/useCopyToClipboard";

import {
  AUTH_URL,
  MAX_KEYS,
  PERIOD_HOURS,
  PERIOD_INTERVAL,
  CHART_GREEN,
  CHART_GREEN_H,
  CHART_GREY,
  CHART_GREY_H,
  CHART_RED,
  CHART_RED_H,
  CHART_CRIMSON,
  CHART_CRIMSON_H,
  fmtNum,
  fmtDate,
  fmtMs,
  latencyStyle,
  successRate,
  truncateKey,
  type Period,
  type AnalyticsData,
  type ApiKey,
  type KeyStat,
} from "./utils";
import { SectionHeader, TableWrapper, Th, Td, StatusBadge } from "./ui";
import {
  fixedLegendPlugin,
  CHART_OPTIONS_BASE,
  toUtcIso,
  timeXAxis,
} from "./chart-utils";

export default function ConsoleDashboard() {
  const { t } = useTranslation("console");
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [period, setPeriod] = useState<Period>("1h");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyNameError, setNewKeyNameError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  const [logsErrorsOnly, setLogsErrorsOnly] = useState(false);
  const [logsSlowOnly, setLogsSlowOnly] = useState(false);
  const [logsKeyFilter, setLogsKeyFilter] = useState<string>("");

  const { copy, isCopied, copiedValue: copiedKey } = useCopyToClipboard();

  useEffect(() => {
    import("chartjs-adapter-luxon");
    setMounted(true);
    fetch(`${AUTH_URL}/me`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) router.replace("/signin");
        else setSessionChecked(true);
      })
      .catch(() => router.replace("/signin"));
  }, []);

  const fetchAnalytics = useCallback((p: Period, silent = false) => {
    if (!silent) { setAnalyticsLoading(true); setAnalyticsError(null); }
    fetch(
      `${AUTH_URL}/analytics/me?hours=${PERIOD_HOURS[p]}&interval=${PERIOD_INTERVAL[p]}`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then((data) => setAnalytics(data))
      .catch((e) => { if (!silent) setAnalyticsError(e.message); })
      .finally(() => { if (!silent) setAnalyticsLoading(false); });
  }, []);

  const fetchAnalyticsWithFallback = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      // Step 1: fetch 1h
      const r1h = await fetch(`${AUTH_URL}/analytics/me?hours=1&interval=1m`, {
        credentials: "include",
      });
      if (!r1h.ok) throw new Error("Failed to load analytics");
      const data1h: AnalyticsData = await r1h.json();

      if ((data1h.totals?.[0]?.total_requests ?? 0) > 0) {
        setPeriod("1h");
        setAnalytics(data1h);
        return;
      }

      // Step 2: fetch 30d to find last_request_at
      const r30d = await fetch(
        `${AUTH_URL}/analytics/me?hours=720&interval=1d`,
        { credentials: "include" },
      );
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
      const normalized = /[Zz]|[+-]\d{2}:?\d{2}$/.test(lastAt)
        ? lastAt
        : lastAt + "Z";
      const hoursSince =
        (Date.now() - new Date(normalized).getTime()) / (1000 * 60 * 60);

      if (hoursSince <= 24) {
        const r = await fetch(
          `${AUTH_URL}/analytics/me?hours=24&interval=10m`,
          { credentials: "include" },
        );
        if (!r.ok) throw new Error("Failed to load analytics");
        setPeriod("24h");
        setAnalytics(await r.json());
      } else if (hoursSince <= 168) {
        const r = await fetch(
          `${AUTH_URL}/analytics/me?hours=168&interval=1h`,
          { credentials: "include" },
        );
        if (!r.ok) throw new Error("Failed to load analytics");
        setPeriod("7d");
        setAnalytics(await r.json());
      } else {
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
      .then((r) => r.json())
      .then((data) => setKeys(data.keys ?? []))
      .catch(() => setKeys([]))
      .finally(() => setKeysLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    fetchAnalyticsWithFallback();
    fetchKeys();
  }, [sessionChecked]);

  useEffect(() => {
    if (!sessionChecked) return;
    pollIntervalRef.current = setInterval(() => fetchAnalytics(period, true), 60_000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [sessionChecked, period]);

  const handleLogout = async () => {
    await fetch(`${AUTH_URL}/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    router.replace("/openapi");
  };

  const handleGenerateKey = async () => {
    const trimmed = newKeyName.trim();
    if (!trimmed) {
      setNewKeyNameError(t("error.name_required"));
      return;
    }
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      setNewKeyNameError(t("error.name_format"));
      return;
    }
    if (trimmed.length > 40) {
      setNewKeyNameError(t("error.name_length"));
      return;
    }
    if (keys.some((k) => k.name === trimmed)) {
      setNewKeyNameError(t("error.name_duplicate"));
      return;
    }

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

  if (!sessionChecked) return null;

  const totals = analytics?.totals?.[0];
  const successRatePct = totals
    ? successRate(totals.successful_requests, totals.total_requests)
    : "—";

  const keyStatMap = new Map<string, KeyStat>(
    (analytics?.by_key ?? []).map((k) => [k.api_key, k]),
  );
  const keyNameMap = new Map<string, string>(keys.map((k) => [k.key, k.name]));

  const filteredLogs = (analytics?.raw_logs ?? []).filter((log) => {
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
                  {(["1h", "24h", "7d", "30d"] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPeriod(p);
                        fetchAnalytics(p);
                      }}
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
                <span
                  className={clx(
                    "text-body-xs text-txt-black-500 transition-opacity",
                    analyticsLoading ? "opacity-100" : "opacity-0",
                  )}
                >
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
                  onChange={(e) => {
                    setNewKeyName(e.target.value);
                    setNewKeyNameError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateKey()}
                  placeholder={t("key_placeholder")}
                  className="focus:border-otl-gray-400 w-72 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 text-body-sm text-txt-black-900 outline-none"
                />
                <Button
                  variant="default"
                  disabled={generating}
                  onClick={handleGenerateKey}
                  className="shadow-none hover:bg-red-600 active:bg-red-700 shrink-0 border-transparent bg-bg-black-900 text-txt-white hover:border-transparent"
                >
                  {generating ? t("generating") : t("generate_key")}
                </Button>
              </div>
              {newKeyNameError && (
                <p className="mt-1.5 pl-3 text-body-xs text-txt-danger">
                  {newKeyNameError}
                </p>
              )}
            </div>
          )}

          {keys.length >= MAX_KEYS && (
            <p className="mb-3 text-body-xs text-txt-black-500">
              {t("max_keys_reached", { count: MAX_KEYS })}
            </p>
          )}

          {keysLoading ? (
            <p className="text-body-sm text-txt-black-500">
              {t("loading_keys")}
            </p>
          ) : keys.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-body-sm text-txt-black-500">{t("no_keys")}</p>
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
                {keys.map((key) => {
                  const stat = keyStatMap.get(key.key);
                  return (
                    <tr key={key.key} className="hover:bg-bg-black-50">
                      <Td mono>{key.name}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copy(key.key)}
                            className={clx(
                              "rounded px-2 py-1 text-body-xs font-medium transition",
                              isCopied && copiedKey === key.key
                                ? "bg-bg-success-100 text-txt-success"
                                : "border border-otl-gray-200 text-txt-black-700 hover:bg-bg-black-100",
                            )}
                          >
                            {isCopied && copiedKey === key.key
                              ? t("copied")
                              : t("copy")}
                          </button>
                          <button
                            onClick={() => setRevokeTarget(key)}
                            className="rounded px-2 py-1 text-body-xs font-medium text-txt-danger transition hover:bg-bg-danger-100"
                          >
                            {t("revoke")}
                          </button>
                        </div>
                      </Td>
                      <Td right>{stat ? fmtNum(stat.total_requests) : "—"}</Td>
                      <Td right>
                        {stat
                          ? successRate(
                              stat.successful_requests,
                              stat.total_requests,
                            )
                          : "—"}
                      </Td>
                      <Td right>
                        <span
                          style={latencyStyle(
                            stat?.p50_latency_ms ?? NaN,
                            200,
                            500,
                          )}
                        >
                          {fmtMs(stat?.p50_latency_ms ?? NaN)}
                        </span>
                      </Td>
                      <Td right>
                        <span
                          style={latencyStyle(
                            stat?.p95_latency_ms ?? NaN,
                            500,
                            1000,
                          )}
                        >
                          {fmtMs(stat?.p95_latency_ms ?? NaN)}
                        </span>
                      </Td>
                      <Td right>
                        <span
                          style={latencyStyle(
                            stat?.p99_latency_ms ?? NaN,
                            500,
                            1000,
                          )}
                        >
                          {fmtMs(stat?.p99_latency_ms ?? NaN)}
                        </span>
                      </Td>
                      <Td right mono>
                        {stat?.last_used_at
                          ? fmtDate(stat.last_used_at)
                          : t("not_used")}
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
                  <h4 className="mb-3 text-body-lg font-semibold text-txt-black-900">
                    {t("chart.request_volume")}
                  </h4>
                  <div className="flex gap-12">
                    <div>
                      <p className="text-body-xs text-txt-black-500">
                        {t("stat.total_requests")}
                      </p>
                      <p className="font-heading text-body-lg font-semibold text-txt-black-900">
                        {totals ? fmtNum(totals.total_requests) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-body-xs text-txt-black-500">
                        {t("stat.success_rate")}
                      </p>
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
                            data: analytics.daily_status.map((d) => ({
                              x: toUtcIso(d.date),
                              y: d.successful_requests,
                            })),
                            backgroundColor: CHART_GREEN_H,
                            borderColor: CHART_GREEN,
                            borderWidth: 1,
                            stack: "a",
                          },
                          {
                            label: t("chart.client_errors"),
                            data: analytics.daily_status.map((d) => ({
                              x: toUtcIso(d.date),
                              y: d.client_errors,
                            })),
                            backgroundColor: CHART_GREY_H,
                            borderColor: CHART_GREY,
                            borderWidth: 1,
                            stack: "a",
                          },
                          {
                            label: t("chart.server_errors"),
                            data: analytics.daily_status.map((d) => ({
                              x: toUtcIso(d.date),
                              y: d.server_errors,
                            })),
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
                  <h4 className="mb-3 text-body-lg font-semibold text-txt-black-900">
                    {t("chart.median_tail_latency")}
                  </h4>
                  <div className="flex gap-12">
                    {(["p50", "p95", "p99"] as const).map((key) => {
                      const val = analytics?.daily_latency?.length
                        ? analytics.daily_latency.reduce(
                            (sum, d) => sum + d[key],
                            0
                          ) / analytics.daily_latency.length
                        : NaN;
                      return (
                        <div key={key}>
                          <p className="text-body-xs text-txt-black-500">
                            {t(`table.${key}_latency`)}
                          </p>
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
                            data: analytics.daily_latency.map((d) => ({
                              x: toUtcIso(d.date),
                              y: d.p50,
                            })),
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
                            data: analytics.daily_latency.map((d) => ({
                              x: toUtcIso(d.date),
                              y: d.p95,
                            })),
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
                            data: analytics.daily_latency.map((d) => ({
                              x: toUtcIso(d.date),
                              y: d.p99,
                            })),
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
                            labels: {
                              usePointStyle: true,
                              pointStyle: "circle" as const,
                              boxWidth: 6,
                              boxHeight: 6,
                              padding: 10,
                            },
                          },
                          tooltip: {
                            callbacks: {
                              label: (ctx) =>
                                `${ctx.dataset.label}: ${Math.round(ctx.parsed.y)}ms`,
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
                analytics.endpoint_health.map((ep) => (
                  <tr key={ep.endpoint} className="hover:bg-bg-black-50">
                    <Td mono>{ep.endpoint}</Td>
                    <Td right>{fmtNum(ep.total_requests)}</Td>
                    <Td right>
                      {successRate(ep.successful_requests, ep.total_requests)}
                    </Td>
                    <Td right>
                      <span style={latencyStyle(ep.p50_latency_ms, 200, 500)}>
                        {fmtMs(ep.p50_latency_ms)}
                      </span>
                    </Td>
                    <Td right>
                      <span style={latencyStyle(ep.p95_latency_ms, 500, 1000)}>
                        {fmtMs(ep.p95_latency_ms)}
                      </span>
                    </Td>
                    <Td right>
                      <span style={latencyStyle(ep.p99_latency_ms, 500, 1000)}>
                        {fmtMs(ep.p99_latency_ms)}
                      </span>
                    </Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-body-sm text-txt-black-500"
                  >
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
                onChange={(e) => setLogsErrorsOnly(e.target.checked)}
                className="rounded"
              />
              {t("filter.errors_only")}
            </label>
            <label className="flex items-center gap-1.5 text-body-sm text-txt-black-700">
              <input
                type="checkbox"
                checked={logsSlowOnly}
                onChange={(e) => setLogsSlowOnly(e.target.checked)}
                className="rounded"
              />
              {t("filter.slow_only")}
            </label>
            {keys.length > 0 && (
              <Dropdown
                width="w-fit"
                placeholder={t("filter.all_keys")}
                options={keys.map((k) => ({ label: k.name, value: k.key }))}
                selected={
                  logsKeyFilter
                    ? {
                        label:
                          keys.find((k) => k.key === logsKeyFilter)?.name ??
                          logsKeyFilter,
                        value: logsKeyFilter,
                      }
                    : undefined
                }
                onChange={(opt) => setLogsKeyFilter(opt?.value ?? "")}
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
                    <Td mono>
                      {keyNameMap.get(log.api_key) ?? truncateKey(log.api_key)}
                    </Td>
                    <Td mono>{log.endpoint}</Td>
                    <Td mono>{log.params}</Td>
                    <Td center>
                      <StatusBadge code={log.status_code} />
                    </Td>
                    <Td right>
                      <span
                        className="font-medium"
                        style={latencyStyle(log.latency_ms, 200, 500)}
                      >
                        {fmtMs(log.latency_ms)}
                      </span>
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

      {/* ── Revoke confirmation modal ── */}
      {revokeTarget && (
        <div
          className="bg-black/40 fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setRevokeTarget(null)}
        >
          <div
            className="shadow-lg w-full max-w-sm rounded-xl border border-otl-gray-200 bg-bg-white p-6"
            onClick={(e) => e.stopPropagation()}
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
                className="shadow-none hover:bg-red-700 active:bg-red-800 border-transparent bg-txt-danger text-txt-white hover:border-transparent"
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
