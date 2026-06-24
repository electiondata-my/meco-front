export type DatasetKey = keyof typeof DATASETS;

export const DATASETS = {
  headline_ballots: "https://lake.electiondata.my/results_headline/headline_ballots.parquet",
  headline_stats: "https://lake.electiondata.my/results_headline/headline_stats.parquet",
  voter_demographics: "https://lake.electiondata.my/seat_info/demographics.parquet",
  saluran_ballots_ge15: "https://lake.electiondata.my/results_saluran/ge15_ballots.parquet",
  saluran_ballots_ge14: "https://lake.electiondata.my/results_saluran/ge14_ballots.parquet",
  saluran_ballots_ge13: "https://lake.electiondata.my/results_saluran/ge13_ballots.parquet",
  saluran_ballots_nsn_se15: "https://lake.electiondata.my/results_saluran/nsn_se15_ballots.parquet",
  saluran_ballots_jhr_se15: "https://lake.electiondata.my/results_saluran/jhr_se15_ballots.parquet",
  saluran_stats_ge15: "https://lake.electiondata.my/results_saluran/ge15_stats.parquet",
  saluran_stats_ge14: "https://lake.electiondata.my/results_saluran/ge14_stats.parquet",
  saluran_stats_ge13: "https://lake.electiondata.my/results_saluran/ge13_stats.parquet",
  saluran_stats_nsn_se15: "https://lake.electiondata.my/results_saluran/nsn_se15_stats.parquet",
  saluran_stats_jhr_se15: "https://lake.electiondata.my/results_saluran/jhr_se15_stats.parquet",
  voter_roll_ge15: "https://lake.electiondata.my/voter_rolls/ge15_2022.parquet",
  voter_roll_ge14: "https://lake.electiondata.my/voter_rolls/ge14_2018.parquet",
  voter_roll_ge13: "https://lake.electiondata.my/voter_rolls/ge13_2013.parquet",
  voter_roll_nsn_se15: "https://lake.electiondata.my/voter_rolls/nsn_se15_2023.parquet",
  voter_roll_jhr_se15: "https://lake.electiondata.my/voter_rolls/jhr_se15_2022.parquet",
  voter_demographics_sarawak: "https://lake.electiondata.my/seat_info/demographics_sarawak.parquet",
  voter_demographics_sabah: "https://lake.electiondata.my/seat_info/demographics_sabah.parquet",
} as const;

const ELECTION_OPTIONS = [
  { label: "GE-15",     suffix: "ge15"      },
  { label: "GE-14",     suffix: "ge14"      },
  { label: "GE-13",     suffix: "ge13"      },
  { label: "N9 SE-15",  suffix: "nsn_se15"  },
  { label: "JHR SE-15", suffix: "jhr_se15"  },
] as const;

export const SALURAN_BALLOTS_OPTIONS = ELECTION_OPTIONS.map((o) => ({
  label: o.label,
  key: `saluran_ballots_${o.suffix}` as DatasetKey,
}));

export const SALURAN_STATS_OPTIONS = ELECTION_OPTIONS.map((o) => ({
  label: o.label,
  key: `saluran_stats_${o.suffix}` as DatasetKey,
}));

export const VOTER_ROLL_OPTIONS = ELECTION_OPTIONS.map((o) => ({
  label: o.label,
  key: `voter_roll_${o.suffix}` as DatasetKey,
}));

export const SALURAN_BALLOTS_KEY_SET = new Set<DatasetKey>(SALURAN_BALLOTS_OPTIONS.map((o) => o.key));
export const SALURAN_STATS_KEY_SET   = new Set<DatasetKey>(SALURAN_STATS_OPTIONS.map((o) => o.key));
export const VOTER_ROLL_KEY_SET      = new Set<DatasetKey>(VOTER_ROLL_OPTIONS.map((o) => o.key));

// The 6 card slots shown in the dataset grid
export const DATASET_GRID_KEYS: DatasetKey[] = [
  "headline_ballots",
  "headline_stats",
  "voter_demographics",
  "saluran_ballots_ge15",
  "saluran_stats_ge15",
  "voter_roll_ge15",
];

