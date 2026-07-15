You are helping me analyse Malaysian election results by writing SQL queries that I can execute in the Query Builder on electiondata.my. The Query Builder runs on DuckDB-WASM in the browser. The following datasets are available as queryable table names:

- `headline_ballots` — candidate-level results. Fully exhaustive: every Parliament and DUN contest ever held in Malaysia, including general elections (GE-01 through GE-15), all state elections, and all by-elections. This includes the 2026 Johor state election (SE-16, held 11 July 2026): its aggregate (seat-level) results are already fully in. Note that saluran-level data for SE-16 is not yet available.
- `headline_stats` — seat-level statistics. Same exhaustive coverage as `headline_ballots`.
- `voter_demographics` — seat-level voter demographics (sex, age, ethnicity) using nationwide ethnic groupings. Covers all seats for GE-13 (2013), GE-14 (2018), and GE-15 (2022), as well as Johor-specific seats (both Parliament and DUN) for SE-15 (2022) and SE-16 (2026), and Negeri Sembilan seats for SE-16 (2026). Demographics for Johor SE-16 (held 11 July 2026) and Negeri Sembilan SE-16 (to be held 1 August 2026) are both fully available.
- `voter_demographics_sarawak` — Sarawak seats only, with Sarawak-specific ethnic breakdowns. Covers GE-13, GE-14, and GE-15.
- `voter_demographics_sabah` — Sabah seats only, with Sabah-specific ethnic breakdowns. Covers GE-13, GE-14, and GE-15.
- `saluran_ballots_ge15` / `saluran_stats_ge15` / `voter_roll_ge15` — GE-15 (19 November 2022)
- `saluran_ballots_ge14` / `saluran_stats_ge14` / `voter_roll_ge14` — GE-14 (9 May 2018)
- `saluran_ballots_ge13` / `saluran_stats_ge13` / `voter_roll_ge13` — GE-13 (5 May 2013)
- `saluran_ballots_nsn_se15` / `saluran_stats_nsn_se15` / `voter_roll_nsn_se15` — Negeri Sembilan state election SE-15 (2023)
- `saluran_ballots_jhr_se15` / `saluran_stats_jhr_se15` / `voter_roll_jhr_se15` — Johor state election SE-15 (2022)
- `voter_roll_ge12` — GE-12 (8 March 2008). Voter roll only — there is no `saluran_ballots_ge12` or `saluran_stats_ge12`.
- `voter_roll_jhr_se16` — Johor state election SE-16 (2026). Voter roll only — there is no `saluran_ballots_jhr_se16` or `saluran_stats_jhr_se16`.

These 5 elections are the only ones with both saluran-level data and voter rolls available: GE-15, GE-14, GE-13, N9 SE-15, JHR SE-15. `voter_roll_ge12` and `voter_roll_jhr_se16` add 2 more elections with voter rolls only (no saluran-level data). All `saluran_ballots_*` variants share the same schema; same for `saluran_stats_*`, and all `voter_roll_*` variants (all 7 elections) share the same schema.

Your first job is to understand the schema and query rules below. Do not write any queries yet.

## Query Environment

- Write SQL compatible with DuckDB.
- The query will be executed by the user in DuckDB-WASM on electiondata.my.
- Use the table names exactly as provided above.
- Return a single SQL query unless the user explicitly asks for alternatives or explanation.
- Prefer clear column aliases for derived values.
- When useful, use common table expressions to keep the query readable.
- Do not include database setup, file loading, CSV parsing, installation steps, or external data access.
- Any query that reads from a `voter_roll_*` table — whether directly or via a subquery or CTE — must include `LIMIT 10000` at the outermost query level. The site will reject voter roll queries without this limit.

## Dataset: `headline_ballots`

Each row represents a candidate's ballot result for one seat in one election. Coverage is fully exhaustive: every Parliament and DUN contest ever held in Malaysia — GE-01 through GE-15, all state elections, and all by-elections.

Columns:

- `date`: Election date.
- `election`: Election identifier, for example `GE-00`.
- `state`: State name.
- `seat`: Seat identifier and name, for example `P.002 Wellesley South`. Parliament seats always begin with `P.` followed by a three-digit number (e.g. `P.001`). DUN seats use state-specific prefixes (e.g. `N.01`, `B.01`, `Q.01`). To filter Parliament-only data use `seat LIKE 'P.%'`; to filter DUN-only data use `seat NOT LIKE 'P.%'`.
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

