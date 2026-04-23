import type { DatasetKey } from "./datasets";

export interface SampleQuery {
  name: string;
  description: string;
  dataset: DatasetKey;
  sql: string;
}

export interface InterestingQuestion {
  question: string;
  group: "Seats" | "Parties" | "Candidates";
  dataset: DatasetKey;
  sql: string;
}

export const INTERESTING_QUESTIONS: InterestingQuestion[] = [
  {
    group: "Seats",
    question: "What was the smallest winning margin ever?",
    dataset: "results_stats",
    sql: "SELECT\n  date,\n  election,\n  state,\n  seat,\n  majority,\n  majority_perc\nFROM\n  results_stats\nWHERE\n  majority_perc NOT NULL -- uncontested seats\nORDER BY\n  majority ASC\nLIMIT\n  10",
  },
  {
    group: "Seats",
    question: "Which Parliament seats are most malapportioned?",
    dataset: "results_stats",
    sql: "SELECT\n  date,\n  election,\n  state,\n  seat,\n  voters_total AS total_voters,\n  PRINTF('%.2fx', voters_total / AVG(voters_total) OVER ()) AS vs_avg\nFROM\n  results_stats\nWHERE\n  election = (\n    SELECT election\n    FROM results_stats\n    WHERE election LIKE 'GE-%'\n    ORDER BY date DESC\n    LIMIT 1\n  )\nORDER BY\n  voters_total DESC",
  },
  {
    group: "Candidates",
    question: "How has the % of female MPs changed over time?",
    dataset: "results_ballots",
    sql: "SELECT\n  election,\n  COUNT(*) AS total_mps,\n  COUNT(*) FILTER (WHERE sex = 'F') AS women_mps,\n  PRINTF(\n    '%.1f',\n    COUNT(*) FILTER (WHERE sex = 'F') * 100.0 / COUNT(*)\n  ) AS pct_female\nFROM results_ballots\nWHERE election LIKE 'GE%'\n  AND result LIKE 'won%'\nGROUP BY election\nORDER BY election",
  },
  {
    group: "Parties",
    question: "Which party won seats by the highest majority (on average) in GE-15?",
    dataset: "results_ballots",
    sql: "SELECT\n  b.party,\n  COUNT(*) AS seats_won,\n  ROUND(AVG(s.majority_perc), 2) AS avg_majority,\n  ROUND(MAX(s.majority_perc), 2) AS highest_majority,\n  ROUND(MIN(s.majority_perc), 2) AS lowest_majority\nFROM results_ballots b\nLEFT JOIN results_stats s\n  ON b.election = s.election\n  AND b.date = s.date\n  AND b.seat = s.seat\nWHERE b.election = 'GE-15'\n  AND b.result LIKE 'won%'\nGROUP BY b.party\nORDER BY avg_majority DESC",
  },
  {
    group: "Seats",
    question: "Which Sarawak DUN seats are most malapportioned?",
    dataset: "results_stats",
    sql: "SELECT\n  date,\n  election,\n  state,\n  seat,\n  voters_total AS total_voters,\n  PRINTF('%.2fx', voters_total / AVG(voters_total) OVER ()) AS vs_avg\nFROM\n  results_stats\nWHERE\n  election = (\n    SELECT election\n    FROM results_stats\n    WHERE state = 'Sarawak'\n    AND election like 'SE%'\n    ORDER BY date DESC\n    LIMIT 1\n  )\nAND\n  state = 'Sarawak'\nORDER BY\n  voters_total DESC",
  },
  {
    group: "Candidates",
    question: "Who were the youngest MPs ever?",
    dataset: "results_ballots",
    sql: "SELECT\n  election,\n  date,\n  seat || ', ' || state AS seat,\n  name,\n  age,\n  party\nFROM results_ballots\nWHERE election LIKE 'GE%'\n  AND result LIKE 'won%'\n  AND age != -1\nORDER BY age ASC\nLIMIT 20",
  },
  {
    group: "Parties",
    question: "Which party had the worst male bias in GE-15?",
    dataset: "results_ballots",
    sql: "SELECT\n  party,\n  COUNT(*) AS total_candidates,\n  SUM(CASE WHEN sex = 'M' THEN 1 ELSE 0 END) AS male,\n  SUM(CASE WHEN sex = 'F' THEN 1 ELSE 0 END) AS female,\n  ROUND(100.0 * SUM(CASE WHEN sex = 'M' THEN 1 ELSE 0 END) / COUNT(*), 2) AS male_perc,\n  ROUND(100.0 * SUM(CASE WHEN sex = 'F' THEN 1 ELSE 0 END) / COUNT(*), 2) AS female_perc\nFROM results_ballots\nWHERE election = 'GE-15'\n  AND party != 'BEBAS'\nGROUP BY party\nHAVING COUNT(*) > 10\nORDER BY male_perc DESC",
  },
  {
    group: "Candidates",
    question: "Who has lost the most electoral contests?",
    dataset: "results_ballots",
    sql: "SELECT\n  r.candidate_uid,\n  r.name,\n  COUNT(*) AS total_losses,\n  (\n    SELECT COUNT(*)\n    FROM results_ballots\n    WHERE candidate_uid = r.candidate_uid\n      AND result LIKE 'won%'\n  ) AS total_wins,\n  (\n    SELECT party\n    FROM results_ballots\n    WHERE candidate_uid = r.candidate_uid\n    ORDER BY date ASC\n    LIMIT 1\n  ) AS first_party,\n  (\n    SELECT party\n    FROM results_ballots\n    WHERE candidate_uid = r.candidate_uid\n    ORDER BY date DESC\n    LIMIT 1\n  ) AS last_party\nFROM results_ballots r\nWHERE result NOT LIKE 'won%'\nGROUP BY r.candidate_uid, r.name\nORDER BY total_losses DESC\nLIMIT 10",
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
