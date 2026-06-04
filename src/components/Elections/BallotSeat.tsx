import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BarPerc from "@charts/bar-perc";
import LeftRightCard from "@components/LeftRightCard";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from "@components/drawer";
import { clx, numFormat, toDate } from "@lib/helpers";
import { ArrowsPointingOutIcon } from "@heroicons/react/20/solid";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { matchSorter } from "match-sorter";

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
  votes: number | null;
  votes_perc: number | null;
  result: string;
};

type VoteStat = { x: string; abs: number | null; perc: number | null };

type SeatResult = {
  data?: BallotResult[];
  votes: VoteStat[];
};

interface Props {
  seats: OverallSeat[];
  election: string;
  state: string;
  apiBaseUrl: string;
  locale: string;
  translations: Record<string, Record<string, any>>;
}

function tt(ns: Record<string, any>, key: string): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], ns);
  return typeof val === "string" ? val : "";
}

const resultSlug = (seat: OverallSeat) =>
  `${seat.seat.toLowerCase().replace(/,/g, "").replace(/\./g, "").replace(/\s+/g, "-")}-${seat.date}`;

export default function BallotSeat({
  seats,
  election,
  state,
  apiBaseUrl,
  locale,
  translations,
}: Props) {
  const common = translations.common ?? {};
  const elections = translations.elections ?? {};
  const cache = useRef<Map<string, SeatResult>>(new Map());
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedSeat, setSelectedSeat] = useState(seats[0]?.seat ?? "");
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [result, setResult] = useState<SeatResult>({
    data: undefined,
    votes: [],
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const c = (key: string) => tt(common, key);
  const e = (key: string) => tt(elections, key);

  const fetchResult = useCallback(
    async (seat: string, date: string) => {
      const key = `${state}-${election}-${seat}`;
      if (cache.current.has(key)) {
        setResult(cache.current.get(key)!);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${apiBaseUrl}/results/${encodeURIComponent(seat)}/${date}.json`,
        );
        if (!res.ok) throw new Error("fetch failed");
        const { ballot, summary } = await res.json();
        const stats = summary[0];
        const nextResult: SeatResult = {
          data: ballot,
          votes: [
            { x: "majority", abs: stats.majority, perc: stats.majority_perc },
            {
              x: "voter_turnout",
              abs: stats.voter_turnout,
              perc: stats.voter_turnout_perc,
            },
            {
              x: "rejected_votes",
              abs: stats.votes_rejected,
              perc: stats.votes_rejected_perc,
            },
          ],
        };
        cache.current.set(key, nextResult);
        setResult(nextResult);
      } catch {
        // non-fatal: the result panel will stay in its loading/empty state
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, election, state],
  );

  useEffect(() => {
    if (seats.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const resultParam = params.get("result");
    const initial = resultParam
      ? (seats.find((s) => resultSlug(s) === resultParam) ?? seats[0])
      : seats[0];
    setSelectedSeat(initial.seat);
    fetchResult(initial.seat, initial.date);
    if (resultParam) {
      setTimeout(() => {
        scrollRefs.current[initial.seat]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 200);
    }
  }, [fetchResult, seats]);

  const CONTESTED = e("contested_by") || "Contested By";
  const WON_BY = e("won_by") || "Won By";
  const LOST_BY = e("lost_by") || "Lost By";
  const resultOptions = [
    { label: CONTESTED, value: CONTESTED },
    { label: WON_BY, value: WON_BY },
    { label: LOST_BY, value: LOST_BY },
  ];

  const contestedParties = useMemo(() => {
    const set = new Set<string>();
    for (const seat of seats) {
      set.add(seat.party);
      for (const party of seat.party_lost ?? []) set.add(party);
    }
    return [...set].sort();
  }, [seats]);

  const winningParties = useMemo(() => {
    const set = new Set<string>();
    for (const seat of seats) set.add(seat.party);
    return [...set].sort();
  }, [seats]);

  const losingParties = useMemo(() => {
    const set = new Set<string>();
    for (const seat of seats) {
      for (const party of seat.party_lost ?? []) set.add(party);
    }
    return [...set].sort();
  }, [seats]);

  const partyOptions = useMemo(() => {
    if (filterResult === WON_BY) return winningParties;
    if (filterResult === LOST_BY) return losingParties;
    return contestedParties;
  }, [LOST_BY, WON_BY, contestedParties, filterResult, losingParties, winningParties]);

  useEffect(() => {
    if (!filterParty) return;
    if (partyOptions.includes(filterParty)) return;
    setFilterParty("");
  }, [filterParty, partyOptions]);

  const filteredSeats = useMemo(
    () =>
      seats.filter((seat) => {
        if (!filterParty) return true;
        if (filterResult === WON_BY) return seat.party === filterParty;
        if (filterResult === LOST_BY)
          return (seat.party_lost ?? []).includes(filterParty);
        return (
          seat.party === filterParty ||
          (seat.party_lost ?? []).includes(filterParty)
        );
      }),
    [LOST_BY, WON_BY, filterParty, filterResult, seats],
  );

  const displayedSeats = useMemo(
    () =>
      search
        ? matchSorter(filteredSeats, search, {
            keys: ["seat", "name", "party"],
          })
        : filteredSeats,
    [filteredSeats, search],
  );

  const selectedSeatObj = seats.find((s) => s.seat === selectedSeat);
  const electionLabel = e(election) || election;

  const selectSeat = (seat: OverallSeat) => {
    setSelectedSeat(seat.seat);
    fetchResult(seat.seat, seat.date);
    history.replaceState(null, "", `?result=${resultSlug(seat)}`);
  };

  useEffect(() => {
    if (filteredSeats.length === 0) return;
    if (filteredSeats.some((seat) => seat.seat === selectedSeat)) return;
    const nextSeat = filteredSeats[0];
    setSelectedSeat(nextSeat.seat);
    fetchResult(nextSeat.seat, nextSeat.date);
  }, [fetchResult, filteredSeats, selectedSeat]);

  return (
    <section className="space-y-6 py-8 lg:py-10">
      <h4 className="text-center font-heading text-heading-2xs font-bold">
        {e("header_2") || "View the full ballot for a specific seat"}
      </h4>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <InlineDropdown
            options={resultOptions}
            value={filterResult}
            onChange={(value) => {
              setFilterResult(value);
              setFilterParty("");
              setSearch("");
            }}
          />
          <InlineDropdown
            options={[
              { label: e("all_parties") || "All Parties", value: "" },
              ...partyOptions.map((party) => ({ label: party, value: party })),
            ]}
            value={filterParty}
            onChange={(value) => {
              setFilterParty(value);
              setSearch("");
            }}
          />
        </div>
      </div>

      <div className="max-h-[650px] w-full">
        <LeftRightCard
          leftBg="overflow-hidden lg:max-w-[360px] lg:w-full"
          left={
            <div className="relative flex h-fit w-full flex-col overflow-hidden bg-bg-washed px-3 pb-3 md:overflow-y-auto lg:h-[650px] lg:rounded-bl-xl lg:rounded-tl-xl lg:rounded-tr-none lg:pb-8 xl:px-6">
              <div className="sticky top-0 z-10 border-b border-otl-gray-200 pb-3 pt-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={e("search_seat") || "Search seat"}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="placeholder:text-txt-black-400 w-full rounded-lg border border-otl-gray-200 bg-bg-white py-2 pl-9 pr-3 text-body-sm text-txt-black-700 focus:outline-none focus:ring-2 focus:ring-fr-danger"
                  />
                  <svg
                    className="text-txt-black-400 pointer-events-none absolute left-2.5 top-2.5 h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="text-txt-black-400 absolute right-2.5 top-2.5 hover:text-txt-black-700"
                      aria-label={c("clear") || "Clear"}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <Drawer open={open} onOpenChange={setOpen}>
                <div className="hide-scrollbar grid h-[394px] max-w-screen-sm grid-flow-col grid-rows-3 overflow-x-auto rounded-md sm:max-w-screen-md md:max-w-screen-lg lg:flex lg:h-full lg:w-full lg:flex-col lg:overflow-y-auto lg:px-0.5">
                  {displayedSeats.map((seat) => {
                    const { majority, majority_perc, party, date } = seat;
                    const active = seat.seat === selectedSeat;
                    return (
                      <div
                        ref={(ref) => {
                          scrollRefs.current[seat.seat] = ref;
                        }}
                        key={`${seat.seat}-${date}`}
                        className="pb-px pl-px pr-3 pt-3 lg:pr-0"
                      >
                        <div
                          className={clx(
                            "flex h-full w-full flex-col gap-2 p-3 text-body-sm max-lg:w-72",
                            "bg-bg-white lg:active:bg-bg-black-100",
                            "border border-bg-black-200 lg:hover:border-bg-black-400",
                            "cursor-pointer rounded-xl focus:outline-none",
                            active &&
                              "ring-1 ring-danger-600 lg:hover:border-transparent",
                          )}
                          onClick={() => selectSeat(seat)}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-1 gap-2">
                              <span className="text-zinc-500 shrink-0 text-sm font-medium">
                                {seat.seat.slice(0, 5)}
                              </span>
                              <span className="truncate font-medium">
                                {seat.seat.slice(5)}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="text-txt-black-400 text-body-xs uppercase">
                                {toDate(date, "dd MMM yyyy", locale)}
                              </span>
                              <DrawerTrigger asChild>
                                <button
                                  type="button"
                                  className="text-zinc-500 p-0 lg:hidden"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    selectSeat(seat);
                                  }}
                                >
                                  <ArrowsPointingOutIcon className="h-4 w-4" />
                                </button>
                              </DrawerTrigger>
                            </div>
                          </div>

                          <div className="flex h-8 w-full items-center gap-1.5">
                            <PartyLogo
                              uid={seat.party_uid ?? ""}
                              name={party}
                            />
                            <span className="max-w-full truncate font-medium">{`${seat.name} `}</span>
                            <span>{`(${party})`}</span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-body-sm text-txt-black-500">
                                {c("majority") || "Majority"}
                              </p>
                              <span>
                                {majority === null
                                  ? "—"
                                  : numFormat(majority, "standard")}
                                {majority_perc === null
                                  ? " (—)"
                                  : ` (${numFormat(majority_perc, "compact", 1)}%)`}
                              </span>
                            </div>
                            <BarPerc
                              hidden
                              value={majority_perc ?? 0}
                              size="h-[5px] w-[30px] lg:w-[288px]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <DrawerContent className="h-full max-h-[calc(100%-96px)] pt-0">
                  <DrawerHeader className="flex w-full items-start gap-3 px-4 py-3">
                    {selectedSeatObj && (
                      <ResultHeader
                        seat={selectedSeatObj}
                        electionLabel={electionLabel}
                        locale={locale}
                      />
                    )}
                    <DrawerClose>
                      <XMarkIcon className="h-5 w-5 text-txt-black-500" />
                    </DrawerClose>
                  </DrawerHeader>
                  <ResultContent
                    data={result.data}
                    votes={result.votes}
                    loading={loading}
                    c={c}
                  />
                </DrawerContent>
              </Drawer>
            </div>
          }
          rightBg="lg:w-full h-[650px] w-full space-y-4.5 bg-bg-white p-6 pb-8 max-lg:hidden overflow-scroll"
          right={
            <div className="space-y-4.5">
              {selectedSeatObj && (
                <>
                  <ResultHeader
                    seat={selectedSeatObj}
                    electionLabel={electionLabel}
                    locale={locale}
                  />
                  <ResultContent
                    data={result.data}
                    votes={result.votes}
                    loading={loading}
                    c={c}
                  />
                </>
              )}
            </div>
          }
        />
      </div>
    </section>
  );
}

const InlineDropdown = ({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-fit">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex select-none items-center gap-1.5 rounded-md border bg-bg-white px-3 py-1.5 text-start text-body-sm font-medium text-txt-black-900 shadow-button outline-none hover:border-bg-black-400 active:bg-bg-black-100"
      >
        <span className="flex-grow truncate">{selected.label}</span>
        <svg
          className="-mx-[5px] h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul className="shadow-floating absolute left-0 z-20 mt-1 max-h-60 min-w-full overflow-auto rounded-md bg-bg-white text-txt-black-900 ring-1 ring-otl-gray-200 ring-opacity-5 focus:outline-none">
          {options.map((option, index) => (
            <li
              key={index}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={clx(
                "relative flex w-full cursor-default select-none items-center gap-2 py-2 pl-4 pr-4 text-txt-black-900",
                "hover:bg-bg-black-100",
              )}
            >
              <span
                className={clx(
                  "block flex-grow truncate",
                  option.value === value ? "font-medium" : "font-normal",
                )}
              >
                {option.label}
              </span>
              {option.value === value && (
                <CheckCircleIcon className="h-4 w-4 text-primary-600" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PartyLogo = ({ uid, name }: { uid: string; name: string }) => {
  const [error, setError] = useState(false);
  if (error || !uid) {
    return (
      <div className="text-txt-black-400 flex h-[18px] w-8 shrink-0 items-center justify-center border border-otl-gray-200 text-xs">
        ?
      </div>
    );
  }
  return (
    <img
      src={`/static/images/parties/${uid}.png`}
      alt={name}
      width={32}
      height={18}
      className="shrink-0 border border-otl-gray-200"
      onError={() => setError(true)}
    />
  );
};

const ResultHeader = ({
  seat,
  electionLabel,
  locale,
}: {
  seat: OverallSeat;
  electionLabel: string;
  locale: string;
}) => {
  const [area, seatState] = seat.seat.split(",");
  return (
    <div className="flex grow flex-col gap-3 uppercase">
      <div className="flex flex-wrap items-baseline gap-x-1.5 text-body-md">
        <span className="font-semibold">{electionLabel}</span>
        <span className="text-txt-black-500" aria-hidden="true">
          &middot;
        </span>
        <span className="text-txt-black-500">
          {toDate(seat.date, "dd MMM yyyy", locale)}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 text-body-md">
        <span className="font-semibold">
          {area}
          {seatState ? "," : ""}
        </span>
        {seatState && (
          <span className="font-normal text-txt-black-500">{seatState}</span>
        )}
      </div>
    </div>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={clx("h-4 animate-pulse rounded bg-bg-black-100", className)}
  />
);

const ResultContent = ({
  data,
  votes,
  loading,
  c,
}: {
  data?: BallotResult[];
  votes: VoteStat[];
  loading: boolean;
  c: (key: string) => string;
}) => (
  <div className="hide-scrollbar flex-1 space-y-6 overflow-scroll text-body-md max-md:px-4 max-md:pb-8">
    <div>
      {loading || !data ? (
        <div className="flex flex-col gap-2">
          {Array(3)
            .fill(null)
            .map((_, index) => (
              <Skeleton
                key={index}
                className={["w-48", "w-64", "w-56"][index]}
              />
            ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-body-sm">
            <colgroup>
              <col className="w-[43%]" />
              <col className="w-[26%]" />
              <col className="w-[31%]" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-otl-gray-200 font-medium">
                <th className="py-3 pr-3 text-left">
                  {c("candidate_name") || "Candidate"}
                </th>
                <th className="px-3 py-3 text-center sm:text-left">
                  {c("party_name") || "Party"}
                </th>
                <th className="py-3 pl-3 pr-4 text-left">
                  {c("votes_won") || "Votes"}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => {
                const partyLabel =
                  row.coalition && row.coalition !== "ALONE"
                    ? `${row.party} (${row.coalition})`
                    : row.party;
                return (
                  <tr key={index} className="border-b border-otl-gray-200">
                    <td
                      className={clx(
                        "min-w-0 break-words py-3 pr-3 text-left",
                        index === 0 && "font-medium",
                      )}
                    >
                      {row.name}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-center gap-1 whitespace-nowrap sm:flex-row sm:gap-1.5">
                        <PartyLogo uid={row.party_uid ?? ""} name={row.party} />
                        <span className="whitespace-nowrap text-center text-xs sm:text-left sm:text-body-sm">
                          {partyLabel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pl-3 pr-4 sm:font-['IBM_Plex_Mono','Roboto_Mono',monospace] sm:tabular-nums">
                      <div className="flex flex-col gap-2 whitespace-nowrap sm:flex-row sm:items-center sm:gap-0.5">
                        <BarPerc
                          hidden
                          value={row.votes_perc ?? 0}
                          size="h-[5px] w-[80px] sm:w-[72px]"
                        />
                        <span className="whitespace-nowrap text-xs sm:text-body-sm">
                          <span className="sm:inline-block sm:min-w-[3.75rem] sm:text-right">
                            {row.votes !== null
                              ? numFormat(row.votes, "standard")
                              : "—"}
                          </span>
                          {row.votes_perc !== null
                            ? ` (${numFormat(row.votes_perc, "compact", [1, 1])}%)`
                            : " (—)"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

    <div className="space-y-3">
      <p className="font-bold">
        {c("summary_statistics") || "Summary Statistics"}
      </p>
      {votes && votes.length > 0 && !loading ? (
        <div className="flex flex-col gap-3 text-sm">
          {votes.map(({ x, abs, perc }) => (
            <div
              key={x}
              className="flex w-[245px] flex-col gap-3 whitespace-nowrap"
            >
              <div className="flex items-center justify-between gap-3 text-body-sm text-txt-black-500">
                <p className="w-28 md:w-fit">{c(x) || x}:</p>
                <p className="text-txt-black-700">
                  {abs !== null ? numFormat(abs, "standard") : "—"}{" "}
                  {perc !== null
                    ? `(${numFormat(perc, "compact", [1, 1])}%)`
                    : "(—)"}
                </p>
              </div>
              <BarPerc hidden value={perc ?? 0} size="h-[5px] w-[245px]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          {Array(3)
            .fill(null)
            .map((_, index) => (
              <Skeleton
                key={index}
                className={["w-48", "w-64", "w-56"][index]}
              />
            ))}
        </div>
      )}
    </div>
  </div>
);
