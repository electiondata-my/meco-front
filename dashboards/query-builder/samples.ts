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
    dataset: "headline_stats",
    sql: "SELECT\n  date,\n  election,\n  state,\n  seat,\n  majority,\n  ROUND(majority_perc, 3) as majority_perc\nFROM\n  headline_stats\nWHERE\n  majority_perc IS NOT NULL -- excludes uncontested seats\nORDER BY\n  majority ASC\nLIMIT\n  10",
  },
  {
    group: "Seats",
    question: "Which Parliament seats are most malapportioned?",
    dataset: "headline_stats",
    sql: "SELECT\n  date,\n  election,\n  state,\n  seat,\n  voters_total AS total_voters,\n  PRINTF('%.2fx', voters_total / AVG(voters_total) OVER ()) AS vs_avg\nFROM\n  headline_stats\nWHERE\n  election = (\n    SELECT election\n    FROM headline_stats\n    WHERE election LIKE 'GE%'\n    ORDER BY date DESC -- latest general election by polling date\n    LIMIT 1\n  )\nORDER BY\n  voters_total DESC",
  },
  {
    group: "Candidates",
    question: "How has the % of female MPs changed over time?",
    dataset: "headline_ballots",
    sql: "SELECT\n  election,\n  COUNT(*) AS total_mps,\n  COUNT(*) FILTER (WHERE sex = 'F') AS women_mps,\n  ROUND(COUNT(*) FILTER (WHERE sex = 'F') * 100.0 / COUNT(*), 1) AS pct_female\nFROM headline_ballots\nWHERE election LIKE 'GE%'\n  AND result LIKE 'won%'\nGROUP BY election\nORDER BY election",
  },
  {
    group: "Parties",
    question: "Which party won seats by the highest majority (on average) in GE-15?",
    dataset: "headline_ballots",
    sql: "SELECT\n  ANY_VALUE(b.party) AS party,\n  ANY_VALUE(b.coalition) AS coalition,\n  COUNT(*) AS seats_won,\n  ROUND(AVG(s.majority_perc), 2) AS avg_majority,\n  ROUND(MAX(s.majority_perc), 2) AS highest_majority,\n  ROUND(MIN(s.majority_perc), 2) AS lowest_majority\nFROM headline_ballots b\nLEFT JOIN headline_stats s\n  ON b.date = s.date\n  AND b.election = s.election\n  AND b.state = s.state\n  AND b.seat = s.seat\nWHERE b.election = 'GE-15'\n  AND b.result LIKE 'won%'\n  AND s.majority_perc IS NOT NULL\nGROUP BY b.party_uid\nORDER BY avg_majority DESC",
  },
  {
    group: "Seats",
    question: "Which Sarawak DUN seats are most malapportioned?",
    dataset: "headline_stats",
    sql: "SELECT\n  date,\n  election,\n  state,\n  seat,\n  voters_total AS total_voters,\n  PRINTF('%.2fx', voters_total / AVG(voters_total) OVER ()) AS vs_avg\nFROM\n  headline_stats\nWHERE\n  election = (\n    SELECT election\n    FROM headline_stats\n    WHERE election LIKE 'SE%'\n      AND state = 'Sarawak'\n    ORDER BY date DESC -- latest Sarawak state election by polling date\n    LIMIT 1\n  )\n  AND state = 'Sarawak'\nORDER BY\n  voters_total DESC",
  },
  {
    group: "Candidates",
    question: "Who were the youngest MPs ever?",
    dataset: "headline_ballots",
    sql: "SELECT\n  election,\n  date,\n  seat || ', ' || state AS seat,\n  name,\n  age,\n  party\nFROM headline_ballots\nWHERE election LIKE 'GE%'\n  AND result LIKE 'won%'\n  AND age != -1\nORDER BY age ASC\nLIMIT 20",
  },
  {
    group: "Parties",
    question: "Which party had the worst male bias in GE-15?",
    dataset: "headline_ballots",
    sql: "SELECT\n  ANY_VALUE(party) AS party,\n  ANY_VALUE(coalition) AS coalition,\n  COUNT(*) AS total_candidates,\n  CAST(SUM(CASE WHEN sex = 'M' THEN 1 ELSE 0 END) AS INTEGER) AS male,\n  CAST(SUM(CASE WHEN sex = 'F' THEN 1 ELSE 0 END) AS INTEGER) AS female,\n  ROUND(100.0 * SUM(CASE WHEN sex = 'M' THEN 1 ELSE 0 END) / COUNT(*), 2) AS male_perc,\n  ROUND(100.0 * SUM(CASE WHEN sex = 'F' THEN 1 ELSE 0 END) / COUNT(*), 2) AS female_perc\nFROM headline_ballots\nWHERE election = 'GE-15'\n  AND party_uid != '000-BEBAS'\nGROUP BY party_uid\nHAVING COUNT(*) > 10\nORDER BY male_perc DESC",
  },
  {
    group: "Candidates",
    question: "Who has lost the most electoral contests?",
    dataset: "headline_ballots",
    sql: "SELECT\n  ANY_VALUE(r.name) AS candidate,\n  COUNT(*) AS total_losses,\n  (\n    SELECT COUNT(*)\n    FROM headline_ballots\n    WHERE candidate_uid = r.candidate_uid\n      AND result LIKE 'won%'\n  ) AS total_wins,\n  (\n    SELECT party\n    FROM headline_ballots\n    WHERE candidate_uid = r.candidate_uid\n    ORDER BY date ASC\n    LIMIT 1\n  ) AS first_party,\n  (\n    SELECT party\n    FROM headline_ballots\n    WHERE candidate_uid = r.candidate_uid\n    ORDER BY date DESC\n    LIMIT 1\n  ) AS last_party\nFROM headline_ballots r\nWHERE result NOT LIKE 'won%'\nGROUP BY r.candidate_uid\nORDER BY total_losses DESC\nLIMIT 20",
  },
];

export const SAMPLE_QUERIES: SampleQuery[] = [
  {
    name: "Preview ballots",
    description: "First 20 rows of the ballots dataset",
    dataset: "headline_ballots",
    sql: "SELECT *\nFROM headline_ballots\nLIMIT 20",
  },
  {
    name: "Preview stats",
    description: "First 20 rows of the seat stats dataset",
    dataset: "headline_stats",
    sql: "SELECT *\nFROM headline_stats\nLIMIT 20",
  },
  {
    name: "Preview saluran ballots",
    description: "First 20 rows of the saluran ballots dataset",
    dataset: "saluran_ballots",
    sql: "SELECT *\nFROM saluran_ballots\nLIMIT 20",
  },
  {
    name: "Preview saluran stats",
    description: "First 20 rows of the saluran stats dataset",
    dataset: "saluran_stats",
    sql: "SELECT *\nFROM saluran_stats\nLIMIT 20",
  },
  {
    name: "Preview voter demographics",
    description: "First 20 rows of the voter demographics dataset",
    dataset: "voter_demographics",
    sql: "SELECT *\nFROM voter_demographics\nLIMIT 20",
  },
  {
    name: "Preview GE-15 voter roll",
    description: "First 20 rows of the GE-15 voter roll dataset",
    dataset: "voter_roll_ge15",
    sql: "SELECT *\nFROM voter_roll_ge15\nLIMIT 20",
  },
];
