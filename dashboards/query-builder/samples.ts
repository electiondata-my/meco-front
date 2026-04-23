import type { DatasetKey } from "./datasets";

export interface SampleQuery {
  name: string;
  description: string;
  dataset: DatasetKey;
  sql: string;
}

export interface InterestingQuestion {
  question: string;
  dataset: DatasetKey;
  sql: string;
}

export const INTERESTING_QUESTIONS: InterestingQuestion[] = [
  {
    question: "What was the smallest winning margin ever?",
    dataset: "results_stats",
    sql: "SELECT\n  date,\n  election,\n  state,\n  seat,\n  majority,\n  majority_perc\nFROM\n  results_stats\nWHERE\n  majority_perc NOT NULL -- uncontested seats\nORDER BY\n  majority ASC\nLIMIT\n  10",
  },
  {
    question: "What was the largest winning margin ever?",
    dataset: "results_stats",
    sql: "SELECT\n  seat,\n  winner,\n  party,\n  winning_margin\nFROM results_stats\nORDER BY winning_margin DESC\nLIMIT 20",
  },
  {
    question: "How has the proportion of women in Malaysian parliament changed over time?",
    dataset: "results_ballots",
    sql: "SELECT\n  election,\n  COUNT(*) FILTER (WHERE sex = 'F') AS women,\n  COUNT(*) AS total_candidates,\n  ROUND(\n    COUNT(*) FILTER (WHERE sex = 'F') * 100.0 / COUNT(*),\n    1\n  ) AS pct_female\nFROM results_ballots\nGROUP BY election\nORDER BY election",
  },
  {
    question: "Which party won the most seats?",
    dataset: "results_stats",
    sql: "SELECT\n  party,\n  COUNT(*) AS seats_won\nFROM results_stats\nGROUP BY party\nORDER BY seats_won DESC",
  },
  {
    question: "Which constituency had the highest voter turnout?",
    dataset: "results_ballots",
    sql: "SELECT\n  seat,\n  ROUND(\n    CAST(votes_cast AS FLOAT) / NULLIF(reg_voters, 0) * 100,\n    2\n  ) AS turnout_pct\nFROM results_ballots\nORDER BY turnout_pct DESC\nLIMIT 30",
  },
  {
    question: "Who were the top vote-getters overall?",
    dataset: "results_ballots",
    sql: "SELECT\n  candidate,\n  party,\n  seat,\n  votes\nFROM results_ballots\nORDER BY votes DESC\nLIMIT 20",
  },
  {
    question: "Which state had the most spoilt ballots?",
    dataset: "results_ballots",
    sql: "SELECT\n  state,\n  SUM(votes_spoilt) AS total_spoilt\nFROM results_ballots\nGROUP BY state\nORDER BY total_spoilt DESC",
  },
  {
    question: "Which seats were contested by exactly three candidates?",
    dataset: "results_stats",
    sql: "SELECT *\nFROM results_stats\nWHERE num_candidates = 3\nLIMIT 50",
  },
  {
    question: "Which constituency had the most registered voters?",
    dataset: "results_ballots",
    sql: "SELECT\n  seat,\n  state,\n  MAX(reg_voters) AS registered_voters\nFROM results_ballots\nGROUP BY seat, state\nORDER BY registered_voters DESC\nLIMIT 20",
  },
];

export const SAMPLE_QUERIES: SampleQuery[] = [
  {
    name: "Preview ballots",
    description: "First 20 rows of the ballots dataset",
    dataset: "results_ballots",
    sql: "SELECT *\nFROM results_ballots\nLIMIT 20",
  },
  {
    name: "Preview stats",
    description: "First 20 rows of the seat stats dataset",
    dataset: "results_stats",
    sql: "SELECT *\nFROM results_stats\nLIMIT 20",
  },
];
