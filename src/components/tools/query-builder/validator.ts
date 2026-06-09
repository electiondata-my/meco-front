import { DATASETS } from "./datasets";

const URL_PATTERN = /https?:\/\/|ftp:\/\//i;
const LIMIT_PATTERN = /\bLIMIT\s+(\d+)/i;
const VOTER_ROLL_LIMIT = 10_000;

const VOTER_ROLL_DATASETS = Object.keys(DATASETS).filter((k) =>
  k.startsWith("voter_roll"),
);

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

  const referencesVoterRoll = VOTER_ROLL_DATASETS.some((ds) =>
    new RegExp(`\\b${ds}\\b`, "i").test(rawSql),
  );

  if (referencesVoterRoll) {
    const limitMatch = LIMIT_PATTERN.exec(rawSql);
    if (!limitMatch) {
      throw new Error(
        "Voter roll datasets contain up to 22 million rows. Add LIMIT 10,000 or less to your query.",
      );
    }
    const limitValue = parseInt(limitMatch[1], 10);
    if (limitValue > VOTER_ROLL_LIMIT) {
      throw new Error(
        `Voter roll datasets contain up to 22 million rows. Your LIMIT of ${limitValue.toLocaleString()} is too high — use LIMIT 10,000 or less.`,
      );
    }
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