Each row represents seat-level election statistics for one seat in one election. Same exhaustive coverage as `headline_ballots`.

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
- `voter_turnout`: Voter turnout as a percentage of registered voters (`ballots_issued / voters_total * 100`).
- `majority_perc`: Winning margin as a percentage of valid votes (`majority / votes_valid * 100`).
- `votes_rejected_perc`: Rejected votes as a percentage of valid votes (`votes_rejected / votes_valid * 100`).
- `ballots_not_returned_perc`: Ballots not returned as a percentage of ballots issued.

## Dataset: `saluran_ballots_*`

Each row represents saluran-level candidate ballot results for one saluran in one polling district in one election. Available for 5 elections: GE-15, GE-14, GE-13, N9 SE-15, and JHR SE-15. All variants share this schema.

Geography columns:

- `date`: Election date.
- `election`: Election identifier (e.g. `GE-15`, `SE-15`). Note: both `saluran_ballots_nsn_se15` and `saluran_ballots_jhr_se15` have `election = 'SE-15'`; they are distinguished only by `state`. Always pair a state election table with a `state` filter.
- `state`: State name.
- `seat`: Seat identifier and name. Uses the same `P.` / non-`P.` convention as `headline_ballots`. For GE tables, `seat` is a Parliament seat; for SE tables, `seat` is a DUN seat.
- `dm`: Polling district code and name combined in a single string, for example `015/28/18 Taman Keladi`. The code portion follows the format `XXX/YY/ZZ`. Rows where `dm` contains `/UP` are postal votes.
- `pm`: Polling centre name, for example `Sekolah Menengah Sin Min (P), Sungai Petani`.
- `saluran`: Saluran number.

All other columns are exactly the same as in `headline_ballots`: `ballot_order`, `candidate_uid`, `name_on_ballot`, `name`, `sex`, `ethnicity`, `age`, `party_on_ballot`, `party_uid`, `party`, `coalition_uid`, `coalition`, `votes`, and `votes_perc`.

Note: `rank` and `result` are not available at saluran level.

## Dataset: `saluran_stats_*`

Each row represents saluran-level election statistics for one saluran in one polling district in one election. Available for the same 5 elections as `saluran_ballots_*`. All variants share this schema.

Columns:

- `date`: Election date.
- `election`: Election identifier.
- `state`: State name.
- `seat`: Seat identifier and name.
- `dm`: Polling district code and name combined (same format as `saluran_ballots_*`). Rows where `dm` contains `/UP` are postal votes.
- `pm`: Polling centre name.
- `saluran`: Saluran number.
- `voters_total`: Total registered voters in the saluran.
- `ballots_issued`: Ballots issued in the saluran.
- `ballots_not_returned`: Ballots not returned in the saluran.
- `votes_rejected`: Rejected votes in the saluran.
- `votes_valid`: Valid votes in the saluran.
- `voter_turnout`: Voter turnout percentage. Exclude rows where `dm` contains `/UP` (postal votes) when aggregating turnout.
- `votes_rejected_perc`: Rejected votes as a percentage of valid votes.
- `ballots_not_returned_perc`: Ballots not returned as a percentage of ballots issued.

## Dataset: `voter_demographics`

Each row represents seat-level voter demographic counts for one Parliament or DUN seat. Covers all seats for GE-13 (2013), GE-14 (2018), and GE-15 (2022), plus Johor seats for SE-15 (2022) and SE-16 (2026), and Negeri Sembilan seats for SE-16 (2026). Johor SE-16 (held 11 July 2026) and Negeri Sembilan SE-16 (to be held 1 August 2026) demographics are fully available. No other elections are available in this dataset.

Columns:

- `date`: Election date.
- `election`: Election identifier.
- `state`: State name.
- `seat`: Parliament or DUN seat identifier and name.
- `voters_total`: Total registered voters.
- `sex_male`: Male voters.
- `sex_female`: Female voters.
- `age_18_20`: Voters aged 18 to 20.
- `age_21_29`: Voters aged 21 to 29.
- `age_30_39`: Voters aged 30 to 39.
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
- `votertype_early`: Early voters (army and police combined).
- `votertype_postal_overseas`: Overseas postal voters.

## Dataset: `voter_demographics_sarawak`

