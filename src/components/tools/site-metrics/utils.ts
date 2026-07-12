import { numFormat } from "@lib/helpers";
import type { MetricKey, SiteMetricsRow } from "./types";

// Tinybird returns timestamps as "YYYY-MM-DD HH:MM:SS"; Luxon needs ISO 8601 with T + timezone.
export function toUtcIso(s: string): string {
  const withT = s.replace(" ", "T");
  return /[Zz]|[+-]\d{2}:?\d{2}$/.test(withT) ? withT : withT + "Z";
}

export function rowValue(row: SiteMetricsRow, key: MetricKey): number {
  return row[key] ?? 0;
}

export function latestDaily(rows: SiteMetricsRow[], key: MetricKey): number {
  if (!rows.length) return 0;
  return rowValue(rows[rows.length - 1], key);
}

/** Daily callout value: latest day, or today − yesterday for cumulative api_users. */
export function dailyCallout(rows: SiteMetricsRow[], key: MetricKey): number {
  if (key === "api_users") {
    if (rows.length < 2) return 0;
    return (
      rowValue(rows[rows.length - 1], key) -
      rowValue(rows[rows.length - 2], key)
    );
  }
  return latestDaily(rows, key);
}

/** Previous day callout value, with cumulative api_users converted to a daily delta. */
export function yesterdayCallout(rows: SiteMetricsRow[], key: MetricKey): number {
  if (key === "api_users") {
    if (rows.length < 3) return 0;
    return (
      rowValue(rows[rows.length - 2], key) -
      rowValue(rows[rows.length - 3], key)
    );
  }
  if (rows.length < 2) return 0;
  return rowValue(rows[rows.length - 2], key);
}

export function metricTotal(rows: SiteMetricsRow[], key: MetricKey): number {
  if (key === "api_users") {
    return latestDaily(rows, key);
  }
  return rows.reduce((sum, row) => sum + rowValue(row, key), 0);
}

export function formatDaily(value: number): string {
  const formatted = numFormat(
    Math.abs(value),
    "standard",
    0,
    "short",
    "en-GB",
  );
  if (value < 0) return `-${formatted}`;
  return `+${formatted}`;
}

export function formatTotal(value: number): string {
  return numFormat(value, "standard", 0, "short", "en-GB");
}

export function formatAxis(value: number | string): string {
  return numFormat(Number(value), "compact", 0, "short", "en-GB");
}

export function formatTooltipValue(value: number | string): string {
  return numFormat(Number(value), "standard", 0, "short", "en-GB");
}
