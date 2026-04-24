import { DATASETS, type DatasetKey } from "./datasets";

const URL_PATTERN = /https?:\/\/|ftp:\/\//i;

export function prepareQuery(rawSql: string): string {
  if (URL_PATTERN.test(rawSql)) {
    throw new Error(
      "Raw URLs are not allowed. Use an approved dataset name instead (e.g. headline_ballots)."
    );
  }

  let sql = rawSql;

  for (const [alias, url] of Object.entries(DATASETS) as [DatasetKey, string][]) {
    // Match unquoted: headline_ballots  OR  single-quoted: 'headline_ballots'
    const unquoted = new RegExp(`\\b${alias}\\b`, "gi");
    const singleQuoted = new RegExp(`'${alias}'`, "gi");
    const replacement = `'${url}'`;
    sql = sql.replace(singleQuoted, replacement);
    sql = sql.replace(unquoted, replacement);
  }

  return sql;
}