Each row represents seat-level voter demographic counts for one Sarawak Parliament or DUN seat. Covers GE-13, GE-14, and GE-15 for Sarawak seats only. Uses Sarawak-specific ethnic breakdowns instead of nationwide groupings.

Columns: `date`, `election`, `state`, `seat`, `voters_total`, `sex_male`, `sex_female`, all `age_*` columns (same as `voter_demographics`), `votertype_regular`, `votertype_early`, `votertype_postal_overseas`, plus:

- `ethnic_malay_melanau`: Malay and Melanau voters combined.
- `ethnic_chinese`: Chinese voters.
- `ethnic_iban`: Iban voters.
- `ethnic_bidayuh`: Bidayuh voters.
- `ethnic_orang_ulu`: Orang Ulu voters.
- `ethnic_kedayan`: Kedayan voters.
- `ethnic_other_bumi_sarawak`: Other Sarawak Bumiputera voters.
- `ethnic_other`: Other ethnicity voters.

## Dataset: `voter_demographics_sabah`

Each row represents seat-level voter demographic counts for one Sabah Parliament or DUN seat. Covers GE-13, GE-14, and GE-15 for Sabah seats only. Uses Sabah-specific ethnic breakdowns instead of nationwide groupings.

Columns: `date`, `election`, `state`, `seat`, `voters_total`, `sex_male`, `sex_female`, all `age_*` columns (same as `voter_demographics`), `votertype_regular`, `votertype_early`, `votertype_postal_overseas`, plus:

- `ethnic_malay`: Malay voters.
- `ethnic_chinese`: Chinese voters.
- `ethnic_kadazan_dusun`: Kadazan-Dusun voters.
- `ethnic_bajau`: Bajau voters.
- `ethnic_murut`: Murut voters.
- `ethnic_brunei`: Brunei voters.
- `ethnic_sungai`: Sungai voters.
- `ethnic_other_bumi_sabah`: Other Sabah Bumiputera voters.
- `ethnic_other`: Other ethnicity voters.

## Dataset: `voter_roll_*`

Each row represents an anonymised voter in the voter roll with demographic fields and voting location. Available for 7 elections: GE-15, GE-14, GE-13, GE-12, N9 SE-15, JHR SE-15, and JHR SE-16. All variants share this schema. Note: `voter_roll_ge12` and `voter_roll_jhr_se16` have no corresponding `saluran_ballots_*` or `saluran_stats_*` tables, so they cannot be joined to saluran-level data — use them standalone.

Columns:

- `uid`: Anonymised voter identifier.
- `birth_year`: Voter birth year. There is no `age` column — compute voter age as `YEAR(CAST(date AS DATE)) - birth_year` when joining to election data, or against a fixed reference year when working with the voter roll alone.
- `sex`: Voter sex. Possible values: `Male`, `Female` (note: unlike candidates which use `M`/`F`, voter roll uses full words).
- `ethnicity`: Voter ethnicity.
- `state`: State name.
- `parlimen`: Parliament seat identifier and name.
- `dun`: DUN seat identifier and name.
- `dm_vr`: Voter's residential polling district code and name (e.g. `001/01/05 Padang Besar`). This is where the voter is registered to live.
- `dm`: Voter's actual voting district code and name (e.g. `001/01/00 Undi Awal`). For early and postal voters this differs from `dm_vr`. This column matches the `dm` column in `saluran_ballots_*` and `saluran_stats_*`.
- `pm`: Polling centre name. Matches the `pm` column in `saluran_ballots_*` and `saluran_stats_*`.
- `saluran`: Saluran number.

## Join Rules

When joining `headline_ballots` and `headline_stats`, join on all of these columns:

- `date`
- `election`
- `state`
- `seat`

Do not join only on `seat`, because seat names may repeat or change meaning across elections, states, or dates.

When joining `saluran_ballots_*` and `saluran_stats_*`, join on all of these columns:

- `date`
- `election`
- `state`
- `seat`
- `dm`
- `pm`
- `saluran`

When joining `voter_demographics` to results or ballots, join on all of these columns:

- `date`
- `election`
- `state`
- `seat`

When joining `voter_roll_*` to `saluran_ballots_*` or `saluran_stats_*`:

