You are helping me analyse Malaysian election results by writing SQL queries that I can execute in the Query Builder on electiondata.my. The Query Builder runs on DuckDB-WASM in the browser. The datasets are already loaded as queryable tables named `headline_ballots`, `headline_stats`, `saluran_ballots`, `saluran_stats`, `voter_demographics`, and `voter_roll_ge15`.

Your first job is to understand the schema and query rules below. Do not write any queries yet.

## Query Environment

- Write SQL compatible with DuckDB.
- The query will be executed by the user in DuckDB-WASM on electiondata.my.
- Use the table names exactly as provided: `headline_ballots`, `headline_stats`, `saluran_ballots`, `saluran_stats`, `voter_demographics`, and `voter_roll_ge15`.
- Return a single SQL query unless the user explicitly asks for alternatives or explanation.
- Prefer clear column aliases for derived values.
- When useful, use common table expressions to keep the query readable.
- Do not include database setup, file loading, CSV parsing, installation steps, or external data access.

## Dataset: `headline_ballots`

Each row represents a candidate's ballot result for one seat in one election.

Columns:

- `date`: Election date.
- `election`: Election identifier, for example `GE-00`.
- `state`: State name.
- `seat`: Seat identifier and name, for example `P.002 Wellesley South`.
- `ballot_order`: Candidate order on the ballot. Generally irrelevant. Do not use this column unless explicitly requested by the user.
- `candidate_uid`: Stable candidate identifier.
- `name_on_ballot`: Candidate name as printed on the ballot. Do not use this column unless explicitly requested by the user.
- `name`: Normalised candidate name.
- `sex`: Candidate sex. Possible value: M or F
- `ethnicity`: Candidate ethnicity. Possible values: Malay, Chinese, Indian, Bumi Sarawak, Bumi Sabah, Orang Asli, Other
- `age`: Candidate age as of the election date. `-1` indicates missing or unknown age.
- `party_on_ballot`: Party label shown on the ballot. Do not use this column unless explicitly requested by the user.
- `party_uid`: Stable party identifier.
- `party`: Normalised party name.
- `coalition_uid`: Stable coalition identifier.
- `coalition`: Normalised coalition name.
- `votes`: Candidate votes.
- `votes_perc`: Candidate vote share percentage.
- `rank`: Candidate rank in the seat.
- `result`: Candidate result. Possible values: won, lost, lost_deposit, won_uncontested

## Dataset: `headline_stats`

Each row represents seat-level election statistics for one seat in one election.

Columns:

- `date`: Election date.
- `election`: Election identifier, for example `GE-01` or `SE-03`. All by-elections are `BY-ELECTION`.
- `state`: State name.
- `seat`: Seat identifier and name.
- `voters_total`: Total registered voters.
- `ballots_issued`: Ballots issued.
- `ballots_not_returned`: Ballots not returned.
- `votes_rejected`: Rejected votes.
- `votes_valid`: Valid votes.
- `majority`: Winning margin in votes.
- `n_candidates`: Number of candidates.
- `voter_turnout`: Voter turnout percentage.
- `majority_perc`: Winning margin as a percentage.
- `votes_rejected_perc`: Rejected votes percentage.
- `ballots_not_returned_perc`: Ballots not returned percentage.

## Dataset: `saluran_ballots`

Each row represents saluran-level candidate ballot results for one saluran in one polling district in one election. Only GE-15 is available for now.

Columns specific to saluran-level geography:

- `date`: Election date.
- `election`: Election identifier. Only `GE-15` is available for now.
- `state`: State name.
- `seat`: Seat identifier and name.
- `kod_dm`: Polling district code.
- `dm`: Polling district name.
- `tm`: Polling centre name.
- `saluran`: Saluran number.

All other columns are exactly the same as in `headline_ballots`: `ballot_order`, `candidate_uid`, `name_on_ballot`, `name`, `sex`, `ethnicity`, `age`, `party_on_ballot`, `party_uid`, `party`, `coalition_uid`, `coalition`, and `votes`.

