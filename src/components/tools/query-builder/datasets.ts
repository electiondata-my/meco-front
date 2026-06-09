export type DatasetKey = keyof typeof DATASETS;

export const DATASETS = {
  headline_ballots: "https://lake.electiondata.my/results_headline/headline_ballots.parquet",
  headline_stats: "https://lake.electiondata.my/results_headline/headline_stats.parquet",
  saluran_ballots: "https://lake.electiondata.my/results_saluran/ge15_ballots.parquet",
  saluran_stats: "https://lake.electiondata.my/results_saluran/ge15_stats.parquet",
  voter_demographics: "https://lake.electiondata.my/seat_info/demographics.parquet",
  voter_roll_ge15: "https://lake.electiondata.my/voter_rolls/ge15_2022.parquet",
} as const;

export const DATASET_LABELS: Record<DatasetKey, string> = {
  headline_ballots: "headline_ballots",
  headline_stats: "headline_stats",
  saluran_ballots: "saluran_ballots",
  saluran_stats: "saluran_stats",
  voter_demographics: "voter_demographics",
  voter_roll_ge15: "voter_roll_ge15",
};

export const DATASET_DESCRIPTIONS: Record<DatasetKey, string> = {
  headline_ballots:
    "Parliament/DUN-level results by candidate, inc. party + demographic info",
  headline_stats:
    "Aggregated Parliament/DUN-level statistics e.g. voter turnout and majority",
  saluran_ballots:
    "Saluran-level results by candidate, inc. party + demographic info",
  saluran_stats:
    "Aggregated saluran-level statistics e.g. registered voters and valid votes",
  voter_demographics:
    "Parliament/DUN-level voter demographics (sex, age, ethnicity, and voter type)",
  voter_roll_ge15:
    "Anonymised GE-15 voter roll, with voting location and voter demographics",
};

export const DEFAULT_DATASET: DatasetKey = "headline_ballots";

// Datasets that are too large to cache — use HTTP range requests instead.
// Everything else is fetched once and kept in memory for fast subsequent queries.
export const LAZY_DATASETS = new Set<DatasetKey>([
  "voter_roll_ge15",
]);