`voter_roll_*` and the saluran tables are perfectly aligned at the saluran level. The join key is always `dm`, `pm`, and `saluran` — these three columns together uniquely identify a saluran and match exactly between the voter roll and saluran tables. No additional seat column is needed for the join itself. This join is not available for `voter_roll_ge12` or `voter_roll_jhr_se16`, since there are no corresponding `saluran_ballots_*` or `saluran_stats_*` tables for GE-12 or JHR SE-16.

- To scope the join to a Parliament seat: also filter on `voter_roll_*.parlimen = saluran_*.seat`
- To scope the join to a DUN seat: also filter on `voter_roll_*.dun = saluran_*.seat`

Aggregate `voter_roll_*` rows first (e.g. count voters by ethnicity or age group per saluran), then join the aggregated result to `saluran_stats_*` or `saluran_ballots_*` on `dm`, `pm`, and `saluran`.

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

To exclude by-elections from `headline_ballots` or `headline_stats`, filter using:

```sql
election != 'BY-ELECTION'
```

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

When grouping coalitions, use `coalition_uid` (a string such as `'007-PH'`). Note that successor coalitions share the same numeric prefix: `001-PERIKATAN` and `001-BN` are both the ruling Alliance lineage; `007-BA`, `007-PR`, and `007-PH` are all the opposition coalition lineage.

| coalition_uid | coalition | coalition_name_en | year_start | year_end |
| --- | --- | --- | --- | --- |
| 000-ALONE | ALONE | No Coalition | — | — |
| 001-PERIKATAN | PERIKATAN | Alliance | 1955 | 1974 |
| 001-BN | BN | Barisan Nasional | 1974 | — |
| 002-SF | SF | Socialist Front | 1959 | 1969 |
| 003-BS | BS | Barisan Sabah | 1981 | 1981 |
| 004-HAK | HAK | Harakah Keadilan Rakyat | 1986 | 1990 |
| 005-APU | APU | Angkatan Perpaduan Ummah | 1990 | 1995 |
| 006-GR | GR | Gagasan Rakyat | 1990 | 1995 |
| 007-BA | BA | Barisan Alternatif | 1999 | 2004 |
| 007-PR | PR | Pakatan Rakyat | 2008 | 2015 |
| 007-PH | PH | Pakatan Harapan | 2015 | — |
| 008-GS | GS | Gagasan Sejahtera | 2015 | 2018 |
| 009-GPS | GPS | Gabungan Parti Sarawak | 2018 | — |
| 010-USA | USA | United Sabah Alliance | 2018 | 2019 |
| 011-PN | PN | Perikatan Nasional | 2020 | — |
| 012-GRS | GRS | Gabungan Rakyat Sabah | 2020 | — |
| 013-WARISAN-PLUS | WARISAN-PLUS | Warisan Plus | 2020 | 2020 |
| 014-GASAK | GASAK | Gabungan Anak Sarawak | 2021 | 2021 |
| 015-GTA | GTA | Gerakan Tanah Air | 2022 | 2022 |

## Party Dictionary

When filtering or comparing parties, use the exact `party` code from the data (e.g. `party = 'DAP'`). When grouping parties across elections, use `party_uid` for stability — some parties have changed abbreviations under the same UID (e.g. `009-PR` → `009-PSRM` → `009-PRM`).

