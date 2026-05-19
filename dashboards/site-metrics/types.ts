export type Period = "7d" | "30d" | "90d" | "all";
export const PERIODS: Period[] = ["7d", "30d", "90d", "all"];

export interface SiteMetricsRow {
  "timeseries.date": string;
  views: number;
  queries: number;
  downloads: number;
  api_users: number | null;
  api_hits: number;
  lake_hits: number;
}

export type MetricKey = keyof Omit<SiteMetricsRow, "timeseries.date">;

export const DATE_FROM = "2026-01-27";

export const METRICS: {
  key: MetricKey;
  labelKey: string;
}[] = [
  { key: "views", labelKey: "chart.page_views" },
  { key: "queries", labelKey: "chart.queries_built" },
  { key: "downloads", labelKey: "chart.dataset_downloads" },
  { key: "api_users", labelKey: "chart.api_users" },
  { key: "api_hits", labelKey: "chart.api_hits" },
  { key: "lake_hits", labelKey: "chart.data_lake_hits" },
];
