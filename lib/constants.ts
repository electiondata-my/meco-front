// GENERAL
export enum BREAKPOINTS {
  SM = 640,
  MD = 768,
  LG = 1024,
  XL = 1440,
}

/**
 * MALAYSIA def.
 */
export const MALAYSIA: Record<string, string> = {
  key: "mys",
  name: "Malaysia",
};

/**
 * STATES defs.
 */
export const STATES: Array<Record<string, any>> = [
  {
    key: "jhr",
    name: "Johor",
  },
  {
    key: "kdh",
    name: "Kedah",
  },
  {
    key: "ktn",
    name: "Kelantan",
  },
  {
    key: "kul",
    name: "W.P. Kuala Lumpur",
  },
  {
    key: "lbn",
    name: "W.P. Labuan",
  },
  {
    key: "mlk",
    name: "Melaka",
  },
  {
    key: "nsn",
    name: "Negeri Sembilan",
  },
  {
    key: "phg",
    name: "Pahang",
  },
  {
    key: "prk",
    name: "Perak",
  },
  {
    key: "pls",
    name: "Perlis",
  },
  {
    key: "png",
    name: "Pulau Pinang",
  },
  {
    key: "pjy",
    name: "W.P. Putrajaya",
  },
  {
    key: "sbh",
    name: "Sabah",
  },
  {
    key: "swk",
    name: "Sarawak",
  },
  {
    key: "sgr",
    name: "Selangor",
  },
  {
    key: "trg",
    name: "Terengganu",
  },
];

/**
 * Dictionary of code to country/state name. IIFE
 * @example CountryAndStates["mlk"] -> "Melaka"
 */
export const CountryAndStates: Record<string, string> = (() => {
  return [MALAYSIA, ...STATES].reduce((prev, current) => {
    return { ...prev, ...{ [current.key]: current.name } };
  }, {});
})();

/**
 * Dictionary of color palette.
 * @example COLOR.PRIMARY -> "#2563EB"
 */
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

/**
 * Convert locale code to shorter code.
 * @example SHORT_LANG["ms-MY"] -> "bm"
 */
export const SHORT_LANG = {
  "ms-MY": "bm",
  "en-GB": "en",
} as const;

/**
 * Color ordering for data-catalogue.
 * @example CATALOGUE_COLORS[0] -> COLOR.PRIMARY
 */
export const CATALOGUE_COLORS = [
  COLOR.PRIMARY,
  COLOR.GREY,
  "#E2A614",
  COLOR.DANGER,
] as const;

/**
 * Convert API periods to the designated timeseries interval.
 * @example SHORT_PERIOD["WEEKLY"] -> "weekly"
 */
export const SHORT_PERIOD = {
  DAILY: "auto",
  WEEKLY: "day",
  MONTHLY: "month",
  QUARTERLY: "quarter",
  YEARLY: "year",
  INTRADAY: "hour",
  INFREQUENT: "auto",
  AS_REQUIRED: "auto",
} as const;

/**
 * Convert API periods to the designated timeseries tooltip format.
 * @example SHORT_PERIOD_FORMAT["WEEKLY"] -> "weekly"
 */
export const SHORT_PERIOD_FORMAT = {
  DAILY: "dd MMM yyyy",
  WEEKLY: "dd MMM yyyy",
  MONTHLY: "MMM yyyy",
  QUARTERLY: "qQ yyyy",
  YEARLY: "yyyy",
  INTRADAY: "dd MMM yyyy",
  INFREQUENT: "dd MMM yyyy",
  AS_REQUIRED: "dd MMM yyyy",
} as const;

/**
 * PARTY_COLOURS defs.
 */
export const PARTY_COLOURS: Array<Record<string, any>> = [
  {
    key: "amanah",
    colour: "#f7911f",
  },
  {
    key: "bebas",
    colour: "#ffffff",
  },
  {
    key: "bersatu",
    colour: "#e30007",
  },
  {
    key: "BN",
    colour: "#000080",
  },
  {
    key: "dap",
    colour: "#cc0000",
  },
  {
    key: "gerakan",
    colour: "ff0000",
  },
  {
    key: "GPS",
    colour: "#ff9b0e",
  },
  {
    key: "muda",
    colour: "#000000",
  },
  {
    key: "pas",
    colour: "#008000",
  },
  {
    key: "pejuang",
    colour: "#006a8e",
  },
  {
    key: "PH",
    colour: "#E2462F",
  },
  {
    key: "pkr",
    colour: "#00bfff",
  },
  {
    key: "PN",
    colour: "#003152",
  },
  {
    key: "umno",
    colour: "c00000",
  },
  {
    key: "upko",
    colour: "#183980",
  },
];

/**
 * Dictionary of code to party colour.
 * @example PoliticalPartyColours["bebas"] -> "#FFFFFF"
 */
export const PoliticalPartyColours: Record<string, string> = (() => {
  return [...PARTY_COLOURS].reduce((prev, current) => {
    return { ...prev, ...{ [current.key]: current.colour } };
  }, {});
})();