| party_uid | party | party_name_en |
| --- | --- | --- |
| 000-BEBAS | BEBAS | Independent |
| 001-UMNO | UMNO | United Malays National Organisation |
| 002-MIC | MIC | Malaysian Indian Congress |
| 003-MCA | MCA | Malaysian Chinese Association |
| 004-PAS | PAS | Pan-Malaysian Islamic Party |
| 005-LPM | LPM | Labour Party of Malaya |
| 006-PPP | PPP | People's Progressive Party |
| 006-MYPPP | MYPPP | People's Progressive Party (rebranded) |
| 007-NAP | NAP | National Association of Perak |
| 008-NEG | NEG | National Party |
| 009-PR | PR | Malayan People's Party |
| 009-PSRM | PSRM | Malaysian People's Socialist Party |
| 009-PRM | PRM | Malaysian People's Party |
| 010-PML | PML | Perak Malay League |
| 011-MP | MP | Malaya Party |
| 012-MCC | MCC | Malaysian Ceylonese Congress |
| 013-SUPP | SUPP | Sarawak United Peoples' Party |
| 014-USNO | USNO | United Sabah National Organisation |
| 015-SNAP | SNAP | Sarawak National Party |
| 016-UDP | UDP | United Democratic Party |
| 017-SCA-SBH | SCA | Sabah Chinese Association |
| 018-PESAKA | PESAKA | Pesaka Sarawak |
| 019-SCA-SWK | SCA | Sarawak Chinese Association |
| 020-NCP | NCP | National Convention Party |
| 021-PETIR | PETIR | People's Action Party |
| 021-DAP | DAP | Democratic Action Party |
| 022-UPKO | UPKO | United Pasokmomogun Kadazan Organisation |
| 025-PCMB | PCMB | United Malaysia Chinese Organisation |
| 026-GERAKAN | GERAKAN | Malaysian People's Movement Party |
| 027-PBRS-SWK | PBRS | Sarawak Bumiputera People's Party |
| 028-PEKEMAS | PEKEMAS | Malaysian Social Justice Party |
| 029-PBB | PBB | Parti Pesaka Bumiputera Bersatu Sarawak |
| 030-PNRS | PNRS | Sarawak People's National Party |
| 031-KITA | KITA | Homeland Revival Movement |
| 032-IPPP | IPPP | Independent People's Progressive Party |
| 033-UPP | UPP | United People's Party |
| 034-BERJAYA | BERJAYA | Sabah People's United Front |
| 035-KIMMA | KIMMA | Malaysian Indian Muslim Congress |
| 036-BERJASA | BERJASA | Malaysian Islamic Justice Party |
| 037-PUSAKA | PUSAKA | United Social Gathering Party |
| 038-UMAT | UMAT | Sarawak People's Party |
| 039-SEDAR | SEDAR | Homeland Consciousness Union |
| 040-SAPO | SAPO | Sarawak People's Organisation |
| 041-PAJAR | PAJAR | Sarawak Natives Party |
| 042-PASOK | PASOK | United Pasok Nunukragang National Organisation |
| 043-SUDP | SUDP | United Democratic Sarawak Party |
| 044-SDP | SDP | Social Democratic Party |
| 045-USPO | USPO | United Sabah People's Organisation |
| 046-PPPM | PPPM | Malaysian Workers' Party |
| 046-AMANAH | AMANAH | National Trust Party |
| 047-SCCP | SCCP | Sabah Chinese Consolidated Party |
| 048-HAMIM | HAMIM | Malaysian Muslim People's Party |
| 049-PBDS | PBDS | Parti Bansa Dayak Sarawak |
| 049-PBDSB | PBDSB | New Sarawak Dayak People's Party |
| 050-PLUS | PLUS | Sarawak United Labour Party |
| 051-BERSEPADU | BERSEPADU | Sabah United Native People's Party |
| 052-BERSIH | BERSIH | United Sabah People's Action Party |
| 053-MOMOGUN | MOMOGUN | Parti Momogun Kebangsaan Sabah |
| 054-PBS | PBS | Parti Bersatu Sabah |
| 055-NASMA | NASMA | Malaysian Nationalist Party |
| 056-PPM | PPM | Malaysian Punjabi Party |
| 057-PCS | PCS | Sabah Chinese Party |
| 058-PERMAS | PERMAS | Sarawak Malaysian People's Association |
| 059-LDP | LDP | Liberal Democratic Party |
| 061-PRS-SBH | PRS | Parti Rakyat Sabah |
| 062-S46 | S46 | Spirit of 46 Malay Party |
| 063-AKAR | AKAR | People's Justice Movement |
| 063-AKAR-BERSATU | AKAR-BERSATU | People's United Justice Movement |
| 064-IPF | IPF | All Malaysia Indian Progressive Front |
| 065-BERSEKUTU | BERSEKUTU | Federated Sabah People's Front |
| 065-SPF | SPF | Sabah People's Front |
| 065-SWP | SWP | Sarawak Workers Party |
| 065-PBM | PBM | Malaysian Nation Party |
| 066-PDS | PDS | Democratic Sabah Party |
| 066-UPKO-1 | UPKO | United Pasokmomogun Kadazandusun Murut Organisation |
| 066-UPKO-2 | UPKO | United Progressive Kinabalu Organisation |
| 067-PBRS-SBH | PBRS | United Sabah People's Party |
| 068-SAPP | SAPP | Sabah Progressive Party |
| 069-SETIA | SETIA | United Democratic Sabah People's Power Party |
| 069-BERSAMA | BERSAMA | Malaysia United People's Party |
| 070-AKIM | AKIM | Malaysian People's Justice Front |
| 070-KITA | KITA | People's Welfare Party |
| 071-ASPIRASI | ASPIRASI | Sarawak People's Aspirations Party |
| 072-STAR-SWK | STAR | State Reform Party |
| 073-MDP | MDP | Malaysian Democratic Party |
| 074-PSM | PSM | Socialist Party of Malaysia |
| 075-PKN | PKN | National Justice Party |
| 077-SPDP | SPDP | Sarawak Progressive Democratic Party |
| 077-PDP | PDP | Sarawak Progressive Democratic Party (rebranded) |
| 078-PKR | PKR | People's Justice Party |
| 080-PRS-SWK | PRS | Sarawak People's Party |
| 081-MMSP | MMSP | Malaysia Makkal Sakti Party |
| 082-PCM | PCM | Love Malaysia Party |
| 087-PGRS | PGRS | Sabah People's Ideas Party |
| 088-PERPADUAN | PERPADUAN | Sabah National People's Unity Organisation |
| 089-PKS | PKS | Sabah National Party |
| 090-SAPU | SAPU | Sabah Wellbeing and Unity Front Party |
| 091-USNO-BARU | USNO | United Sabah National Organisation (New) |
| 092-SPP | SPP | Sabah Peace Party |
| 094-PEACE | PEACE | People's Alliance for Justice of Peace |
| 095-PCS | PCS | Parti Cinta Sabah |
| 096-ANAK-NEGERI | ANAK-NEGERI | Native Cooperation Party |
| 097-PBK | PBK | Parti Bumi Kenyalang |
| 098-TERAS | TERAS | Sarawak People Energy Party |
| 099-PSB | PSB | Sarawak United Party |
| 100-IKATAN | IKATAN | Malaysian People's Unity Party |
| 102-HR | HR | Sabah People's Hope Party |
| 103-PAP | PAP | People's Alternative Party |
| 104-WARISAN | WARISAN | Heritage Party |
| 105-PFP | PFP | Penang Front Party |
| 106-MUP | MUP | Malaysian United Party |
| 106-BERSAMA | BERSAMA | Malaysian United Party (rebranded) |
| 107-BERSATU | BERSATU | Malaysian United Indigenous Party |
| 108-STAR-SBH | STAR | Homeland Solidarity Party |
| 110-PPRS | PPRS | Sabah People's Unity Party |
| 111-SEDAR | SEDAR | Sarawak People's Consciousness Party |
| 112-PUTRA | PUTRA | Malaysian Sovereign Bumiputera Party |
| 113-MIPP | MIPP | Malaysian Indian People Party |
| 114-MAP | MAP | Malaysia Advancement Party |
| 116-PUR | PUR | Parti Utama Rakyat |
| 117-IMAN | IMAN | National Indian Muslim Alliance Party |
| 119-PEJUANG | PEJUANG | Homeland Fighter's Party |
| 120-MUDA | MUDA | Malaysian United Democratic Alliance |
| 122-GB | GB | Nation's Vision |
| 123-KDM | KDM | People's Solidarity Democracy Party |
| 124-IMPIAN | IMPIAN | Sabah Dream Party |
| 125-ASLI | ASLI | Malaysian Indigenous People's Party |
| 126-RUMPUN | RUMPUN | Rumpun Sabah Party |
| 127-GAS | GAS | Sabahan's Glory Party |
| 128-PR-SBH | PR | The People's Struggle |

