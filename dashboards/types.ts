export type ElectionType = "parlimen" | "dun";
export type Region = "peninsular" | "sabah" | "sarawak";
export enum ElectionEnum {
  Parlimen = 0,
  Dun = 1,
}
export type ElectionResult =
  | "won"
  | "won_uncontested"
  | "lost"
  | "lost_deposit";

export type Candidate = {
  type: ElectionType;
  election_name: string;
  date: string;
  seat: string;
  party: string;
  votes: Record<"abs" | "perc", number>;
  result: ElectionResult;
};

export type Party = {
  party: string;
  type: ElectionType;
  state: string;
  election_name: string;
  date: string;
  seats_total: number;
  seats_perc: number;
  seats: number;
  votes: number;
  votes_perc: number;
};

export type Seat = {
  seat: string;
  election_name: string;
  date: string;
  party: string;
  name: string;
  majority: number;
  majority_perc: number;
  // type: ElectionType;
};

export type PartySummary = {
  voter_turnout: number;
  voter_turnout_perc: number;
  votes_rejected: number;
  votes_rejected_perc: number;
};

export type Summary = PartySummary & {
  majority: number;
  majority_perc: number;
};

export type OverallSeat = Summary & {
  seat: string;
  date: string;
  party: string;
  name: string;
  party_lost?: string[];
};

export type BaseResult = {
  name: string;
  type: ElectionType;
  date: string;
  election_name: string;
  seat: string;
  party: string;
  votes: number;
  votes_perc: number;
  result: string;
};

export type SeatResult = {
  votes: Summary;
  data: Array<BaseResult>;
};

export type CandidateResult = SeatResult;

export type PartyResult = Array<{
  party: string;
  type: string;
  state: string;
  election_name: string;
  date: string;
  seats_total: number;
  seats_perc: number;
  seats: number;
  votes: number;
  votes_perc: number;
}>;

export type SeatOptions = {
  seat_name: string;
  type: ElectionType;
  slug: string;
};

type ElectionParams<T> = T extends Candidate
  ? { candidate: string }
  : T extends Party
    ? {
        party: string;
        state: string;
      }
    : T extends Seat
      ? SeatOptions
      : never;

export type ElectionResource<T extends Candidate | Party | Seat> = {
  elections: T extends Candidate | Party
    ? {
        parlimen: T[];
        dun: T[];
      }
    : T[];
  params: ElectionParams<T>;
};

export interface Boundaries {
  zoom: number;
  center: [number, number];
  polygons: Record<number, [string, string[]]>;
}

type LineageParlimen = {
  year: number;
  parlimen: string;
  area: number;
  overlap_pct: number;
  n_duns: number;
  duns: string;
};
type LineageDun = {
  year: number;
  dun: string;
  area: number;
  overlap_pct: number;
  parlimen: string;
};

export type Lineage =
  | {
      type: "parlimen";
      data: LineageParlimen[];
    }
  | {
      type: "dun";
      data: LineageDun[];
    };

export type RedelineationData = {
  callout_new: {
    total: number;
    unchanged: number;
    changed: number;
    new: number;
  };
  bar_new: {
    state: string[];
    unchanged: number[];
    changed: number[];
    new: number[];
  };
  callout_old: {
    total: number;
    unchanged: number;
    changed: number;
    abolished: number;
  };
  bar_old: {
    state: string[];
    unchanged: number[];
    changed: number[];
    abolished: number[];
  };
  map_new: string;
  map_old: string;
  new: {
    seat_new: string;
    state: string;
    seat_old: string[];
    center: [number, number];
    zoom: number;
    lineage: RedelineationTableNew[];
  }[];
  old: {
    seat_old: string;
    seat_new: string[];
    state: string;
    center: [number, number];
    zoom: number;
    lineage: RedelineationTableOld[];
  }[];
};

export type RedelineationTableNew = {
  seat_new: string;
  parent: string;
  perc_from_parent: number;
};
export type RedelineationTableOld = {
  seat_old: string;
  child: string;
  perc_to_child: number;
};
