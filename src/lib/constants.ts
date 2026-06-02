export const MALAYSIA = { key: "mys", name: "Malaysia" } as const;
export const SEMENANJUNG = { key: "smj", name: "Semenanjung" } as const;

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

export const CountryAndStates: Record<string, string> = [MALAYSIA, SEMENANJUNG, ...STATES].reduce(
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

export const COLOR = {
  BLACK: "#18181B",
  BLACK_H: "#18181B1A",
  WHITE: "#FFFFFF",
  WHITE_H: "#FFFFFF1A",
  DANGER: "#DC2626",
  DANGER_H: "#DC26261A",
  PRIMARY: "#2563EB",
  PRIMARY_H: "#2563EB1A",
  PRIMARY_DARK: "#3E7AFF",
  PRIMARY_DARK_H: "#3E7AFF1A",
  SUCCESS: "#10B981",
  SUCCESS_H: "#10B9811A",
  GREEN: "#16A34A",
  GREEN_H: "#16A34A1A",
  WARNING: "#FBBF24",
  WARNING_H: "#FBBF241A",
  DIM: "#71717A",
  DIM_H: "#71717A1A",
  WASHED: "#F1F5F9",
  WASHED_H: "#F1F5F9CC",
  WASHED_DARK: "#27272A",
  OUTLINE: "#E2E8F0",
  OUTLINE_H: "#E2E8F01A",
  OUTLINE_DARK: "#3F3F46",
  TURQUOISE: "#30C3B2",
  TURQUOISE_H: "#30C3B21A",
  GREY: "#94A3B8",
  GREY_H: "#94A3B81A",
  DARK_BLUE: "#0C3284",
  DARK_BLUE_H: "#0C32841A",
  PURPLE: "#7C3AED",
  PURPLE_H: "#7C3AED1A",
  ORANGE: "#FF820E",
  ORANGE_H: "#FF820E1A",
} as const;
