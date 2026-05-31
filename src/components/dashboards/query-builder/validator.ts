import { DATASETS } from "./datasets";

const URL_PATTERN = /https?:\/\/|ftp:\/\//i;
const LEGACY_DATASETS = {
  results_ballots: DATASETS.headline_ballots,
  results_stats: DATASETS.headline_stats,
} as const;

export function prepareQuery(rawSql: string): string {
  if (URL_PATTERN.test(rawSql)) {
    throw new Error(
      "Raw URLs are not allowed. Use an approved dataset name instead (e.g. headline_ballots)."
    );
  }

  let sql = rawSql;

  const datasets = {
    ...DATASETS,
    ...LEGACY_DATASETS,
  };

  for (const [alias, url] of Object.entries(datasets) as [string, string][]) {
    // Match unquoted table names or single-quoted table names.
    const unquoted = new RegExp(`\\b${alias}\\b`, "gi");
    const singleQuoted = new RegExp(`'${alias}'`, "gi");
    const replacement = `'${url}'`;
    sql = sql.replace(singleQuoted, replacement);
    sql = sql.replace(unquoted, replacement);
  }

  return sql;
}
