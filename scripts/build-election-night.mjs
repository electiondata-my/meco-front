// Surgical frontend rebuild for election night — the frontend mirror of
// meco-etl/api_election_night.py. Derives the pages touched by the election
// from the internal API, then runs a scoped `pnpm build`.
//
// Usage (on the DO box, after the ETL has run):
//   node scripts/build-election-night.mjs          # derive scope + build
//   node scripts/build-election-night.mjs --dry-run # print scope, skip build
//
// Deploy afterwards with `pnpm deploy` (from the same warm dist/).

import { spawnSync } from "node:child_process";

// ----- election under way (keep in sync with meco-etl/api_election_night.py) -----
const DATE = "2026-08-01";
const ELECTION = "SE-16";
const STATE = "Negeri Sembilan";
const STATE_CODE = "nsn";

// catalogue datasets whose underlying data changes with this election
const HEADLINE_IDS = [
  "headline-ballots",
  "headline-stats",
  `headline-ballots-state-${STATE_CODE}`,
  `headline-stats-state-${STATE_CODE}`,
];

const BASE = "https://internal.electiondata.my";

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`fetch failed: ${path} (${res.status})`);
  return res.json();
}

const [electionsDropdown, seatsDropdown, candidatesAll, partiesAll] = await Promise.all([
  fetchJSON("/elections/dropdown.json"),
  fetchJSON("/seats/current/dropdown.json"),
  fetchJSON("/candidates/all.json"),
  fetchJSON("/parties/all.json"),
]);

// elections/[...election].astro matches `${StateKeyByName[state]}/${election}`
const electionEntries = electionsDropdown.elections ?? electionsDropdown;
if (!electionEntries.some((e) => e.state === STATE && e.election === ELECTION)) {
  throw new Error(`${STATE} ${ELECTION} not found in /elections/dropdown.json — has the ETL run?`);
}
const electionsScope = [`${STATE_CODE}/${ELECTION}`];

// seats/[...seat].astro matches `${type}/${slug}` — every dun in the state
const seatsScope = seatsDropdown.data
  .filter((s) => s.type === "dun" && s.seat.endsWith(`, ${STATE}`))
  .map((s) => `dun/${s.slug}`);

// candidates/[...slug].astro matches the slug, which keys all.json —
// scoped by date + election + state, same as get_se16_scope() in the ETL
const candidatesScope = Object.keys(candidatesAll).filter((slug) =>
  candidatesAll[slug].some(
    (e) => e.date === DATE && e.election_name === ELECTION && e.seat.endsWith(`, ${STATE}`),
  ),
);

// parties/ and coalitions/[...].astro both match maps_to uids via POST_TO_BUILD_PARTIES;
// all.json keys are `party-<uid>` / `coalition-<uid>` with the canonical uid
const partiesScope = Object.keys(partiesAll)
  .filter((k) =>
    partiesAll[k].some(
      (e) =>
        e.date === DATE &&
        e.election_name === ELECTION &&
        e.state === STATE &&
        e.seats_contested > 0,
    ),
  )
  .map((k) => k.replace(/^(party|coalition)-/, ""));

const env = {
  POST_TO_BUILD_ELECTIONS: electionsScope.join(","),
  POST_TO_BUILD_SEATS: seatsScope.join(","),
  POST_TO_BUILD_CANDIDATES: candidatesScope.join(","),
  POST_TO_BUILD_PARTIES: partiesScope.join(","),
  POST_TO_BUILD_CATALOGUE: HEADLINE_IDS.join(","),
};

console.log(`\n${STATE} ${ELECTION} (${DATE}) frontend scope:`);
console.log(`  elections:  ${electionsScope.length} (${env.POST_TO_BUILD_ELECTIONS})`);
console.log(`  seats:      ${seatsScope.length} duns`);
console.log(`  candidates: ${candidatesScope.length}`);
console.log(`  parties:    ${partiesScope.length} (incl. coalitions)`);
console.log(`  catalogue:  ${HEADLINE_IDS.length} (${env.POST_TO_BUILD_CATALOGUE})`);

for (const [k, v] of Object.entries(env)) {
  if (!v) throw new Error(`${k} resolved empty — an empty scope would trigger a full build`);
}

if (process.argv.includes("--dry-run")) {
  console.log("\n--dry-run: skipping build. Scope env vars:\n");
  for (const [k, v] of Object.entries(env)) console.log(`${k}="${v}"`);
  process.exit(0);
}

console.log("\nRunning surgical build...\n");
const result = spawnSync("pnpm", ["build"], {
  stdio: "inherit",
  env: { ...process.env, ...env },
});
if (result.status !== 0) process.exit(result.status ?? 1);

console.log("\nSurgical build complete. Deploy with: pnpm deploy");