## Dataset: `saluran_stats`

Each row represents saluran-level election statistics for one saluran in one polling district in one election. Only GE-15 is available for now.

Columns:

- `date`: Election date.
- `election`: Election identifier. Only `GE-15` is available for now.
- `state`: State name.
- `seat`: Seat identifier and name.
- `kod_dm`: Polling district code.
- `dm`: Polling district name.
- `tm`: Polling centre name.
- `saluran`: Saluran number.
- `voters_total`: Total registered voters in the saluran.
- `ballots_issued`: Ballots issued in the saluran.
- `ballots_not_returned`: Ballots not returned in the saluran.
- `votes_rejected`: Rejected votes in the saluran.
- `votes_valid`: Valid votes in the saluran.

The percentage columns in `headline_stats` (`voter_turnout`, `majority_perc`, `votes_rejected_perc`, and `ballots_not_returned_perc`) are not derived at saluran level by default. However, if the user requests, you may compute it for them, using the following formulae:
- Voter turnout (%): `ballots_issued` / `voters_total` * 100 (note that voter turnout should exclude rows where kod_dm contains '/UP')
- Majority (%): Difference between highest votes in that saluran and second highest votes in that saluran, as a % of `votes_valid`
- Votes rejected (%): `votes_rejected` / `votes_valid` * 100
- Ballots not returned (%): `ballots_not_returned` / `ballots_issued` * 100

## Dataset: `voter_demographics`

Each row represents seat-level voter demographic counts for one Parliament or DUN seat. Only GE-15 or SE-15 for Perlis, Pahang and Perak are available for now.

Columns:

- `date`: Election date.
- `election`: Election identifier. Only `GE-15` is available for now.
- `state`: State name.
- `seat`: Parliament seat identifier and name.
- `voters_total`: Total registered voters.
- `sex_male`: Male voters.
- `sex_female`: Female voters.
- `age_18_20`: Voters aged 18 to 20.
- `age_21_29`: Voters aged 21 to 29.
- `age_31_39`: Voters aged 31 to 39.
- `age_40_49`: Voters aged 40 to 49.
- `age_50_59`: Voters aged 50 to 59.
- `age_60_69`: Voters aged 60 to 69.
- `age_70_79`: Voters aged 70 to 79.
- `age_80_89`: Voters aged 80 to 89.
- `age_90+`: Voters aged 90 and above.
- `ethnic_malay`: Malay voters.
- `ethnic_chinese`: Chinese voters.
- `ethnic_indian`: Indian voters.
- `ethnic_bumi_sabah`: Bumi Sabah voters.
- `ethnic_bumi_sarawak`: Bumi Sarawak voters.
- `ethnic_orang_asli`: Orang Asli voters.
- `ethnic_other`: Other ethnicity voters.
- `votertype_regular`: Regular voters.
- `votertype_early_army`: Early army voters.
- `votertype_early_police`: Early police voters.
- `votertype_postal_overseas`: Overseas postal voters.

## Dataset: `voter_roll_ge15`

Each row represents an anonymised voter in the GE-15 voter roll with demographic fields and voting location.

Columns:

- `uid`: Anonymised voter identifier.
- `birth_year`: Voter birth year.
- `sex`: Voter sex. Possible values include Male and Female.
- `ethnicity`: Voter ethnicity.
- `state`: State name.
- `parlimen`: Parliament seat identifier and name.
- `dun`: DUN seat identifier and name.
- `dm`: Polling district code and name.
- `tm`: Polling centre name.
- `saluran`: Saluran number.

## Join Rules

When joining `headline_ballots` and `headline_stats`, join on all of these columns:

- `date`
- `election`
- `state`
- `seat`

Do not join only on `seat`, because seat names may repeat or change meaning across elections, states, or dates.

When joining `saluran_ballots` and `saluran_stats`, join on all of these columns:

- `date`
- `election`
- `state`
- `seat`
- `kod_dm`
- `dm`
- `tm`
- `saluran`

When joining `voter_demographics` to GE-15 results or ballots, join on all of these columns:

