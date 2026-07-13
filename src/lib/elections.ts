export type TimeseriesParty = {
  party: string;
  party_uid?: string;
  coalition?: string;
  coalition_uid?: string;
  seats_won: number;
  seats_contested: number;
  votes: number;
};

export type TimeseriesEdition = {
  election: string;
  year: string;
  seatsTotal: number;
  votesTotal: number;
  parties: TimeseriesParty[];
};

export type Timeseries = {
  editions: TimeseriesEdition[];
  /** The 4 editions selected by default, newest-first. */
  selected: string[];
  /** The page's own election. Party/coalition groupings are pinned to it. */
  current: string;
};

type ElectionLike = {
  by_party?: (TimeseriesParty & { votes_total?: number })[];
  by_seat?: { date?: string }[];
};

const editionNumber = (election: string) => Number(election.match(/\d+/)?.[0] ?? 0);

/**
 * Picks the 3 comparator editions — the three preceding ones where they exist, topped
 * up with later ones when the current edition is too early to have three
 * (SE-03 → SE-02, SE-01, SE-04).
 */
function pickComparators(names: string[], current: string): string[] {
  const currentNo = editionNumber(current);
  const others = names
    .filter((name) => name !== current)
    .sort((a, b) => editionNumber(b) - editionNumber(a));
  const earlier = others.filter((name) => editionNumber(name) < currentNo);
  const later = others.filter((name) => editionNumber(name) > currentNo).reverse();
  return [...earlier.slice(0, 3), ...later].slice(0, 3);
}

/**
 * Flattens every edition of one state+chamber into the lean shape the timeseries tab
 * needs, so a reader can swap any column for any edition without a network round-trip.
 * Ships whole (25–60 KB per page, highly repetitive so it gzips down hard).
 */
export function buildTimeseries(
  editions: Record<string, ElectionLike> | undefined,
  current: string,
): Timeseries {
  if (!editions?.[current]) return { editions: [], selected: [], current };

  const flattened = Object.entries(editions)
    .map(([election, data]) => {
      const by_party = data.by_party ?? [];
      return {
        election,
        year: data.by_seat?.[0]?.date?.slice(0, 4) ?? "",
        seatsTotal: data.by_seat?.length ?? 0,
        votesTotal:
          by_party.find((p) => p.votes_total)?.votes_total ??
          by_party.reduce((sum, p) => sum + p.votes, 0),
        parties: by_party.map((p) => ({
          party: p.party,
          party_uid: p.party_uid,
          coalition: p.coalition,
          coalition_uid: p.coalition_uid,
          seats_won: p.seats_won,
          seats_contested: p.seats_contested,
          votes: p.votes,
        })),
      };
    })
    .sort((a, b) => editionNumber(b.election) - editionNumber(a.election));

  const selected = [current, ...pickComparators(Object.keys(editions), current)].sort(
    (a, b) => editionNumber(b) - editionNumber(a),
  );

  return { editions: flattened, selected, current };
}
