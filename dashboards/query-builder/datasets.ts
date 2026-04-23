export type DatasetKey = keyof typeof DATASETS;

export const DATASETS = {
  results_ballots: "https://lake.electiondata.my/results/consol_ballots.parquet",
  results_stats: "https://lake.electiondata.my/results/consol_stats.parquet",
} as const;

export const DATASET_LABELS: Record<DatasetKey, string> = {
  results_ballots: "results-ballots",
  results_stats: "results-stats",
};

export const DATASET_DESCRIPTIONS: Record<DatasetKey, string> = {
  results_ballots: "Individual ballot results by candidate and constituency",
  results_stats: "Aggregated seat-level statistics and winning margins",
};

export const DEFAULT_DATASET: DatasetKey = "results_ballots";
