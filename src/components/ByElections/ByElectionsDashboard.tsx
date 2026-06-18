import { useData } from "@hooks/useData";
import { useCache } from "@hooks/useCache";
import BarPerc from "@charts/bar-perc";
import LeftRightCard from "@components/LeftRightCard";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTrigger,
} from "@components/Drawer";
import Container from "@components/Container";
import SectionGrid from "@components/Section/section-grid";
import { clx, numFormat, toDate } from "@lib/helpers";
import { CountryAndStates, STATES, MALAYSIA } from "@lib/constants";
import { ArrowsPointingOutIcon, ChevronDownIcon, EyeIcon } from "@heroicons/react/20/solid";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { matchSorter } from "match-sorter";
import { FunctionComponent, useEffect, useRef, useState } from "react";

export type ByElectionSeat = {
  seat: string;
  state: string;
  date: string;
  party: string;
  party_uid: string;
  coalition: string;
  coalition_uid: number;
  name: string;
  majority: number;
  majority_perc: number;
  voter_turnout: number;
  voter_turnout_perc: number;
  votes_rejected: number;
  votes_rejected_perc: number;
};

type BallotEntry = {
  name: string;
  party: string;
  party_uid?: string;
  coalition?: string;
  votes: number;
  votes_perc: number;
  result: string;
};

type VoteStat = { x: string; abs: number; perc: number };

interface ByElectionsDashboardProps {
  seats: ByElectionSeat[];
  translations: { common: Record<string, any>; byelections: Record<string, any> };
  apiBaseUrl: string;
  locale: string;
}

function tFrom(dict: Record<string, any>, key: string, vars?: Record<string, string | number>): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], dict) ?? key;
  let result = String(val);
  if (vars) result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
  return result;
}

const toSlug = (s: ByElectionSeat) => {
  const year = new Date(s.date).getFullYear();
  const seatSlug = s.seat.toLowerCase().replace(/,/g, "").replace(/\./g, "").replace(/\s+/g, "-");
  return `${seatSlug}-${year}`;
};

const getStateCode = (state: string) =>
  state in CountryAndStates
    ? state
    : (Object.entries(CountryAndStates).find(([, name]) => name === state)?.[0] ?? state);

const stateOptions = [MALAYSIA, ...STATES].map(s => ({ label: s.name as string, value: s.key as string }));