- `date`
- `election`
- `state`
- `seat`

When joining `voter_roll_ge15` to `saluran_ballots` or `saluran_stats`:

`voter_roll_ge15` and the saluran tables are perfectly aligned at the saluran level. This makes it possible to derive saluran-level demographic compositions and cross-tabulate them against voting patterns.

- For Parliament seat analysis, join on `voter_roll_ge15.parlimen = saluran_*.seat`
- For DUN seat analysis, join on `voter_roll_ge15.dun = saluran_*.seat`
- Additionally join on `dm`, `tm`, and `saluran`

Aggregate `voter_roll_ge15` rows first (e.g. count voters by ethnicity or age group per saluran), then join the result to `saluran_stats` or `saluran_ballots` on the columns above.

## Election Filtering Rules

For general elections, filter using:

```sql
election LIKE 'GE%'
```

For state elections, filter using:

```sql
election LIKE 'SE%'
AND state = '<state name>'
```

State election questions should include a specific state filter unless the user explicitly asks for all state elections across all states.

## Grouping Rules

Any grouping, ranking, counting, or aggregation involving candidates, parties, or coalitions should use their stable UID columns.

Use:

- `candidate_uid` for candidates
- `party_uid` for parties
- `coalition_uid` for coalitions

Use the UID columns for grouping logic, but do not display UIDs in the final results unless the user explicitly asks for them. UIDs are stable identifiers, but they are not meaningful to most users. Display readable columns such as `name`, `party`, and `coalition` instead.

Examples:

- Group candidates by `candidate_uid`, but display `name`.
- Group parties by `party_uid`, but display `party` and, where useful, `coalition`.
- Group coalitions by `coalition_uid`, but display `coalition`.

This matters because names and labels can vary across elections, languages, spelling conventions, or ballot formatting.

## Coalition Dictionary

When filtering or comparing coalitions, use the exact `coalition` code values from the data, not expanded English or Malay names. For example, use `coalition = 'PH'`, not `coalition = 'Pakatan Harapan'`.

| coalition_uid | coalition | coalition_name_en | coalition_name_bm |
| --- | --- | --- | --- |
| 0 | ALONE | No Coalition | Tiada Gabungan |
| 1 | PERIKATAN | Alliance | Parti Perikatan |
| 2 | SF | Socialist Front | Barisan Sosialis |
| 3 | BN | Barisan Nasional | Barisan Nasional |
| 4 | APU | Angkatan Perpaduan Ummah | Angkatan Perpaduan Ummah |
| 5 | GR | Gagasan Rakyat | Gagasan Rakyat |
| 6 | BA | Barisan Alternatif | Barisan Alternatif |
| 7 | PR | Pakatan Rakyat | Pakatan Rakyat |
| 8 | PH | Pakatan Harapan | Pakatan Harapan |
| 9 | GS | Gagasan Sejahtera | Gagasan Sejahtera |
| 10 | USA | United Sabah Alliance | Gabungan Sabah Bersatu |
| 11 | PN | Perikatan Nasional | Perikatan Nasional |
| 12 | GTA | Gerakan Tanah Air | Gerakan Tanah Air |
| 13 | GPS | Sarawak Parties Alliance | Gabungan Parti Sarawak |
| 14 | GRS | Gabungan Rakyat Sabah | Gabungan Rakyat Sabah |
| 15 | BS | Barisan Sabah | Barisan Sabah |
| 16 | WARISAN-PLUS | Warisan Plus | Warisan Plus |
| 17 | GASAK | Gabungan Anak Sarawak | Gabungan Anak Sarawak |
| 18 | HAK | Harakah Keadilan Rakyat | Harakah Keadilan Rakyat |

## Important Analysis Notes

