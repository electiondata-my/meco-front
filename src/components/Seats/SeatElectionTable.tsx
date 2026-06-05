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
  majority_perc: number;
  voter_turnout: number;
  voter_turnout_perc: number;
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
  votes_perc: number;
  result: string;
};

type VoteStat = { x: string; abs: number; perc: number };

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
  if (!isMalay) return name;
  if (name.startsWith("GE-")) return name.replace(/^GE-/, "PRU-");
  if (name.startsWith("SE-")) return name.replace(/^SE-/, "PRN-");
  if (name === "By-Election") return "PRK";
  return name;
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
  if (value === null || value === undefined) {
    return <span className="text-body-xs text-txt-black-400">—</span>;
  }
  const pct = Math.min((value / total) * 100, 100);
  return (
    <div className="space-y-1">
      <p className="tabular-nums text-body-xs">
        {value.toFixed(1)}%
      </p>
      <div className="h-[5px] w-[50px] overflow-hidden rounded-full bg-bg-washed">
        <div
          className="h-full rounded-full bg-bg-black-900"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const electionRows = (results: ResultRow[]): ElectionRow[] =>
  results.filter((r): r is ElectionRow => !isRedelineation(r));

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
        date: row.date,
        ballot: cache.current.get(key)?.ballot ?? [],
        votes: cache.current.get(key)?.votes ?? [],
        currentIndex: index,
      }));
      if (cache.current.has(key)) return;

      try {
        const res = await fetch(
          `${apiBase}/results/${encodeURIComponent(row.seat)}/${row.date}.json`,
        );
        if (!res.ok) throw new Error("fetch failed");
        const { ballot, summary } = await res.json();
        const s0 = summary?.[0] ?? {};
        const result = {
          ballot: ballot ?? [],
          votes: [
            { x: "majority", abs: s0.majority ?? 0, perc: s0.majority_perc ?? 0 },
            { x: "voter_turnout", abs: s0.voter_turnout ?? 0, perc: s0.voter_turnout_perc ?? 0 },
            { x: "rejected_votes", abs: s0.votes_rejected ?? 0, perc: s0.votes_rejected_perc ?? 0 },
          ],
        };
        cache.current.set(key, result);
        setModal((prev) =>
          prev.open && prev.seat === row.seat && prev.date === row.date
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
      <div className="w-full overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-otl-gray-200 text-left text-body-xs font-medium text-txt-black-500">
              <th className="py-3 pl-4 pr-3 whitespace-nowrap">{c("election_name") || "Election"}</th>
              <th className="px-3 py-3 whitespace-nowrap">{c("constituency") || "Constituency"}</th>
              <th className="px-3 py-3 whitespace-nowrap">{c("winning_party") || "Winning Party"}</th>
              <th className="px-3 py-3 whitespace-nowrap">{c("candidate_name") || "Candidate"}</th>
              <th className="px-3 py-3 whitespace-nowrap">{c("majority") || "Majority"}</th>
              <th className="px-3 py-3 whitespace-nowrap">{c("voter_turnout") || "Voter Turnout"}</th>
              <th className="py-3 pl-3 pr-4" />
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => {
              if (isRedelineation(row)) {
                const msg = isMalay ? row.change_ms : row.change_en;
                return (
                  <tr key={i} className="bg-bg-washed">
                    <td
                      colSpan={7}
                      className="py-3 pl-4 pr-4 text-body-xs italic text-txt-black-500"
                    >
                      {msg}
                    </td>
                  </tr>
                );
              }
              const electionIdx = allElections.indexOf(row);
              return (
                <tr key={i} className="border-b border-otl-gray-200 last:border-0">
                  <td className="py-3 pl-4 pr-3 whitespace-nowrap font-medium">
                    {formatElectionName(row.election_name, isMalay)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-txt-black-700">
                    {row.seat}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <PartyFlag uid={row.party_uid} party={row.party} />
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{row.party}</p>
                        {row.coalition && row.coalition !== "ALONE" && (
                          <p className="text-body-xs text-txt-black-500">{row.coalition}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-txt-black-700">{row.name}</td>
                  <td className="px-3 py-3">
                    <BarCell value={row.majority_perc} />
                  </td>
                  <td className="px-3 py-3">
                    <BarCell value={row.voter_turnout_perc} />
                  </td>
                  <td className="py-3 pl-3 pr-4">
                    <button
                      onClick={() => openModal(row, electionIdx)}
                      className="flex items-center gap-1 whitespace-nowrap rounded-md border border-otl-gray-200 px-2.5 py-1.5 text-body-xs font-medium text-txt-black-700 hover:bg-bg-washed"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v11.5A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V4.25A2.25 2.25 0 0 0 15.75 2H4.25ZM15 5.75a.75.75 0 0 0-1.5 0v8.5a.75.75 0 0 0 1.5 0v-8.5Zm-8.5 6a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0v-2.5ZM8.584 9a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 8.584 9Zm3.58-1.25a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-6.5Z" clipRule="evenodd" />
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
                className="absolute inset-0 bg-black/80"
                onClick={() => setModal((prev) => ({ ...prev, open: false }))}
              />
              <div className="seat-modal-panel relative z-10 flex max-h-[calc(100%-40px)] w-full flex-col overflow-hidden rounded-t-2xl bg-bg-white shadow-xl sm:max-w-4xl sm:rounded-xl">
                {/* Header */}
                <div className="flex flex-col gap-3 px-4 pb-0 pt-4 sm:px-6 sm:pb-2 sm:pt-5">
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 text-body-md">
                        <span className="font-semibold">
                          {formatElectionName(modal.election_name, isMalay)}
                        </span>
                        <span className="text-txt-black-500" aria-hidden="true">&middot;</span>
                        <span className="text-txt-black-500">{modal.date}</span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-2 text-body-md">
                        <span className="font-semibold">{modal.seat}</span>
                        {modal.state && (
                          <span className="text-txt-black-500">{modal.state}</span>
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
                <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6 pt-3 sm:px-6">
                  {modal.loading ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-otl-gray-200 border-t-txt-danger" />
                    </div>
                  ) : (
                    <>
                      {/* Vote stats */}
                      {modal.votes.length > 0 && (
                        <div className="flex flex-wrap gap-6">
                          {modal.votes.map((v) => (
                            <div key={v.x} className="flex flex-col gap-1">
                              <p className="text-body-xs font-medium text-txt-black-500 uppercase tracking-wide">
                                {c(v.x) || v.x}
                              </p>
                              <p className="text-body-md font-semibold tabular-nums">
                                {v.abs.toLocaleString()}
                                <span className="ml-1 text-body-sm font-normal text-txt-black-500">
                                  ({v.perc.toFixed(1)}%)
                                </span>
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ballot table */}
                      {modal.ballot.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-body-sm">
                            <thead>
                              <tr className="border-b border-otl-gray-200 text-body-xs font-medium text-txt-black-500">
                                <th className="pb-2 pr-3 text-left">{c("candidate_name") || "Candidate"}</th>
                                <th className="pb-2 px-3 text-left">{c("party_name") || "Party"}</th>
                                <th className="pb-2 pl-3 text-right">{c("votes_won") || "Votes"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modal.ballot.map((entry, i) => (
                                <tr
                                  key={i}
                                  className={`border-b border-otl-gray-200 last:border-0 ${entry.result.startsWith("won") ? "bg-bg-success-50" : ""}`}
                                >
                                  <td className="py-2.5 pr-3">
                                    <div className="flex items-center gap-1.5">
                                      {entry.result.startsWith("won") && (
                                        <svg className="h-4 w-4 shrink-0 text-txt-success" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      <span className="font-medium">{entry.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <PartyFlag uid={entry.party_uid} party={entry.party} />
                                      <div className="min-w-0">
                                        <p>{entry.party}</p>
                                        {entry.coalition && entry.coalition !== "ALONE" && (
                                          <p className="text-body-xs text-txt-black-500">{entry.coalition}</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 pl-3 text-right tabular-nums">
                                    {entry.votes.toLocaleString()}
                                    <span className="ml-1 text-body-xs text-txt-black-500">
                                      ({entry.votes_perc.toFixed(1)}%)
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Prev/next navigation */}
                <div className="flex items-center justify-between border-t border-otl-gray-200 px-4 py-3 sm:px-6">
                  <button
                    onClick={() => navigateModal(-1)}
                    disabled={modal.currentIndex <= 0}
                    className="flex items-center gap-1.5 rounded-md border border-otl-gray-200 px-3 py-2 text-body-xs font-medium text-txt-black-700 hover:bg-bg-washed disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                    </svg>
                    {c("previous") || "Previous"}
                  </button>
                  <span className="text-body-xs text-txt-black-500">
                    {modal.currentIndex + 1} / {allElections.length}
                  </span>
                  <button
                    onClick={() => navigateModal(1)}
                    disabled={modal.currentIndex >= allElections.length - 1}
                    className="flex items-center gap-1.5 rounded-md border border-otl-gray-200 px-3 py-2 text-body-xs font-medium text-txt-black-700 hover:bg-bg-washed disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {c("next") || "Next"}
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
