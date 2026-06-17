import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

type ElectionRow = {
  election_name: string;
  seat: string;
  state: string;
  date: string;
  party: string;
  party_uid: string;
  coalition: string;
  name: string;
  majority: number;
  majority_perc: number | null;
  voter_turnout: number;
  voter_turnout_perc: number | null;
};

type RedelineationRow = {
  date: string;
  change_en: string;
  change_ms: string;
};

type ResultRow = ElectionRow | RedelineationRow;

type BallotEntry = {
  name: string;
  party: string;
  party_uid?: string;
  coalition?: string;
  votes: number;
  votes_perc: number | null;
  result: string;
};

type VoteStat = { x: string; abs: number | null; perc: number | null };

type ModalState = {
  open: boolean;
  loading: boolean;
  election_name: string;
  seat: string;
  state: string;
  date: string;
  ballot: BallotEntry[];
  votes: VoteStat[];
  currentIndex: number;
};

interface Props {
  results: ResultRow[];
  seatLabel: string;
  apiBase: string;
  isMalay: boolean;
  translations: { common: Record<string, any>; seats: Record<string, any> };
}

function tr(dict: Record<string, any>, key: string): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], dict);
  return typeof val === "string" ? val : "";
}

function isRedelineation(row: ResultRow): row is RedelineationRow {
  return "change_en" in row;
}