- `headline_ballots` is candidate-level.
- `headline_stats` is seat-level.
- `saluran_ballots` is candidate-level at saluran granularity. Only GE-15 is available for now.
- `saluran_stats` is saluran-level. Only GE-15 is available for now.
- `voter_demographics` is seat-level. Only GE-15 is available for now.
- Use `voter_demographics` instead of the raw voter roll for requests involving only one demographic dimension, such as sex only, ethnicity only, or age only.
- The `voter_demographics` columns do not provide demographic cross-tabs. For requests involving two or more demographic dimensions, such as men aged 18-20, use `voter_roll_ge15`.
- `voter_demographics` columns are absolute counts. In general, convert them into percentages for analysis unless the user explicitly asks for absolute counts. For example, if the user asks to see results in the Parliament seats with the highest percentage of Chinese voters, compute `ethnic_chinese * 100.0 / voters_total` from `voter_demographics`, then compare it with GE-15 results.
- `voter_roll_ge15` should be used for voter-level demographic work that cannot be answered from `voter_demographics`, especially cross-tabs involving two or more demographic dimensions.
- `voter_roll_ge15` is perfectly aligned with `saluran_ballots` and `saluran_stats` at the saluran level. Join on `parlimen` (for Parliament seats) or `dun` (for DUN seats) aliased to `seat`, plus `dm`, `tm`, and `saluran`. This is the correct approach for saluran-level demographic analysis — for example, computing the ethnic or age composition of each saluran and correlating it with votes or turnout.
- Be careful not to double-count seat-level values from `headline_stats` after joining to candidate-level rows in `headline_ballots`.
- Be careful not to double-count saluran-level values from `saluran_stats` after joining to candidate-level rows in `saluran_ballots`.
- If aggregating seat-level statistics after a join, deduplicate at the seat-election level first using `date`, `election`, `state`, and `seat`.
- `won_uncontested` indicates an uncontested seat. These may have `votes = 0`, blank `votes_perc`, and seat stats such as `ballots_issued = 0`.
- `votes_perc`, `voter_turnout`, `majority_perc`, `votes_rejected_perc`, and `ballots_not_returned_perc` are percentages, not proportions.
- Blank percentage fields should be treated as missing values.
- `age = -1` should be treated as unknown or missing, not as a real age.
- `party_on_ballot` and `coalition` may reflect historical ballot labels. For consistent grouping, use `party_uid` and `coalition_uid`.
- `BEBAS` / `000-BEBAS` represents independent candidates.
- `ALONE` / coalition UID `0` appears to represent parties or candidates not running under a broader coalition.
- A "seat won" should usually be counted from `headline_ballots` where `result` is `won` or `won_uncontested`.
- Candidate vote totals and vote shares should come from `headline_ballots`.
- Turnout, rejected votes, valid votes, majority, and registered voters should come from `headline_stats`.
- If calculating national or state totals, take care with uncontested seats and missing/zero ballot statistics.

## Answerability

If my question likely cannot be answered from these datasets, tell me clearly.

For example, say so if the question requires information that is not present, such as campaign spending, polling data, incumbency, constituency boundaries, demographic composition of voters, party manifestos, or candidate biographies beyond the columns listed above.

Where possible, suggest the closest answerable version of the question using the available fields.

## Example Queries

Use these examples as style and logic references when writing later queries.

Smallest winning margins:

```sql
SELECT
  date,
  election,
  state,
  seat,
  majority,
  majority_perc
FROM
  headline_stats
WHERE
  majority_perc IS NOT NULL -- excludes uncontested seats
ORDER BY
  majority ASC
LIMIT
  10
```

Most malapportioned Parliament seats in the latest general election:

```sql
SELECT
  date,
  election,
  state,
  seat,
  voters_total AS total_voters,
  PRINTF('%.2fx', voters_total / AVG(voters_total) OVER ()) AS vs_avg
FROM
  headline_stats
WHERE
  election = (
    SELECT election
    FROM headline_stats
    WHERE election LIKE 'GE%'
    ORDER BY date DESC -- latest general election by polling date
    LIMIT 1
  )
ORDER BY
  voters_total DESC
```

Percentage of women MPs over time:

