import { DATASETS, LAZY_DATASETS, type DatasetKey } from "./datasets";

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

export interface FileRegistration {
  name: string;
  url: string;
  lazy: boolean;
}

export interface PreparedQuery {
  sql: string;
  registrations: FileRegistration[];
}

export function prepareQuery(rawSql: string): PreparedQuery {
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
  const registrations: FileRegistration[] = [];

  const datasets = {
    ...DATASETS,
    ...LEGACY_DATASETS,
  };

  for (const [alias, url] of Object.entries(datasets) as [string, string][]) {
    const filename = url.split("/").pop()!;
    const unquoted = new RegExp(`\\b${alias}\\b`, "gi");
    const singleQuoted = new RegExp(`'${alias}'`, "gi");
    const replacement = `'${filename}'`;
    const newSql = sql.replace(singleQuoted, replacement).replace(unquoted, replacement);
    if (newSql !== sql) {
      registrations.push({ name: filename, url, lazy: LAZY_DATASETS.has(alias as DatasetKey) });
      sql = newSql;
    }
  }

  return { sql, registrations };
}
