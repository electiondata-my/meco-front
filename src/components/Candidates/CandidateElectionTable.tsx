import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type CandidateElection = {
  type: "parlimen" | "dun";
  election_name: string;
  date: string;
  seat: string;
  party: string;
  party_uid?: string;
  coalition?: string;
  votes: number;
  votes_perc: number;
  result: string;
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

type VoteStat = {
  x: string;
  abs: number | null;
  perc: number | null;
  ratio?: number | null;
};

type ModalState = {
  open: boolean;
  loading: boolean;
  area: string;
  state: string;
  election_name: string;
  date: string;
  result: string;
  ballot: BallotEntry[];
  votes: VoteStat[];
  currentIndex: number;
  allElections: CandidateElection[];
};

interface Props {
  parlimen: CandidateElection[];
  dun: CandidateElection[];
  candidateName: string;
  candidateStats?: string;
  apiBase: string;
  isMalay?: boolean;
  translations: { common: Record<string, any>; candidates: Record<string, any> };
}

function tr(dict: Record<string, any>, key: string): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], dict);
  if (val == null || val === key) return "";
  return String(val);
}

function resultLabel(result: string, cd: (k: string) => string): string {
  if (result === "won") return cd("won") || "Won";
  if (result === "won_uncontested") return cd("won_uncontested") || "Won (Uncontested)";
  if (result === "lost") return cd("lost") || "Lost";
  if (result === "lost_deposit") return cd("lost_deposit") || "Lost Deposit";
  if (result === "pending") return cd("pending") || "Pending";
  return result;
}

function formatElectionName(name: string, isMalay?: boolean): string {
  if (!isMalay && name === "By-Election") return "By-Elec";
  if (!isMalay) return name;
  if (name.startsWith("GE-")) return name.replace(/^GE-/, "PRU-");
  if (name.startsWith("SE-")) return name.replace(/^SE-/, "PRN-");
  if (name === "By-Election") return "PRK";
  return name;
}