const ByElectionsDashboard: FunctionComponent<ByElectionsDashboardProps> = ({
  seats,
  translations,
  apiBaseUrl,
  locale,
}) => {
  const c = (key: string, vars?: Record<string, string | number>) => tFrom(translations.common, key, vars);
  const b = (key: string, vars?: Record<string, string | number>) => tFrom(translations.byelections, key, vars);

  const { cache } = useCache();
  const scrollRef = useRef<Record<string, HTMLDivElement | null>>({});

  const [views, setViews] = useState<number | null>(null);
  const [viewsLoading, setViewsLoading] = useState(true);

  useEffect(() => {
    const token = import.meta.env.PUBLIC_TINYBIRD_TOKEN;
    const baseUrl = import.meta.env.PUBLIC_API_URL_TB;
    if (!token || !baseUrl) { setViewsLoading(false); return; }
    fetch(
      `${baseUrl}/v0/pipes/views_by_page.json?token=${token}&page_id=/byelections`,
    )
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setViews(d?.data?.[0]?.hits ?? null))
      .catch(() => setViews(null))
      .finally(() => setViewsLoading(false));
  }, []);

  const statesWithByelections = Array.from(new Set(seats.map(s => getStateCode(s.state))));
  const filteredStateOptions = stateOptions.filter(
    o => o.value === "mys" || statesWithByelections.includes(o.value),
  );

  const { data, setData } = useData({
    seat: seats[0]?.seat ?? "",
    search: "",
    loading: false,
    results: { data: undefined as BallotEntry[] | undefined, votes: [] as VoteStat[] },
    filterState: "mys",
    open: false,
  });

  const filteredSeats =
    !data.filterState || data.filterState === "mys"
      ? seats
      : seats.filter(s => getStateCode(s.state) === data.filterState);

  const displayedSeats = data.search
    ? matchSorter(filteredSeats, data.search, { keys: ["seat"] })
    : filteredSeats;

  const fetchSeatResult = async (seat: string, date: string) => {
    const key = `byelection-${seat}-${date}`;
    if (cache.has(key)) {
      setData("results", cache.get(key));
      return;
    }
    setData("loading", true);
    try {
      const res = await fetch(`${apiBaseUrl}/results/${encodeURIComponent(seat)}/${date}.json`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { ballot, stats: [stats] } = await res.json();
      const results: typeof data.results = {
        data: ballot,
        votes: [
          { x: "majority", abs: stats.majority, perc: stats.majority_perc },
          { x: "voter_turnout", abs: stats.voter_turnout, perc: stats.voter_turnout_perc },
          { x: "rejected_votes", abs: stats.votes_rejected, perc: stats.votes_rejected_perc },
        ],
      };
      cache.set(key, results);
      setData("results", results);
    } catch {
      // non-fatal — panel stays empty
    } finally {
      setData("loading", false);
    }
  };

  useEffect(() => {
    if (seats.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const resultParam = params.get("result");
    const initial = resultParam
      ? (seats.find(s => toSlug(s) === resultParam) ?? seats[0])
      : seats[0];
    setData("seat", initial.seat);
    fetchSeatResult(initial.seat, initial.date);
    if (resultParam) {
      setTimeout(() => {
        scrollRef.current[initial.seat]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSeat = (s: ByElectionSeat) => {
    setData("seat", s.seat);
    fetchSeatResult(s.seat, s.date);
    history.replaceState(null, "", `?result=${toSlug(s)}`);
  };

  const selectedSeat = seats.find(s => s.seat === data.seat);

  return (
    <>
      {/* ─── HERO ─── */}
      <Container
        as="section"
        background="bg-gradient-radial from-bg-danger-100 to-bg-white"
        className="relative"
      >
        <SectionGrid>
          <div className="flex max-w-[727px] flex-col items-center justify-center space-y-4 pb-8 pt-16 lg:space-y-6">
            <h1 className="text-center font-heading text-heading-sm font-semibold text-txt-black-900 lg:text-start lg:text-heading-md">
              {b("hero.header")}
            </h1>
            <p className="w-full whitespace-pre-line text-center text-body-sm text-txt-black-700 lg:text-body-md">
              {b("hero.description", { count: seats.length })}
            </p>
            <p className="flex gap-0.5 text-body-sm text-txt-black-500">
              <EyeIcon className="h-4.5 w-4.5 self-center" />
              {viewsLoading
                ? "..."
                : views !== null
                  ? `${numFormat(views, "standard")} ${views === 1 ? c("views_one") : c("views_other")}`
                  : "---"}
            </p>
          </div>
        </SectionGrid>
      </Container>

      {/* ─── MAIN CONTENT ─── */}
      <Container as="section">
        <SectionGrid className="space-y-6 py-2 pb-16 lg:space-y-12 lg:pb-16">
          {/* State filter */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-center gap-2">
              <StateDropdown
                options={filteredStateOptions}
                value={data.filterState}
                onChange={newState => {
                  setData("filterState", newState);
                  setData("search", "");
                  const newFiltered =
                    newState === "mys"
                      ? seats
                      : seats.filter(s => getStateCode(s.state) === newState);
                  if (newFiltered.length > 0) selectSeat(newFiltered[0]);
                }}
              />
            </div>
          </div>

          {/* Left-right card */}
          <div className="max-h-[650px] w-full">
            <LeftRightCard
              leftBg="overflow-hidden lg:max-w-[360px] lg:w-full"
              left={
                <div className="relative flex h-fit w-full flex-col overflow-hidden bg-bg-washed px-3 pb-3 md:overflow-y-auto lg:h-[650px] lg:rounded-bl-xl lg:rounded-tl-xl lg:rounded-tr-none lg:pb-8 xl:px-6">
                  {/* Search */}
                  <div className="sticky top-0 z-10 border-b border-otl-gray-200 pb-3 pt-6">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={b("search_seat")}
                        value={data.search}
                        onChange={e => setData("search", e.target.value)}
                        className="w-full rounded-lg border border-otl-gray-200 bg-bg-white py-2 pl-9 pr-3 text-body-sm text-txt-black-700 placeholder:text-txt-black-400 focus:outline-none focus:ring-2 focus:ring-fr-danger"
                      />
                      <svg
                        className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-txt-black-400"
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
                      {data.search && (
                        <button
                          onClick={() => setData("search", "")}
                          className="absolute right-2.5 top-2.5 text-txt-black-400 hover:text-txt-black-700"
                          aria-label={c("clear")}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Seat list */}
                  <Drawer open={data.open} onOpenChange={open => setData("open", open)}>
                    <div className="hide-scrollbar grid h-[394px] max-w-screen-sm grid-flow-col grid-rows-3 overflow-x-auto rounded-md sm:max-w-screen-md md:max-w-screen-lg lg:flex lg:h-full lg:w-full lg:flex-col lg:overflow-y-auto lg:px-0.5">
                      {displayedSeats.map(_seat => {
                        const { seat, name, majority, majority_perc, party, date } = _seat;
                        const active = seat === data.seat;
                        return (
                          <div
                            ref={ref => { scrollRef.current[seat] = ref; }}
                            key={`${seat}-${date}`}
                            className="pb-px pl-px pr-3 pt-3 lg:pr-0"
                          >
                            <div
                              className={clx(
                                "flex h-full w-full flex-col gap-2 p-3 text-body-sm max-lg:w-72",
                                "bg-bg-white lg:active:bg-bg-black-100",
                                "border border-bg-black-200 lg:hover:border-bg-black-400",
                                "cursor-pointer rounded-xl focus:outline-none",
                                active && "ring-1 ring-danger-600 lg:hover:border-transparent",
                              )}
                              onClick={() => selectSeat(_seat)}
                            >
                              <div className="flex w-full items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 gap-2">
                                  <span className="text-zinc-500 shrink-0 text-sm font-medium">
                                    {seat.slice(0, 5)}
                                  </span>
                                  <span className="truncate font-medium">{seat.slice(5)}</span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <span className="text-txt-black-400 text-body-xs uppercase">
                                    {toDate(date, "dd MMM yyyy", locale)}
                                  </span>
                                  <DrawerTrigger asChild>
                                    <button
                                      type="button"
                                      className="text-zinc-500 p-0 lg:hidden"
                                      onClick={e => { e.stopPropagation(); selectSeat(_seat); }}
                                    >
                                      <ArrowsPointingOutIcon className="h-4 w-4" />
                                    </button>
                                  </DrawerTrigger>
                                </div>
                              </div>

                              <div className="flex h-8 w-full items-center gap-1.5">
                                <PartyLogo uid={_seat.party_uid} name={party} />
                                <span className="max-w-full truncate font-medium">{`${name} `}</span>
                                <span>{`(${party})`}</span>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <p className="text-body-sm text-txt-black-500">{c("majority")}</p>
                                  <span>
                                    {majority === null ? "—" : numFormat(majority, "standard")}
                                    {majority_perc === null
                                      ? " (—)"
                                      : ` (${numFormat(majority_perc, "compact", 1)}%)`}
                                  </span>
                                </div>
                                <BarPerc hidden value={majority_perc} size="h-[5px] w-[30px] lg:w-[288px]" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mobile drawer */}
                    <DrawerContent className="h-full max-h-[calc(100%-96px)] pt-0">
                      <DrawerHeader className="flex w-full items-start gap-3 px-4 py-3">
                        {selectedSeat && <ResultHeader seat={selectedSeat} locale={locale} b={b} />}
                        <DrawerClose>
                          <XMarkIcon className="h-5 w-5 text-txt-black-500" />
                        </DrawerClose>
                      </DrawerHeader>
                      <ResultContent
                        data={data.results.data}
                        votes={data.results.votes}
                        loading={data.loading}
                        c={c}
                      />
                    </DrawerContent>
                  </Drawer>
                </div>
              }
              rightBg="lg:w-full h-[650px] w-full space-y-4.5 bg-bg-white p-6 pb-8 max-lg:hidden overflow-scroll"
              right={
                <div className="space-y-4.5">
                  {data.results.data && data.results.data.length > 0 && selectedSeat && (
                    <>
                      <ResultHeader seat={selectedSeat} locale={locale} b={b} />
                      <ResultContent
                        data={data.results.data}
                        votes={data.results.votes}
                        loading={data.loading}
                        c={c}
                      />
                    </>
                  )}
                </div>
              }
            />
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

// ─── State dropdown ───────────────────────────────────────────────────────────

const StateDropdown = ({
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
  const selected = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-fit">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-md border bg-bg-white px-3 py-1.5 text-start text-body-sm font-medium text-txt-black-900 shadow-button outline-none select-none active:bg-bg-black-100 hover:border-bg-black-400"
      >
        <img
          src={`/static/images/states/${selected.value}.jpeg`}
          width={20}
          height={12}
          alt={selected.label}
          className="self-center"
        />
        <span className="flex-grow truncate">{selected.label}</span>
        <ChevronDownIcon className="-mx-[5px] h-5 w-5" />
      </button>
      {open && (
        <ul className="shadow-floating absolute left-0 z-20 mt-1 max-h-60 min-w-full overflow-auto rounded-md bg-bg-white text-txt-black-900 ring-1 ring-otl-gray-200 ring-opacity-5 focus:outline-none">
          {options.map((option, i) => (
            <li
              key={i}
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={clx(
                "relative flex w-full cursor-default select-none items-center gap-2 py-2 pl-4 pr-4 text-txt-black-900",
                "hover:bg-bg-black-100",
              )}
            >
              <img
                src={`/static/images/states/${option.value}.jpeg`}
                width={20}
                height={12}
                alt={option.label}
              />
              <span
                className={clx(
                  "block flex-grow truncate",
                  option.value === value ? "font-medium" : "font-normal",
                )}
              >
                {option.label}
              </span>
              {option.value === value && <CheckCircleIcon className="h-4 w-4 text-primary-600" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PartyLogo = ({ uid, name }: { uid: string; name: string }) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      imgRef.current.naturalWidth === 0 ? setError(true) : setLoaded(true);
    }
  }, []);

  if (error || !uid) {
    return (
      <span className="text-txt-black-400 flex h-4 w-8 shrink-0 items-center justify-center outline outline-1 outline-otl-gray-200 text-xs">
        ?
      </span>
    );
  }
  return (
    <span className="text-txt-black-400 relative flex h-4 w-8 shrink-0 items-center justify-center outline outline-1 outline-otl-gray-200 text-xs">
      ?
      <img
        ref={imgRef}
        src={`/static/images/parties/${uid}.png`}
        alt={name}
        width={32}
        height={16}
        className={`absolute inset-0 h-full w-full object-contain ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </span>
  );
};

// ─── Result panel header ──────────────────────────────────────────────────────

const ResultHeader = ({
  seat,
  locale,
  b,
}: {
  seat: ByElectionSeat;
  locale: string;
  b: (key: string, vars?: Record<string, string | number>) => string;
}) => {
  const [area, state] = seat.seat.split(",");
  return (
    <div className="flex grow flex-col gap-3 uppercase">
      <div className="flex flex-wrap items-baseline gap-x-1.5 text-body-md">
        <span className="font-semibold">{b("election_name")}</span>
        <span className="text-txt-black-500" aria-hidden="true">&middot;</span>
        <span className="text-txt-black-500">{toDate(seat.date, "dd MMM yyyy", locale)}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 text-body-md">
        <span className="font-semibold">
          {area}
          {state ? "," : ""}
        </span>
        {state && <span className="font-normal text-txt-black-500">{state}</span>}
      </div>
    </div>
  );
};

// ─── Candidate table + voting stats ──────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={clx("h-4 animate-pulse rounded bg-bg-black-100", className)} />
);

const ResultContent = ({
  data,
  votes,
  loading,
  c,
}: {
  data?: BallotEntry[];
  votes: VoteStat[];
  loading: boolean;
  c: (key: string, vars?: Record<string, string | number>) => string;
}) => (
  <div className="hide-scrollbar flex-1 space-y-6 overflow-scroll text-body-md max-md:px-4 max-md:pb-8">
    {/* Candidate table */}
    <div>
      {loading || !data ? (
        <div className="flex flex-col gap-2">
          {Array(3).fill(null).map((_, i) => <Skeleton key={i} className={["w-48", "w-64", "w-56"][i]} />)}
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
                <th className="py-3 pr-3 text-left">{c("candidate_name")}</th>
                <th className="px-3 py-3 text-center sm:text-left">{c("party_name")}</th>
                <th className="py-3 pl-3 pr-4 text-left">{c("votes_won")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const partyLabel = row.coalition && row.coalition !== "ALONE"
                  ? `${row.party} (${row.coalition})`
                  : row.party;
                return (
                  <tr key={i} className="border-b border-otl-gray-200">
                    <td className={clx("min-w-0 break-words py-3 pr-3 text-left", i === 0 && "font-medium")}>
                      {row.name}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-center gap-1 whitespace-nowrap sm:flex-row sm:gap-2">
                        <PartyLogo uid={row.party_uid ?? ""} name={row.party} />
                        <span className="whitespace-nowrap text-center text-xs sm:text-left sm:text-body-sm">
                          {partyLabel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pl-3 pr-4 sm:font-['IBM_Plex_Mono','Roboto_Mono',monospace] sm:tabular-nums">
                      <div className="flex flex-col gap-2 whitespace-nowrap sm:flex-row sm:items-center sm:gap-0.5">
                        <BarPerc hidden value={row.votes_perc} size="h-[5px] w-[80px] sm:w-[72px]" />
                        <span className="whitespace-nowrap text-xs sm:text-body-sm">
                          <span className="sm:inline-block sm:min-w-[3.75rem] sm:text-right">
                            {row.votes !== null ? numFormat(row.votes, "standard") : "—"}
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

    {/* Summary statistics */}
    <div className="space-y-3">
      <p className="font-bold">{c("summary_statistics")}</p>
      {votes && votes.length > 0 && !loading ? (
        <div className="flex flex-col gap-3 text-sm">
          {votes.map(({ x, abs, perc }) => (
            <div key={x} className="flex w-[245px] flex-col gap-3 whitespace-nowrap">
              <div className="flex items-center justify-between gap-3 text-body-sm text-txt-black-500">
                <p className="w-28 md:w-fit">{c(x)}:</p>
                <p className="text-txt-black-700">
                  {abs !== null ? numFormat(abs, "standard") : "—"}{" "}
                  {perc !== null ? `(${numFormat(perc, "compact", [1, 1])}%)` : "(—)"}
                </p>
              </div>
              <BarPerc hidden value={perc} size="h-[5px] w-[245px]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          {Array(3).fill(null).map((_, i) => (
            <Skeleton key={i} className={["w-48", "w-64", "w-56"][i]} />
          ))}
        </div>
      )}
    </div>
  </div>
);

export default ByElectionsDashboard;