export const DATASET_LABELS: Record<DatasetKey, string> = {
  headline_ballots: "headline_ballots",
  headline_stats: "headline_stats",
  voter_demographics: "voter_demographics",
  saluran_ballots_ge15: "saluran_ballots_ge15",
  saluran_ballots_ge14: "saluran_ballots_ge14",
  saluran_ballots_ge13: "saluran_ballots_ge13",
  saluran_ballots_nsn_se15: "saluran_ballots_nsn_se15",
  saluran_ballots_jhr_se15: "saluran_ballots_jhr_se15",
  saluran_stats_ge15: "saluran_stats_ge15",
  saluran_stats_ge14: "saluran_stats_ge14",
  saluran_stats_ge13: "saluran_stats_ge13",
  saluran_stats_nsn_se15: "saluran_stats_nsn_se15",
  saluran_stats_jhr_se15: "saluran_stats_jhr_se15",
  voter_roll_ge15: "voter_roll_ge15",
  voter_roll_ge14: "voter_roll_ge14",
  voter_roll_ge13: "voter_roll_ge13",
  voter_roll_nsn_se15: "voter_roll_nsn_se15",
  voter_roll_jhr_se15: "voter_roll_jhr_se15",
  voter_demographics_sarawak: "voter_demographics_sarawak",
  voter_demographics_sabah: "voter_demographics_sabah",
};

const SALURAN_BALLOTS_DESC = "Saluran-level results by candidate, inc. party + demographic info";
const SALURAN_STATS_DESC   = "Aggregated saluran-level statistics e.g. voter turnout and rejected votes";
const VOTER_ROLL_DESC      = "Anonymised voter roll, with voting location and voter demographics";

export const DATASET_DESCRIPTIONS: Record<DatasetKey, string> = {
  headline_ballots:
    "Parliament/DUN-level results by candidate, inc. party + demographic info",
  headline_stats:
    "Aggregated Parliament/DUN-level statistics e.g. voter turnout and majority",
  voter_demographics:
    "Parliament/DUN-level voter demographics (sex, age, ethnicity)",
  saluran_ballots_ge15:     SALURAN_BALLOTS_DESC,
  saluran_ballots_ge14:     SALURAN_BALLOTS_DESC,
  saluran_ballots_ge13:     SALURAN_BALLOTS_DESC,
  saluran_ballots_nsn_se15: SALURAN_BALLOTS_DESC,
  saluran_ballots_jhr_se15: SALURAN_BALLOTS_DESC,
  saluran_stats_ge15:       SALURAN_STATS_DESC,
  saluran_stats_ge14:       SALURAN_STATS_DESC,
  saluran_stats_ge13:       SALURAN_STATS_DESC,
  saluran_stats_nsn_se15:   SALURAN_STATS_DESC,
  saluran_stats_jhr_se15:   SALURAN_STATS_DESC,
  voter_roll_ge15:          VOTER_ROLL_DESC,
  voter_roll_ge14:          VOTER_ROLL_DESC,
  voter_roll_ge13:          VOTER_ROLL_DESC,
  voter_roll_nsn_se15:      VOTER_ROLL_DESC,
  voter_roll_jhr_se15:      VOTER_ROLL_DESC,
  voter_demographics_sarawak: "Sarawak-specific seat-level voter demographics with granular ethnic breakdowns",
  voter_demographics_sabah:   "Sabah-specific seat-level voter demographics with granular ethnic breakdowns",
};

export const DEFAULT_DATASET: DatasetKey = "headline_ballots";

// Datasets that are too large to cache — use HTTP range requests instead.
// Everything else is fetched once and kept in memory for fast subsequent queries.
export const LAZY_DATASETS = new Set<DatasetKey>([
  "voter_roll_ge15",
  "voter_roll_ge14",
  "voter_roll_ge13",
  "voter_roll_nsn_se15",
  "voter_roll_jhr_se15",
]);
