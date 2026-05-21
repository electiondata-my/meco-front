export const MALAYSIA = { key: "mys", name: "Malaysia" } as const;

export const STATES = [
  { key: "jhr", name: "Johor" },
  { key: "kdh", name: "Kedah" },
  { key: "ktn", name: "Kelantan" },
  { key: "kul", name: "W.P. Kuala Lumpur" },
  { key: "lbn", name: "W.P. Labuan" },
  { key: "mlk", name: "Melaka" },
  { key: "nsn", name: "Negeri Sembilan" },
  { key: "phg", name: "Pahang" },
  { key: "prk", name: "Perak" },
  { key: "pls", name: "Perlis" },
  { key: "png", name: "Pulau Pinang" },
  { key: "pjy", name: "W.P. Putrajaya" },
  { key: "sbh", name: "Sabah" },
  { key: "swk", name: "Sarawak" },
  { key: "sgr", name: "Selangor" },
  { key: "trg", name: "Terengganu" },
] as const;

export const CountryAndStates: Record<string, string> = [MALAYSIA, ...STATES].reduce(
  (acc, s) => ({ ...acc, [s.key]: s.name }),
  {} as Record<string, string>,
);

export const StateKeyByName: Record<string, string> = Object.fromEntries(
  Object.entries(CountryAndStates).map(([k, v]) => [v, k]),
);

export const STATE_ORDER: Record<string, number> = STATES.reduce(
  (acc, s, i) => ({ ...acc, [s.key]: i }),
  {} as Record<string, number>,
);