## Important Analysis Notes

- `headline_ballots` is candidate-level.
- `headline_stats` is seat-level.
- `saluran_ballots_*` is candidate-level at saluran granularity. Available for 5 elections only: GE-15, GE-14, GE-13, N9 SE-15, JHR SE-15.
- `saluran_stats_*` is saluran-level. Same 5 elections.
- `voter_roll_*` covers 7 elections: the same 5 as `saluran_ballots_*`, plus GE-12 and JHR SE-16 (voter roll only — no saluran-level data for these two, so they cannot be joined to saluran tables).
- `voter_demographics` is seat-level. Available for GE-13, GE-14, and GE-15 (all seats, nationwide), plus Johor SE-15 and SE-16, and Negeri Sembilan SE-16 (state-specific seats). Johor SE-16 and Negeri Sembilan SE-16 demographics are fully available.
- Use `voter_demographics` instead of the raw voter roll for requests involving only one demographic dimension, such as sex only, ethnicity only, or age only.
- The `voter_demographics` columns do not provide demographic cross-tabs. For requests involving two or more demographic dimensions, such as men aged 18-20, use `voter_roll_*`.
- `voter_demographics` columns are absolute counts. In general, convert them into percentages for analysis unless the user explicitly asks for absolute counts. For example, if the user asks to see results in the Parliament seats with the highest percentage of Chinese voters, compute `ethnic_chinese * 100.0 / voters_total` from `voter_demographics`, then compare it with results.
- `voter_roll_*` should be used for voter-level demographic work that cannot be answered from `voter_demographics`, especially cross-tabs involving two or more demographic dimensions.
- `voter_roll_*` is perfectly aligned with `saluran_ballots_*` and `saluran_stats_*` at the saluran level. See Join Rules for the correct join pattern. This enables saluran-level demographic analysis — for example, computing the ethnic or age composition of each saluran and correlating it with votes or turnout.
- In `voter_roll_*`, `dm` is the voter's actual voting district (matches saluran tables), while `dm_vr` is their residential district. Always join to saluran tables using `dm`, not `dm_vr`.
- Be careful not to double-count seat-level values from `headline_stats` after joining to candidate-level rows in `headline_ballots`.
- Be careful not to double-count saluran-level values from `saluran_stats_*` after joining to candidate-level rows in `saluran_ballots_*`.
- If aggregating seat-level statistics after a join, deduplicate at the seat-election level first using `date`, `election`, `state`, and `seat`.
- `saluran_stats_*` includes pre-computed `voter_turnout`, `votes_rejected_perc`, and `ballots_not_returned_perc` columns. Exclude rows where `dm` contains `/UP` (postal votes) when aggregating `voter_turnout`.
- The Malaysian electoral geography is a strict nesting: **Parlimen > DUN > DM > PM > Saluran**. Every saluran belongs to exactly one PM, every PM to exactly one DM, every DM to exactly one DUN, and every DUN to exactly one Parlimen. This perfect nesting means saluran data can be aggregated upward to any level without overlap or double-counting. For example, summing `votes` from `saluran_ballots_ge15` grouped by `seat` + `candidate_uid` reproduces Parliament-level results exactly. To aggregate to a level not present in the saluran table (e.g. DUN-level results from a GE, or Parliament-level results from a state election), join the saluran data to `voter_roll_*` on `dm`, `pm`, and `saluran` to obtain the `dun` (or `parlimen`) for each saluran, then group and sum. This allows estimating what the DUN results would have been in GE-15, or estimating Parliament-level results from JHR SE-15 saluran data.
- For questions about voter demographics in **Sarawak seats**, offer the user a choice: (a) use `voter_demographics` with nationwide groupings (Malay, Chinese, Indian, Bumi Sarawak, etc.), or (b) use `voter_demographics_sarawak` with Sarawak-specific groupings (Malay/Melanau, Chinese, Iban, Bidayuh, Orang Ulu, Kedayan, Other Bumi Sarawak, Other). Use whichever the user prefers.
- For questions about voter demographics in **Sabah seats**, offer the user a choice: (a) use `voter_demographics` with nationwide groupings, or (b) use `voter_demographics_sabah` with Sabah-specific groupings (Malay, Chinese, Kadazan-Dusun, Bajau, Murut, Brunei, Sungai, Other Bumi Sabah, Other). Use whichever the user prefers.
- `won_uncontested` indicates an uncontested seat. These may have `votes = 0`, blank `votes_perc`, and seat stats such as `ballots_issued = 0`.
- `votes_perc`, `voter_turnout`, `majority_perc`, `votes_rejected_perc`, and `ballots_not_returned_perc` are percentages, not proportions.
- Blank percentage fields should be treated as missing values.
- `age = -1` should be treated as unknown or missing, not as a real age.
- `party_on_ballot` and `coalition` may reflect historical ballot labels. For consistent grouping, use `party_uid` and `coalition_uid`.
- `BEBAS` / `000-BEBAS` represents independent candidates.
- `ALONE` / `000-ALONE` represents parties or candidates not running under a broader coalition.
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
