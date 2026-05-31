export type OptionType = {
  label: string;
  value: string;
  contests?: number;
  wins?: number;
  losses?: number;
};

export type Geotype = "state" | "parlimen" | "dun" | "district";
