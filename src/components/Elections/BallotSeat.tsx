import { useState, useEffect, useRef, useCallback } from "react";

type OverallSeat = {
  seat: string;
  date: string;
  party: string;
  party_uid?: string;
  name: string;
  majority: number | null;
  majority_perc: number | null;
  voter_turnout?: number;
  voter_turnout_perc?: number;
  votes_rejected?: number;
  votes_rejected_perc?: number;
  party_lost?: string[];
};

type BallotResult = {
  name: string;
  party: string;
  party_uid?: string;
  coalition?: string;
  votes: number;
  votes_perc: number;
  result: string;
};

type SeatResult = {
  data: BallotResult[];
  votes: { x: string; abs: number; perc: number }[];
};

interface Props {
  seats: OverallSeat[];
  election: string;
  state: string;
  apiBaseUrl: string;
  translations: Record<string, Record<string, any>>;
}

function tt(ns: Record<string, any>, key: string): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], ns);
  return typeof val === "string" ? val : key;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-MY", { maximumFractionDigits: 0 });
}

function fmtPerc(n: number | null | undefined, dp = 1): string {
  if (n == null) return "(—)";
  return `(${n.toFixed(dp)}%)`;
}

export default function BallotSeat({ seats, election, state, apiBaseUrl, translations }: Props) {
  const common    = translations.common    ?? {};
  const elections = translations.elections ?? {};

  const [selectedSeat, setSelectedSeat]   = useState<string>(seats[0]?.seat ?? "");
  const [filterResult, setFilterResult]   = useState("");
  const [filterParty,  setFilterParty]    = useState("");
  const [result, setResult]               = useState<SeatResult | null>(null);
  const [loading, setLoading]             = useState(false);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const cache = useRef<Map<string, SeatResult>>(new Map());
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchResult = useCallback(async (seat: string, date: string) => {
    const key = `${state}-${election}-${seat}`;
    if (cache.current.has(key)) {
      setResult(cache.current.get(key)!);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/results/${encodeURIComponent(seat)}/${date}.json`);
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      const { ballot, summary } = json;
      const s = summary[0];
      const r: SeatResult = {
        data: ballot,
        votes: [
          { x: "majority",       abs: s.majority,       perc: s.majority_perc },
          { x: "voter_turnout",  abs: s.voter_turnout,  perc: s.voter_turnout_perc },
          { x: "rejected_votes", abs: s.votes_rejected, perc: s.votes_rejected_perc },
        ],
      };
      cache.current.set(key, r);
      setResult(r);
    } catch { /* silent fail */ }
    finally { setLoading(false); }
  }, [state, election, apiBaseUrl]);

  useEffect(() => {
    if (seats.length > 0) {
      setSelectedSeat(seats[0].seat);
      fetchResult(seats[0].seat, seats[0].date);
    }
  }, [seats]);

  // Filter logic
  const CONTESTED = tt(elections, "contested_by") || "Contested By";
  const WON_BY    = tt(elections, "won_by")       || "Won By";
  const LOST_BY   = tt(elections, "lost_by")      || "Lost By";
  const RESULT_OPTIONS = [
    { label: CONTESTED, value: CONTESTED },
    { label: WON_BY,    value: WON_BY    },
    { label: LOST_BY,   value: LOST_BY   },
  ];

  const filteredSeats = seats.filter(s => {
    if (!filterParty) return true;
    const contested = filterResult === CONTESTED || !filterResult;
    const won       = filterResult === WON_BY;
    const lost      = filterResult === LOST_BY;
    if (won)  return s.party === filterParty;
    if (lost) return (s.party_lost ?? []).includes(filterParty);
    if (contested) return s.party === filterParty || (s.party_lost ?? []).includes(filterParty);
    return true;
  });

  const allParties: string[] = (() => {
    const set = new Set<string>();
    for (const s of seats) {
      set.add(s.party);
      for (const p of s.party_lost ?? []) set.add(p);
    }
    return [...set].sort();
  })();

  const selectedSeatObj = seats.find(s => s.seat === selectedSeat);

  function selectAndFetch(seatName: string) {
    const obj = seats.find(s => s.seat === seatName);
    if (!obj) return;
    setSelectedSeat(seatName);
    fetchResult(seatName, obj.date);
    scrollRefs.current[seatName]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const electionLabel = tt(elections, election) || election;

  return (
    <section className="space-y-6 py-8 lg:space-y-12 lg:py-12">
      <h4 className="text-center font-heading text-heading-2xs font-bold">
        {tt(elections, "header_2") || "View the full ballot for a specific seat"}
      </h4>

      {/* Filters */}
      <div className="mx-auto flex w-fit flex-wrap items-center gap-2">
        <select
          value={filterResult}
          onChange={e => { setFilterResult(e.target.value); setFilterParty(""); }}
          className="rounded-full border border-otl-gray-200 bg-bg-white px-3 py-1.5 text-body-sm text-txt-black-700"
        >
          {RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterParty}
          onChange={e => setFilterParty(e.target.value)}
          className="rounded-full border border-otl-gray-200 bg-bg-white px-3 py-1.5 text-body-sm text-txt-black-700"
        >
          <option value="">{tt(elections, "all_parties") || "All Parties"}</option>
          {allParties.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Left-right card */}
      <div className="flex max-h-[650px] w-full flex-col rounded-xl border border-otl-gray-200 lg:flex-row">
        {/* Left: seat list */}
        <div className="relative flex h-fit w-full flex-col overflow-hidden bg-bg-washed px-3 pb-3 lg:h-[650px] lg:w-[360px] lg:shrink-0 lg:overflow-y-auto lg:rounded-bl-xl lg:rounded-tl-xl lg:pb-8">
          {/* Seat list — horizontal scroll on mobile, vertical on desktop */}
          <div className="hide-scrollbar grid h-[394px] max-w-screen-sm grid-flow-col grid-rows-3 gap-1 overflow-x-auto pt-3 lg:flex lg:h-full lg:w-full lg:flex-col lg:overflow-y-auto lg:px-0.5">
            {filteredSeats.map(s => {
              const [code, ...rest] = s.seat.split(" ");
              const name = rest.join(" ");
              const isSelected = s.seat === selectedSeat;
              return (
                <div
                  key={s.seat}
                  ref={el => { scrollRefs.current[s.seat] = el; }}
                  className="pb-px pl-px pr-3 pt-3 lg:pr-0"
                >
                  <button
                    onClick={() => { selectAndFetch(s.seat); setDrawerOpen(true); }}
                    className={[
                      "flex h-full w-full flex-col gap-2 rounded-xl border p-3 text-left text-body-sm max-lg:w-72",
                      "bg-bg-white transition-colors",
                      isSelected
                        ? "ring-1 ring-danger-600 border-transparent"
                        : "border-bg-black-200 hover:border-bg-black-400",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 text-sm font-medium">{code}</span>
                      <span className="truncate text-body-sm">{name}</span>
                    </div>
                    <div className="flex h-6 items-center gap-1.5">
                      <img
                        src={`/static/images/parties/${s.party_uid ?? s.party}.png`}
                        alt={s.party}
                        className="h-auto max-h-6 w-auto max-w-[32px] border border-otl-gray-200 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="text-txt-black-500">({s.party})</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm text-txt-black-500">
                      <span>{tt(common, "majority") || "Majority"}</span>
                      <span>{fmt(s.majority)} {fmtPerc(s.majority_perc)}</span>
                    </div>
                    {/* Majority bar */}
                    <div className="h-[5px] w-full rounded-full bg-otl-gray-200">
                      {s.majority_perc != null && (
                        <div
                          className="h-full rounded-full bg-txt-danger"
                          style={{ width: `${Math.min(s.majority_perc, 100)}%` }}
                        />
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: result panel — hidden on mobile, visible on desktop */}
        <div className="hidden flex-1 space-y-4 overflow-y-auto bg-bg-white p-6 pb-8 lg:block">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-otl-gray-200 border-t-txt-danger" />
            </div>
          )}
          {!loading && result && selectedSeatObj && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-x-1.5 text-body-lg uppercase">
                  <h5 className="font-bold">{selectedSeat.split(",")[0]?.trim()}</h5>
                  <p className="text-txt-black-500">{selectedSeat.split(",")[1]?.trim()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 text-body-md">
                  <p>{electionLabel}</p>
                  <p className="text-txt-black-500">
                    {new Date(selectedSeatObj.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <ResultTable data={result.data} votes={result.votes} common={common} />
            </>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[calc(100%-96px)] overflow-y-auto rounded-t-2xl bg-bg-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col gap-1">
                <p className="font-bold text-body-md">{selectedSeat}</p>
                <p className="text-body-sm text-txt-black-500">{electionLabel}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-txt-black-500">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {loading
              ? <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-otl-gray-200 border-t-txt-danger" /></div>
              : result
                ? <ResultTable data={result.data} votes={result.votes} common={common} compact />
                : null
            }
          </div>
        </div>
      )}
    </section>
  );
}

function ResultTable({ data, votes, common, compact = false }: {
  data: BallotResult[];
  votes: { x: string; abs: number; perc: number }[];
  common: Record<string, any>;
  compact?: boolean;
}) {
  const winner = data[0];

  return (
    <div className="space-y-4">
      {/* Vote stats */}
      <div className={["grid gap-3", compact ? "grid-cols-3" : "grid-cols-3"].join(" ")}>
        {votes.map(v => (
          <div key={v.x} className="rounded-lg border border-otl-gray-200 p-3">
            <p className="text-body-xs text-txt-black-500 uppercase tracking-wide">{tt(common, v.x) || v.x.replace(/_/g, " ")}</p>
            <p className="mt-1 text-body-md font-semibold">{fmt(v.abs)}</p>
            <p className="text-body-xs text-txt-black-500">{v.perc?.toFixed(1)}%</p>
          </div>
        ))}
      </div>

      {/* Ballot table */}
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-otl-gray-200 text-txt-black-500">
            <th className="py-2 text-left font-medium">{tt(common, "candidate_name") || "Candidate"}</th>
            <th className="px-3 py-2 text-left font-medium">{tt(common, "party_name") || "Party"}</th>
            <th className="py-2 text-right font-medium">{tt(common, "votes_won") || "Votes"}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={["border-b border-otl-gray-200", i === 0 ? "bg-green-50 dark:bg-green-950" : ""].join(" ")}>
              <td className="py-2 pr-3">
                <span className="font-medium">{row.name}</span>
                {i === 0 && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{tt(common, "won") || "Won"}</span>}
              </td>
              <td className="px-3 py-2">
                {row.party_uid && (
                  <img src={`/static/images/parties/${row.party_uid}.png`} alt={row.party} className="mr-1 inline-block h-4 w-auto border border-otl-gray-200" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                {row.party}
              </td>
              <td className="py-2 text-right">{fmt(row.votes)} <span className="text-txt-black-500">({row.votes_perc?.toFixed(1)}%)</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
