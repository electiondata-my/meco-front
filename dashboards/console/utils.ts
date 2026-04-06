// --------------- Types ---------------

export type Period = "1h" | "24h" | "7d" | "30d";

export interface AnalyticsTotals {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  unique_endpoints: number;
  active_keys: number;
  last_request_at: string | null;
}

export interface DailyStatus {
  date: string;
  total_requests: number;
  successful_requests: number;
  client_errors: number;
  server_errors: number;
}

export interface DailyLatency {
  date: string;
  p50: number;
  p95: number;
  p99: number;
}

export interface EndpointStat {
  endpoint: string;
  total_requests: number;
  successful_requests: number;
  success_rate_pct: number;
  last_used_at: string;
}

export interface EndpointHealth {
  endpoint: string;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  total_requests: number;
  successful_requests: number;
}

export interface CountryStat {
  country: string;
  total_requests: number;
}

export interface RawLog {
  timestamp: string;
  endpoint: string;
  params: string;
  status_code: number;
  latency_ms: number;
  api_key: string;
  country: string;
}

export interface ApiKey {
  key: string;
  name: string;
}

export interface KeyStat {
  api_key: string;
  total_requests: number;
  successful_requests: number;
  last_used_at: string | null;
  p50_latency_ms?: number;
  p95_latency_ms?: number;
  p99_latency_ms?: number;
}

export interface AnalyticsData {
  totals: AnalyticsTotals[];
  daily_status: DailyStatus[];
  daily_latency: DailyLatency[];
  by_endpoint: EndpointStat[];
  endpoint_health: EndpointHealth[];
  by_country: CountryStat[];
  raw_logs: RawLog[];
  by_key: KeyStat[];
}

// --------------- Constants ---------------

export const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "/api/auth";
export const MAX_KEYS = 15;

export const PERIOD_HOURS: Record<Period, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

export const PERIOD_INTERVAL: Record<Period, string> = {
  "1h": "1m",
  "24h": "10m",
  "7d": "1h",
  "30d": "1d",
};

export const CHART_GREEN = "#16a34a";
export const CHART_GREEN_H = "#16a34a28";
export const CHART_GREY = "#a1a1aa";
export const CHART_GREY_H = "#a1a1aa28";
export const CHART_RED = "#dc2626";
export const CHART_RED_H = "#dc262628";
export const CHART_CRIMSON = "#be123c";
export const CHART_CRIMSON_H = "#be123c18";

// --------------- Helpers ---------------

export function truncateKey(key: string): string {
  if (key.length <= 16) return key;
  return `${key.slice(0, 12)}…${key.slice(-4)}`;
}

export function fmtNum(n: number): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function fmtDate(iso: string): string {
  // Tinybird stores timestamps in UTC without timezone suffix — normalise to UTC before parsing
  const normalized = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(normalized).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtMs(ms: number): string {
  if (ms == null || isNaN(ms)) return "—";
  return `${Math.round(ms)}ms`;
}

export function latencyStyle(
  ms: number,
  warnAt: number,
  dangerAt: number,
): React.CSSProperties {
  if (ms == null || isNaN(ms)) return {};
  return {
    color: ms <= warnAt ? "#15803d" : ms <= dangerAt ? "#d97706" : "#dc2626",
  };
}

export function successRate(successful: number, total: number): string {
  if (total === 0) return "—";
  return `${((successful / total) * 100).toFixed(1)}%`;
}