function formatElectionName(name: string, isMalay?: boolean): string {
  if (!isMalay && name === "By-Election") return "By-Elec";
  if (!isMalay) return name;
  if (name.startsWith("GE-")) return name.replace(/^GE-/, "PRU-");
  if (name.startsWith("SE-")) return name.replace(/^SE-/, "PRN-");
  if (name === "By-Election") return "PRK";
  return name;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PartyFlag({ uid, party }: { uid?: string; party: string }) {
  const [failed, setFailed] = useState(false);
  if (!uid || failed) {
    return (
      <span className="flex h-[18px] w-8 shrink-0 items-center justify-center border border-otl-gray-200 text-xs text-txt-black-400">
        ?
      </span>
    );
  }
  return (
    <img
      src={`/static/images/parties/${uid}.png`}
      alt={party}
      width={32}
      height={18}
      className="shrink-0 border border-otl-gray-200"
      onError={() => setFailed(true)}
    />
  );
}

function BarCell({ value, total = 100 }: { value: number | null; total?: number }) {
  const pct = value == null ? null : Math.min((value / total) * 100, 100);
  return (
    <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
      <div className="h-[5px] w-[72px] overflow-hidden rounded-full bg-bg-washed lg:w-[100px]">
        {pct != null && (
          <div
            className="h-full rounded-full bg-bg-black-900"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <span className="inline-block min-w-[3.75rem] whitespace-nowrap text-right font-['IBM_Plex_Mono','Roboto_Mono',monospace] tabular-nums">
        {value == null ? "—" : `${value.toFixed(1)}%`}
      </span>
    </div>
  );
}

function pctWidth(value: number | null | undefined): string {
  return `${Math.min(value ?? 0, 100)}%`;
}

function pctText(value: number | null | undefined): string {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

const electionRows = (results: ResultRow[]): ElectionRow[] =>
  results.filter((r): r is ElectionRow => !isRedelineation(r));

const monoCellClass = "font-['IBM_Plex_Mono','Roboto_Mono',monospace]";
const monoNumberClass = `${monoCellClass} tabular-nums`;
const desktopMonoNumberClass = "sm:font-['IBM_Plex_Mono','Roboto_Mono',monospace] sm:tabular-nums";

export default function SeatElectionTable({
  results,
  seatLabel,
  apiBase,
  isMalay,
  translations,
}: Props) {
  const common = translations.common ?? {};
  const seats = translations.seats ?? {};
  const c = (key: string) => tr(common, key) || key;
  const s = (key: string) => tr(seats, key) || key;

  const cache = useRef<Map<string, { ballot: BallotEntry[]; votes: VoteStat[] }>>(new Map());

  const allElections = electionRows(results);

  const [modal, setModal] = useState<ModalState>({
    open: false,
    loading: false,
    election_name: "",
    seat: "",
    state: "",
    date: "",
    ballot: [],
    votes: [],
    currentIndex: 0,
  });

  const openModal = useCallback(
    async (row: ElectionRow, index: number) => {
      const key = `${row.seat}__${row.date}`;
      setModal((prev) => ({
        ...prev,
        open: true,
        loading: !cache.current.has(key),
        election_name: row.election_name,
        seat: row.seat,
        state: row.state,
        date: formatDate(row.date),
        ballot: cache.current.get(key)?.ballot ?? [],
        votes: cache.current.get(key)?.votes ?? [],
        currentIndex: index,
      }));
      if (cache.current.has(key)) return;

      const seatWithState = row.state ? `${row.seat}, ${row.state}` : row.seat;
      try {
        const res = await fetch(
          `${apiBase}/results/${encodeURIComponent(seatWithState)}/${row.date}.json`,
        );
        if (!res.ok) throw new Error("fetch failed");
        const { ballot, stats: [s0 = {}] } = await res.json();
        const result = {
          ballot: ballot ?? [],
          votes: [
            { x: "majority", abs: s0.majority ?? null, perc: s0.majority_perc ?? null },
            { x: "voter_turnout", abs: s0.voter_turnout ?? null, perc: s0.voter_turnout_perc ?? null },
            { x: "rejected_votes", abs: s0.votes_rejected ?? null, perc: s0.votes_rejected_perc ?? null },
          ],
        };
        cache.current.set(key, result);
        setModal((prev) =>
          prev.open && prev.seat === row.seat && prev.date === formatDate(row.date)
            ? { ...prev, loading: false, ballot: result.ballot, votes: result.votes }
            : prev,
        );
      } catch {
        setModal((prev) => ({ ...prev, loading: false }));
      }
    },
    [apiBase],
  );

  const navigateModal = useCallback(
    (dir: -1 | 1) => {
      const next = allElections[modal.currentIndex + dir];
      if (!next) return;
      openModal(next, modal.currentIndex + dir);
    },
    [modal.currentIndex, allElections, openModal],
  );

  return (
    <>
      {/* Mobile: compact card list, matching candidate/party pages */}
      <div className="-mx-4.5 divide-y divide-otl-gray-200 border-y border-otl-gray-200 md:mx-0 md:hidden">
        {results.map((row, i) => {
          if (isRedelineation(row)) {
            const msg = isMalay ? row.change_ms : row.change_en;
            return (
              <div key={i} className="bg-bg-washed px-4.5 py-3 text-center text-body-sm italic text-txt-black-700">
                {msg}
              </div>
            );
          }
          const electionIdx = allElections.indexOf(row);
          return (
            <div key={i} className="space-y-3 px-4.5 py-4 text-body-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-body-sm font-medium leading-snug text-txt-black-900">
                  {formatElectionName(row.election_name, isMalay)} ({new Date(row.date).getFullYear()}) • {row.seat}
                </p>
                <button
                  onClick={() => openModal(row, electionIdx)}
                  className="flex shrink-0 items-center gap-1.5 text-body-sm font-medium text-txt-black-700"
                  aria-label={c("full_result") || "Details"}
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                <PartyFlag uid={row.party_uid} party={row.party} />
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className="min-w-0 truncate font-medium text-txt-black-900" title={row.name}>{row.name}</span>
                  <span className="shrink-0 text-txt-black-500">
                    ({row.coalition && row.coalition !== "ALONE" ? `${row.party} / ${row.coalition}` : row.party})
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-txt-black-500">{c("majority") || "Majority"}:</span>
                  <div className="h-[5px] w-[40px] overflow-hidden rounded-full bg-bg-washed">
                    {row.majority_perc != null && (
                      <div className="h-full rounded-full bg-bg-black-900" style={{ width: pctWidth(row.majority_perc) }} />
                    )}
                  </div>
                  <span>{pctText(row.majority_perc)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-txt-black-500">{c("voter_turnout") || "Voter Turnout"}:</span>
                  <div className="h-[5px] w-[40px] overflow-hidden rounded-full bg-bg-washed">
                    {row.voter_turnout_perc != null && (
                      <div className="h-full rounded-full bg-bg-black-900" style={{ width: pctWidth(row.voter_turnout_perc) }} />
                    )}
                  </div>
                  <span>{pctText(row.voter_turnout_perc)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: production table vocabulary */}
      <div className="hidden md:block">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b-2 border-otl-gray-200 font-medium text-txt-black-700">
              <th className="whitespace-nowrap py-3 pl-3 pr-2 lg:pl-4 lg:pr-3">{c("election_name") || "Election"}</th>
              <th className="whitespace-nowrap px-2 py-3 lg:px-3">{c("constituency") || "Constituency"}</th>
              <th className="whitespace-nowrap px-2 py-3 lg:px-3">{c("winning_party") || "Winning Party"}</th>
              <th className="w-full max-w-0 whitespace-nowrap px-2 py-3 lg:px-3">{c("candidate_name") || "Candidate"}</th>
              <th className="whitespace-nowrap px-2 py-3 lg:px-3">{c("majority") || "Majority"}</th>
              <th className="whitespace-nowrap px-2 py-3 lg:px-3">{c("voter_turnout") || "Voter Turnout"}</th>
              <th className="whitespace-nowrap px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => {
              if (isRedelineation(row)) {
                const msg = isMalay ? row.change_ms : row.change_en;
                return (
                  <tr key={i}>
                    <td
                      colSpan={7}
                      className="border-b border-otl-gray-200 bg-bg-washed p-3 text-center text-body-sm italic text-txt-black-700"
                    >
                      {msg}
                    </td>
                  </tr>
                );
              }
              const electionIdx = allElections.indexOf(row);
              return (
                <tr key={i} className="border-b border-otl-gray-200 hover:bg-bg-black-50">
                  <td className={`whitespace-nowrap py-[11px] pl-3 pr-2 lg:pl-4 lg:pr-3 ${monoCellClass}`}>
                    {formatElectionName(row.election_name, isMalay)}
                    <span className="ml-1">({new Date(row.date).getFullYear()})</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-[11px] text-txt-black-700 lg:px-3">
                    {row.seat}
                  </td>
                  <td className="whitespace-nowrap px-2 py-[11px] lg:px-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <PartyFlag uid={row.party_uid} party={row.party} />
                      <span>
                        {row.coalition && row.coalition !== "ALONE"
                          ? `${row.party} (${row.coalition})`
                          : row.party}
                      </span>
                    </div>
                  </td>
                  <td className="w-full max-w-0 px-2 py-[11px] text-txt-black-700 lg:px-3">
                    <span className="block truncate" title={row.name}>{row.name}</span>
                  </td>
                  <td className={`px-2 py-[11px] lg:px-3 ${monoNumberClass}`}>
                    <BarCell value={row.majority_perc} />
                  </td>
                  <td className={`px-2 py-[11px] lg:px-3 ${monoNumberClass}`}>
                    <BarCell value={row.voter_turnout_perc} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button
                      onClick={() => openModal(row, electionIdx)}
                      className="flex items-center gap-1.5 text-body-sm font-medium text-txt-black-700"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      {c("full_result") || "Details"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Full ballot modal */}
      {modal.open &&
        createPortal(
          <>
            <style>{`
              @keyframes modal-slide-up {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
              @keyframes modal-fade-in {
                from { opacity: 0; transform: scale(0.97); }
                to { opacity: 1; transform: scale(1); }
              }
              .seat-modal-panel {
                animation: modal-slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1) both;
              }
              @media (min-width: 640px) {
                .seat-modal-panel {
                  animation: modal-fade-in 0.18s ease-out both;
                }
              }
            `}</style>
            <div
              className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="absolute inset-0 bg-[#000]/80"
                onClick={() => setModal((prev) => ({ ...prev, open: false }))}
              />
              <div className="seat-modal-panel relative z-10 flex max-h-[calc(100%-40px)] w-full flex-col overflow-hidden rounded-t-2xl bg-bg-white shadow-xl sm:max-w-4xl sm:rounded-xl">
                {/* Header */}
                <div className="flex flex-col gap-3 px-4 pb-0 pt-4 uppercase sm:px-6 sm:pb-2 sm:pt-5">
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 text-body-md">
                        <span className="font-semibold">
                          {formatElectionName(modal.election_name, isMalay)}
                        </span>
                        <span className="text-txt-black-500" aria-hidden="true">&middot;</span>
                        <span className="text-txt-black-500">{modal.date}</span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-2 text-body-md">
                        <span className="font-semibold">
                          {modal.seat}
                          {modal.state ? "," : ""}
                        </span>
                        {modal.state && (
                          <span className="font-normal text-txt-black-500">{modal.state}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setModal((prev) => ({ ...prev, open: false }))}
                      className="shrink-0 rounded-sm p-1 text-txt-black-500 opacity-70 hover:opacity-100"
                      aria-label="Close"
                    >
                      <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-8 pt-2 text-body-md sm:px-6 sm:pt-2">
                  {modal.loading ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-txt-danger border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      {/* Ballot table */}
                      {modal.ballot.length > 0 && (
                        <div>
                          <table className="w-full table-fixed text-body-sm">
                            <colgroup>
                              <col className="w-[43%]" />
                              <col className="w-[26%]" />
                              <col className="w-[31%]" />
                            </colgroup>
                            <thead>
                              <tr className="border-b-2 border-otl-gray-200 font-medium">
                                <th className="py-3 pr-3 text-left">{c("candidate_name") || "Candidate"}</th>
                                <th className="px-3 py-3 text-center sm:text-left">{c("party_name") || "Party"}</th>
                                <th className="py-3 pl-3 pr-4 text-left">{c("votes_won") || "Votes"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modal.ballot.map((entry, i) => (
                                  <tr
                                    key={i}
                                    className="border-b border-otl-gray-200"
                                  >
                                  <td
                                    className="min-w-0 break-words py-3 pr-3 text-left"
                                    style={{ overflowWrap: "anywhere", whiteSpace: "normal" }}
                                  >
                                    {entry.name}
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="flex flex-col items-center gap-1 whitespace-nowrap sm:flex-row sm:items-center sm:gap-1.5">
                                      <PartyFlag uid={entry.party_uid} party={entry.party} />
                                      <span className="whitespace-nowrap text-center text-xs sm:text-left sm:text-body-sm">
                                        {entry.coalition && entry.coalition !== "ALONE"
                                          ? `${entry.party} (${entry.coalition})`
                                          : entry.party}
                                      </span>
                                    </div>
                                  </td>
                                  <td className={`py-3 pl-3 pr-4 ${desktopMonoNumberClass}`}>
                                    <div className="flex flex-col gap-2 whitespace-nowrap sm:flex-row sm:items-center sm:gap-0.5">
                                      <div className="h-[5px] w-[80px] shrink-0 overflow-x-hidden rounded-full bg-bg-washed sm:w-[72px]">
                                        <div
                                          className="h-full overflow-hidden rounded-full bg-bg-black-900"
                                          style={{ width: pctWidth(entry.votes_perc) }}
                                        />
                                      </div>
                                      <span className="whitespace-nowrap text-xs sm:text-body-sm">
                                        <span className="sm:inline-block sm:min-w-[3.75rem] sm:text-right">
                                          {entry.votes.toLocaleString()}
                                        </span>
                                        <span>{` (${pctText(entry.votes_perc)})`}</span>
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Voting stats */}
                      {modal.votes.length > 0 && (
                        <div className="space-y-3">
                          <p className="font-bold">{c("summary_statistics") || "Summary Statistics"}</p>
                          <div className="flex flex-col gap-3 text-sm">
                            {modal.votes.map(({ x, abs, perc }) => (
                              <div key={x} className="flex w-[245px] flex-col gap-3 whitespace-nowrap">
                                <div className="flex items-center justify-between gap-3 text-body-sm text-txt-black-500">
                                  <span className="w-28 md:w-fit">
                                    {c(x) || x.replace(/_/g, " ")}:
                                  </span>
                                  <span className="text-txt-black-700">
                                    {abs?.toLocaleString() ?? "—"}{" "}
                                    {`(${pctText(perc)})`}
                                  </span>
                                </div>
                                {perc != null && (
                                  <div className="h-[5px] w-[245px] overflow-x-hidden rounded-full bg-bg-washed">
                                    <div
                                      className="h-full overflow-hidden rounded-full bg-bg-black-900"
                                      style={{ width: `${Math.min(perc, 100)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Prev/next navigation */}
                {allElections.length > 1 && (
                <div className="flex shrink-0 items-center justify-center gap-4 px-6 py-4 text-body-sm font-medium">
                  <button
                    onClick={() => navigateModal(-1)}
                    disabled={modal.currentIndex <= 0}
                    className="flex items-center gap-1.5 rounded-md border border-otl-gray-200 px-3 py-1.5 text-txt-black-700 hover:bg-bg-black-50 disabled:opacity-40"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                    </svg>
                    {c("previous") || "Previous"}
                  </button>
                  <span className="text-txt-black-900">
                    {modal.currentIndex + 1} of {allElections.length}
                  </span>
                  <button
                    onClick={() => navigateModal(1)}
                    disabled={modal.currentIndex >= allElections.length - 1}
                    className="flex items-center gap-1.5 rounded-md border border-otl-gray-200 px-3 py-1.5 text-txt-black-700 hover:bg-bg-black-50 disabled:opacity-40"
                  >
                    {c("next") || "Next"}
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