function PartyFlag({ uid, party }: { uid?: string; party: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      imgRef.current.naturalWidth === 0 ? setFailed(true) : setLoaded(true);
    }
  }, []);

  return (
    <div className="relative flex h-[18px] w-8 shrink-0 items-center justify-center border border-otl-gray-200 text-xs text-txt-black-400">
      ?
      {uid && !failed && (
        <img
          ref={imgRef}
          src={`/static/images/parties/${uid}.png`}
          alt={party}
          width={32}
          height={18}
          className={`absolute inset-0 h-full w-full object-contain ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

const monoCellClass = "font-['IBM_Plex_Mono','Roboto_Mono',monospace]";
const monoNumberClass = `${monoCellClass} tabular-nums`;
const desktopMonoNumberClass = "sm:font-['IBM_Plex_Mono','Roboto_Mono',monospace] sm:tabular-nums";

function WonCircle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

function LostCircle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  );
}

function PendingCircle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h3.25a.75.75 0 000-1.5H10.75V5z" clipRule="evenodd" />
    </svg>
  );
}

function resultColor(result: string): string {
  if (result.startsWith("won")) return "text-txt-success";
  if (result === "pending") return "text-txt-black-disabled dark:text-txt-black-500";
  return "text-txt-danger";
}

function ResultIcon2({ result }: { result: string }) {
  if (result.startsWith("won")) return <WonCircle className="h-5 w-5 shrink-0 text-txt-success" />;
  if (result === "pending") return <PendingCircle className="h-5 w-5 shrink-0 text-txt-black-disabled dark:text-txt-black-500" />;
  return <LostCircle className="h-5 w-5 shrink-0 text-txt-danger" />;
}

function ResultBadge({ result, cd }: { result: string; cd: (k: string) => string }) {
  return (
    <span className={`flex items-center gap-1.5 text-body-sm ${resultColor(result)}`}>
      <ResultIcon2 result={result} />
      {resultLabel(result, cd).toUpperCase()}
    </span>
  );
}

function ResultIcon({ result }: { result: string }) {
  return <ResultIcon2 result={result} />;
}

function ResultLine({ result, cd }: { result: string; cd: (k: string) => string }) {
  const Icon = result.startsWith("won") ? WonCircle : result === "pending" ? PendingCircle : LostCircle;
  return (
    <span className={`flex items-center gap-1 font-normal ${resultColor(result)}`}>
      {resultLabel(result, cd).toUpperCase()}
      <Icon className="h-4 w-4 shrink-0" />
    </span>
  );
}

export default function CandidateElectionTable({
  parlimen,
  dun,
  candidateName,
  candidateStats,
  apiBase,
  isMalay,
  translations,
}: Props) {
  const allElections = [...parlimen, ...dun].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const c = (key: string) => tr(translations.common, key);
  const cd = (key: string) => tr(translations.candidates, key);

  const [tabIndex, setTabIndex] = useState(0);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    loading: false,
    area: "",
    state: "",
    election_name: "",
    date: "",
    result: "",
    ballot: [],
    votes: [],
    currentIndex: 0,
    allElections: [],
  });

  const elections = tabIndex === 0 ? allElections : tabIndex === 1 ? parlimen : dun;
  const TABS = [
    { label: c("all") || "All Results", count: allElections.length },
    { label: c("parlimen") || "Parliament", count: parlimen.length },
    { label: c("dun") || "DUN", count: dun.length },
  ];

  const fetchFullResult = useCallback(
    async (e: CandidateElection, index: number, list: CandidateElection[]) => {
      const parts = e.seat.split(",");
      const area = parts[0]?.trim() ?? e.seat;
      const state = parts[1]?.trim() ?? "";

      setModal({
        open: true,
        loading: true,
        area,
        state,
        election_name: e.election_name,
        date: new Date(e.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        result: e.result,
        ballot: [],
        votes: [],
        currentIndex: index,
        allElections: list,
      });

      try {
        const res = await fetch(
          `${apiBase}/results/${encodeURIComponent(e.seat)}/${e.date}.json`
        );
        const { ballot, stats: [s = {}] } = await res.json();
        setModal((prev) => ({
          ...prev,
          loading: false,
          ballot: ballot ?? [],
          votes: [
            { x: "majority", abs: s.majority, perc: s.majority_perc },
            { x: "voters_total", abs: s.voters_total ?? null, perc: null, ratio: s.voters_total_v_avg ?? null },
            { x: "voter_turnout", abs: s.voter_turnout, perc: s.voter_turnout_perc },
            { x: "rejected_votes", abs: s.votes_rejected, perc: s.votes_rejected_perc },
          ],
        }));
      } catch {
        setModal((prev) => ({ ...prev, loading: false }));
      }
    },
    [apiBase]
  );

  useEffect(() => {
    if (!modal.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal((prev) => ({ ...prev, open: false }));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modal.open]);

  const displayName = candidateStats ? `${candidateName} (${candidateStats})` : candidateName;
  const firstModalBallotHighlighted = modal.ballot[0]?.name === candidateName;

  return (
    <div className="min-h-[250px] w-full space-y-6 pb-10 lg:pb-0">
      {/* Heading stacks above tab pills on mobile */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <h2 className="min-w-0 text-heading-2xs font-semibold">
          {cd("title") || "Complete electoral history for "}
          <span className="text-txt-danger">{displayName}</span>
        </h2>
        <div className="flex h-8 w-fit shrink-0 items-center rounded-lg bg-bg-washed p-0">
          {TABS.map(({ label, count }, i) => (
            <button
              key={i}
              onClick={() => setTabIndex(i)}
              className={[
                "flex h-8 min-h-8 items-center justify-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-body-sm font-medium transition-colors",
                i === tabIndex
                  ? "rounded-md border border-otl-gray-200 bg-bg-dialog-active text-txt-black-900 shadow-button"
                  : "text-txt-black-500 hover:text-txt-black-900",
              ].join(" ")}
            >
              {label}
              <span className={`text-body-xs ${i === tabIndex ? "text-txt-black-500" : "text-txt-black-400"}`}>
                ({count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {elections.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-txt-black-500">
          {cd("no_data") || "No data."}
        </p>
      ) : (
        <>
        {/* Mobile: compact card list */}
        <div className="divide-y divide-otl-gray-200 border-y border-otl-gray-200 sm:hidden">
          {elections.map((e, idx) => (
            <div key={idx} className="space-y-3 py-4">
              {/* Row 1: election • seat | result + icon */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-body-sm font-medium leading-snug text-txt-black-900">
                  {formatElectionName(e.election_name, isMalay)} ({new Date(e.date).getFullYear()}) • {e.seat}
                </p>
                <button
                  onClick={() => fetchFullResult(e, idx, elections)}
                  className="flex shrink-0 items-center gap-2"
                  aria-label="Full result"
                >
                  <ResultIcon result={e.result} />
                  <svg className="h-4 w-4 shrink-0 text-txt-black-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
              {/* Row 2: Party */}
              <div className="flex items-center gap-1.5 text-body-sm">
                <span className="shrink-0 text-txt-black-500">{c("party_name") || "Party"}:</span>
                <PartyFlag uid={e.party_uid} party={e.party} />
                <span className="text-txt-black-700">
                  {e.coalition && e.coalition !== "ALONE" ? `${e.party} (${e.coalition})` : e.party}
                </span>
              </div>
              {/* Row 3: Votes Won */}
              <div className="flex items-center gap-2 text-body-sm">
                <span className="shrink-0 text-txt-black-500">{c("votes_won") || "Votes Won"}:</span>
                <div className="h-[5px] w-[80px] shrink-0 overflow-x-hidden rounded-full bg-bg-washed">
                  {e.votes_perc != null && (
                    <div className="h-full overflow-hidden rounded-full bg-bg-black-900" style={{ width: `${Math.min(e.votes_perc, 100)}%` }} />
                  )}
                </div>
                <span className="whitespace-nowrap text-txt-black-700">
                  {e.votes?.toLocaleString() ?? "0"}
                  {` (${e.votes_perc != null ? `${e.votes_perc.toFixed(1)}%` : "—"})`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: full table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead>
              <tr className="border-b-2 border-otl-gray-200 text-body-sm font-medium">
                <th className="whitespace-nowrap py-3 pl-2 pr-4">{c("election_name") || "Election"}</th>
                <th className="whitespace-nowrap px-4 py-3">{c("constituency") || "Constituency"}</th>
                <th className="whitespace-nowrap px-4 py-3">{c("party_name") || "Party"}</th>
                <th className="whitespace-nowrap px-4 py-3">{c("votes_won") || "Votes"}</th>
                <th className="whitespace-nowrap px-4 py-3">{c("result") || "Result"}</th>
                <th className="whitespace-nowrap px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {elections.map((e, idx) => (
                <tr key={idx} className="border-b border-otl-gray-200 hover:bg-bg-black-50">
                  <td className={`whitespace-nowrap py-2.5 pl-2 pr-4 ${monoCellClass}`}>
                    {formatElectionName(e.election_name, isMalay)}
                    <span className="ml-1">({new Date(e.date).getFullYear()})</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-txt-black-700">{e.seat}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <PartyFlag uid={e.party_uid} party={e.party} />
                      <span>
                        {e.coalition && e.coalition !== "ALONE"
                          ? `${e.party} (${e.coalition})`
                          : e.party}
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-2.5 ${monoNumberClass}`}>
                    <div className="flex items-center gap-px">
                      <div className="h-[5px] w-[116px] shrink-0 overflow-x-hidden rounded-full bg-bg-washed">
                        {e.votes_perc != null && (
                          <div
                            className="h-full overflow-hidden rounded-full bg-bg-black-900"
                            style={{ width: `${Math.min(e.votes_perc, 100)}%` }}
                          />
                        )}
                      </div>
                      <span className="whitespace-nowrap">
                        <span className="inline-block min-w-[3.75rem] text-right">
                          {e.votes?.toLocaleString() ?? "0"}
                        </span>
                        <span>{` (${e.votes_perc != null ? `${e.votes_perc.toFixed(1)}%` : "—"})`}</span>
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <ResultBadge result={e.result} cd={cd} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button
                      onClick={() => fetchFullResult(e, idx, elections)}
                      className="flex items-center gap-1.5 text-body-sm font-medium text-txt-black-700"
                    >
                      <svg
                        className="h-4 w-4 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                      {c("full_result") || "Details"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Full Results Modal */}
      {modal.open && createPortal(
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
            .modal-panel {
              animation: modal-slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1) both;
            }
            @media (min-width: 640px) {
              .modal-panel {
                animation: modal-fade-in 0.18s ease-out both;
              }
            }
          `}</style>
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-[#000]/80"
              onClick={() => setModal((prev) => ({ ...prev, open: false }))}
            />

            {/* Panel — max-w-4xl matches production Dialog */}
            <div className="modal-panel relative z-10 flex max-h-[calc(100%-40px)] w-full flex-col overflow-hidden rounded-t-2xl bg-bg-white shadow-xl sm:max-w-4xl sm:rounded-xl">
              {/* Header */}
              <div className="flex flex-col gap-3 px-4 pb-0 pt-4 uppercase sm:px-6 sm:pb-2 sm:pt-5">
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex flex-wrap items-baseline gap-x-1.5 text-body-md">
                      <span className="font-semibold">{formatElectionName(modal.election_name, isMalay)}</span>
                      <span className="text-txt-black-500" aria-hidden="true">&middot;</span>
                      <span className="text-txt-black-500">{modal.date}</span>
                      <span className="text-txt-black-500" aria-hidden="true">&middot;</span>
                      <ResultLine result={modal.result} cd={cd} />
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2 text-body-md">
                      <span className="font-semibold">
                        {modal.area}
                        {modal.state ? "," : ""}
                      </span>
                      {modal.state && (
                        <span className="font-normal text-txt-black-500">{modal.state}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start">
                    <button
                      onClick={() => setModal((prev) => ({ ...prev, open: false }))}
                      className="shrink-0 rounded-sm p-1 text-txt-black-500 opacity-70 hover:opacity-100"
                      aria-label="Close"
                    >
                      <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable content — matches FullResultContent */}
              <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-8 pt-2 text-body-md sm:px-6 sm:pt-2">
                {modal.loading ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-txt-danger border-t-transparent" />
                  </div>
                ) : (
                  <>
                    {/* Ballot table */}
                    <div className="-mx-4 sm:-mx-6">
                      <table className="w-full table-fixed text-body-sm">
                        <colgroup>
                          <col className="w-4 sm:w-6" />
                          <col className="w-[43%]" />
                          <col className="w-[26%]" />
                          <col className="w-[31%]" />
                          <col className="w-4 sm:w-6" />
                        </colgroup>
                        <thead>
                          <tr className="font-medium">
                            <th
                              aria-hidden="true"
                              className={firstModalBallotHighlighted ? "border-b-2 border-otl-gray-200" : undefined}
                            />
                            <th className="border-b-2 border-otl-gray-200 py-3 pr-3 text-left">{c("candidate_name") || "Candidate"}</th>
                            <th className="border-b-2 border-otl-gray-200 px-3 py-3 text-center sm:text-left">{c("party_name") || "Party"}</th>
                            <th className="border-b-2 border-otl-gray-200 py-3 pl-3 pr-4 text-left">{c("votes_won") || "Votes"}</th>
                            <th
                              aria-hidden="true"
                              className={firstModalBallotHighlighted ? "border-b-2 border-otl-gray-200" : undefined}
                            />
                          </tr>
                        </thead>
                        <tbody>
                          {modal.ballot.map((b, i) => {
                            const highlight = b.name === candidateName;
                            const highlightColor = b.result.startsWith("won")
                              ? "rgb(var(--bg-success-100))"
                              : b.result === "pending"
                              ? "rgb(var(--bg-black-50))"
                              : "rgb(var(--bg-danger-100))";
                            const highlightedBorderClass = highlight
                              ? i === 0
                                ? "border-b border-otl-gray-200"
                                : "border-y border-otl-gray-200"
                              : "";
                            const regularBorderClass = highlight ? highlightedBorderClass : "border-b border-otl-gray-200";
                            const highlightStyle = highlight ? { backgroundColor: highlightColor } : undefined;
                            return (
                              <tr key={i}>
                                <td
                                  aria-hidden="true"
                                  className={highlightedBorderClass}
                                  style={highlightStyle}
                                />
                                <td
                                  className={`min-w-0 break-words py-3 pr-3 text-left ${regularBorderClass}`}
                                  style={{
                                    ...highlightStyle,
                                    overflowWrap: "anywhere",
                                    whiteSpace: "normal",
                                  }}
                                >
                                  {b.name}
                                </td>
                                <td className={`px-3 py-3 ${regularBorderClass}`} style={highlightStyle}>
                                  <div className="flex flex-col items-center gap-1 whitespace-nowrap sm:flex-row sm:items-center sm:gap-1.5">
                                    {b.party_uid && <PartyFlag uid={b.party_uid} party={b.party} />}
                                    <span className="whitespace-nowrap text-center text-xs sm:text-left sm:text-body-sm">
                                      {b.coalition && b.coalition !== "ALONE"
                                        ? `${b.party} (${b.coalition})`
                                        : b.party}
                                    </span>
                                  </div>
                                </td>
                                <td className={`py-3 pl-3 pr-4 ${desktopMonoNumberClass} ${regularBorderClass}`} style={highlightStyle}>
                                  <div className="flex flex-col gap-2 whitespace-nowrap sm:flex-row sm:items-center sm:gap-0.5">
                                    <div className="h-[5px] w-[80px] shrink-0 overflow-x-hidden rounded-full bg-bg-washed sm:w-[72px]">
                                      {b.votes_perc != null && (
                                        <div
                                          className="h-full overflow-hidden rounded-full bg-bg-black-900"
                                          style={{ width: `${Math.min(b.votes_perc, 100)}%` }}
                                        />
                                      )}
                                    </div>
                                    <span className="whitespace-nowrap text-xs sm:text-body-sm">
                                      <span className="sm:inline-block sm:min-w-[3.75rem] sm:text-right">
                                        {b.votes?.toLocaleString() ?? "0"}
                                      </span>
                                      <span>{` (${b.votes_perc != null ? `${b.votes_perc.toFixed(1)}%` : "—"})`}</span>
                                    </span>
                                  </div>
                                </td>
                                <td
                                  aria-hidden="true"
                                  className={highlightedBorderClass}
                                  style={highlightStyle}
                                />
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Voting stats — matches FullResultContent layout */}
                    {modal.votes.length > 0 && (
                      <div className="space-y-3">
                        <p className="font-bold">{c("summary_statistics")}</p>
                        <div className="flex flex-col gap-3 text-sm">
                          {modal.votes.map(({ x, abs, perc, ratio }) => (
                            <div key={x} className="flex w-[245px] flex-col gap-3 whitespace-nowrap">
                              <div className="flex items-center justify-between gap-3 text-body-sm text-txt-black-500">
                                <span className="w-28 md:w-fit">
                                  {c(x) || x.replace(/_/g, " ")}:
                                </span>
                                <span className="text-txt-black-700">
                                  {ratio != null
                                    ? `${abs?.toLocaleString() ?? "—"} (${ratio.toFixed(2)}${c("voters_total_v_avg")})`
                                    : `${abs?.toLocaleString() ?? "—"} ${perc != null ? `(${perc.toFixed(1)}%)` : "(—)"}`}
                                </span>
                              </div>
                              {(ratio != null || perc != null) && (
                                <div className="h-[5px] w-[245px] overflow-x-hidden rounded-full bg-bg-washed">
                                  <div
                                    className="h-full overflow-hidden rounded-full bg-bg-black-900"
                                    style={{
                                      width:
                                        ratio != null
                                          ? `${Math.min((ratio / 2) * 100, 100)}%`
                                          : `${Math.min(perc as number, 100)}%`,
                                    }}
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

              {/* Pagination */}
              {modal.allElections.length > 1 && (
                <div className="flex shrink-0 items-center justify-center gap-4 px-6 py-4 text-body-sm font-medium">
                  <button
                    onClick={() => fetchFullResult(modal.allElections[modal.currentIndex - 1], modal.currentIndex - 1, modal.allElections)}
                    disabled={modal.currentIndex === 0}
                    className="flex items-center gap-1.5 rounded-md border border-otl-gray-200 px-3 py-1.5 text-txt-black-700 disabled:opacity-40 hover:bg-bg-black-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                    </svg>
                    {c("previous") || "Previous"}
                  </button>
                  <span className="text-txt-black-900">
                    {modal.currentIndex + 1} of {modal.allElections.length}
                  </span>
                  <button
                    onClick={() => fetchFullResult(modal.allElections[modal.currentIndex + 1], modal.currentIndex + 1, modal.allElections)}
                    disabled={modal.currentIndex === modal.allElections.length - 1}
                    className="flex items-center gap-1.5 rounded-md border border-otl-gray-200 px-3 py-1.5 text-txt-black-700 disabled:opacity-40 hover:bg-bg-black-50"
                  >
                    {c("next") || "Next"}
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