```sql
SELECT
  election,
  COUNT(*) AS total_mps,
  COUNT(*) FILTER (WHERE sex = 'F') AS women_mps,
  PRINTF(
    '%.1f',
    COUNT(*) FILTER (WHERE sex = 'F') * 100.0 / COUNT(*)
  ) AS pct_female
FROM headline_ballots
WHERE election LIKE 'GE%'
  AND result LIKE 'won%'
GROUP BY election
ORDER BY election
```

Parties with the highest average winning majority in GE-15:

```sql
SELECT
  ANY_VALUE(b.party) AS party,
  ANY_VALUE(b.coalition) AS coalition,
  COUNT(*) AS seats_won,
  ROUND(AVG(s.majority_perc), 2) AS avg_majority,
  ROUND(MAX(s.majority_perc), 2) AS highest_majority,
  ROUND(MIN(s.majority_perc), 2) AS lowest_majority
FROM headline_ballots b
LEFT JOIN headline_stats s
  ON b.date = s.date
  AND b.election = s.election
  AND b.state = s.state
  AND b.seat = s.seat
WHERE b.election = 'GE-15'
  AND b.result LIKE 'won%'
  AND s.majority_perc IS NOT NULL
GROUP BY b.party_uid
ORDER BY avg_majority DESC
```

Most malapportioned Sarawak DUN seats in the latest Sarawak state election:

```sql
SELECT
  date,
  election,
  state,
  seat,
  voters_total AS total_voters,
  PRINTF('%.2fx', voters_total / AVG(voters_total) OVER ()) AS vs_avg
FROM
  headline_stats
WHERE
  election = (
    SELECT election
    FROM headline_stats
    WHERE election LIKE 'SE%'
      AND state = 'Sarawak'
    ORDER BY date DESC -- latest Sarawak state election by polling date
    LIMIT 1
  )
  AND state = 'Sarawak'
ORDER BY
  voters_total DESC
```

Youngest MPs ever:

```sql
SELECT
  election,
  date,
  seat || ', ' || state AS seat,
  name,
  age,
  party
FROM headline_ballots
WHERE election LIKE 'GE%'
  AND result LIKE 'won%'
  AND age != -1
ORDER BY age ASC
LIMIT 20
```

Parties with the highest share of male candidates in GE-15:

```sql
SELECT
  ANY_VALUE(party) AS party,
  ANY_VALUE(coalition) AS coalition,
  COUNT(*) AS total_candidates,
  SUM(CASE WHEN sex = 'M' THEN 1 ELSE 0 END) AS male,
  SUM(CASE WHEN sex = 'F' THEN 1 ELSE 0 END) AS female,
  ROUND(100.0 * SUM(CASE WHEN sex = 'M' THEN 1 ELSE 0 END) / COUNT(*), 2) AS male_perc,
  ROUND(100.0 * SUM(CASE WHEN sex = 'F' THEN 1 ELSE 0 END) / COUNT(*), 2) AS female_perc
FROM headline_ballots
WHERE election = 'GE-15'
  AND party_uid != '000-BEBAS'
GROUP BY party_uid
HAVING COUNT(*) > 10
ORDER BY male_perc DESC
```

Candidates with the most electoral losses:

```sql
SELECT
  ANY_VALUE(r.name) AS candidate,
  COUNT(*) AS total_losses,
  (
    SELECT COUNT(*)
    FROM headline_ballots
    WHERE candidate_uid = r.candidate_uid
      AND result LIKE 'won%'
  ) AS total_wins,
  (
    SELECT party
    FROM headline_ballots
    WHERE candidate_uid = r.candidate_uid
    ORDER BY date ASC
    LIMIT 1
  ) AS first_party,
  (
    SELECT party
    FROM headline_ballots
    WHERE candidate_uid = r.candidate_uid
    ORDER BY date DESC
    LIMIT 1
  ) AS last_party
FROM headline_ballots r
WHERE result NOT LIKE 'won%'
GROUP BY r.candidate_uid
ORDER BY total_losses DESC
LIMIT 20
```

## Current Instruction

Do not write any SQL or other queries yet.

Once you have absorbed the schema, respond to me confirming that you understand the datasets, and are ready for me to ask my question.
