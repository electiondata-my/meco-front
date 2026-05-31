import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

type PartyElection = {
  party_type: string;
  state: string;
  type: "parlimen" | "dun";
  coalition?: string;
  coalition_uid?: string;
  known_as?: string;
  known_as_uid?: string;
  election_name: string;
  date: string;
  seats_total: number;
  seats_contested: number;
  seats_contested_perc: number;
  seats_won: number;
  seats_won_perc: number;
  votes: number;
  votes_perc: number;
};

type ElectionParty = {
  party: string;
  party_uid?: string;
  coalition?: string;
  coalition_uid?: string;
  seats_total: number;
  seats_contested: number;
  seats_contested_perc: number;
  seats_won: number;
  seats_won_perc: number;
  votes: number;
  votes_perc: number;
  votes_total?: number;
};

type ModalState = {
  open: boolean;
  loading: boolean;
  electionName: string;
  state: string;
  date: string;
  table: ElectionParty[];
  currentIndex: number;
  elections: PartyElection[];
};

interface Props {
  parlimen: PartyElection[];
  dun: PartyElection[];
  partyName: string;
  partyUid: string;
  partyType: string;
  stateCode: string;
  stateName: string;
  stateOptions: { value: string; label: string }[];
  isMalay: boolean;
  localePrefix: string;
  apiBase: string;
  translations: { common: Record<string, any>; parties: Record<string, any> };
  noDunState: boolean;
}

function tr(dict: Record<string, any>, key: string, vars?: Record<string, string>): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], dict);
  if (val == null || val === key) return "";
  return vars
    ? String(val).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => vars[name] ?? `{{ ${name} }}`)
    : String(val);
}

function fmt(name: string, isMalay?: boolean): string {
  if (name === "By-Election") return isMalay ? "PRK" : "By-Elec";
  if (!isMalay) return name;
  return name.replace(/^GE-/, "PRU-").replace(/^SE-/, "PRN-");
}

function num(n: number): string {
  return n?.toLocaleString("en-GB") ?? "—";
}

function perc(p: number | null | undefined): string {
  return p != null ? `${p.toFixed(1)}%` : "—";
}

const monoCellClass = "font-['IBM_Plex_Mono','Roboto_Mono',monospace]";
const monoNumberClass = `${monoCellClass} tabular-nums`;

function Bar({ value, size = "w-[100px] h-[5px]" }: { value?: number | null; size?: string }) {
  return (
    <div className={`flex overflow-x-hidden rounded-full bg-bg-washed ${size}`}>
      <div
        className="h-full overflow-hidden rounded-full bg-bg-black-900"
        style={{ width: `${Math.min(value ?? 0, 100)}%` }}
      />
    </div>
  );
}

type CoalitionGroup = {
  coalition_uid: string;
  coalition: string;
  parties: ElectionParty[];
  seats_total: number;
  seats_contested: number;
  seats_contested_perc: number;
  seats_won: number;
  seats_won_perc: number;
  votes: number;
  votes_perc: number;
};

type OverviewRow =
  | { kind: "coalition"; group: CoalitionGroup }
  | { kind: "party"; party: ElectionParty; isChild: boolean };

function OverviewLogo({ uid, name, folder }: { uid?: string; name: string; folder: "parties" | "coalitions" }) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      imgRef.current.naturalWidth === 0 ? setErr(true) : setLoaded(true);
    }
  }, []);

  if (!uid || err) {
    return <span className="flex h-[18px] w-8 shrink-0 items-center justify-center border border-otl-gray-200 text-xs text-txt-black-400">?</span>;
  }
  return (
    <span className="relative flex h-[18px] w-8 shrink-0 items-center justify-center text-xs text-txt-black-400">
      ?
      <img
        ref={imgRef}
        src={`/static/images/${folder}/${uid}.png`}
        alt={name}
        width={32}
        height={18}
        className={`absolute inset-0 h-full w-full object-contain ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
      />
    </span>
  );
}

function ElectionOverviewTable({ data, c }: { data: ElectionParty[]; c: (key: string) => string }) {
  const coalitionVotes = Object.values(data.reduce((totals, party) => {
    if (party.coalition_uid && party.coalition_uid !== "00-ALONE") {
      totals[party.coalition_uid] = (totals[party.coalition_uid] ?? 0) + party.votes;
    }
    return totals;
  }, {} as Record<string, number>));
  const voteWidth = `${Math.max(1, ...data.map((party) => num(party.votes).length), ...coalitionVotes.map((votes) => num(votes).length))}ch`;
  const { groups, alone } = useMemo(() => {
    const grouped = new Map<string, ElectionParty[]>();
    const alone: ElectionParty[] = [];
    const votesTotal = data.find((party) => party.votes_total)?.votes_total
      ?? data.reduce((sum, party) => sum + party.votes, 0);

    for (const party of data) {
      if (!party.coalition_uid || party.coalition_uid === "00-ALONE") {
        alone.push(party);
      } else {
        grouped.set(party.coalition_uid, [...(grouped.get(party.coalition_uid) ?? []), party]);
      }
    }

    const groups = [...grouped.entries()].map(([coalition_uid, parties]) => {
      const seats_total = parties[0]?.seats_total ?? 0;
      const seats_won = parties.reduce((sum, party) => sum + party.seats_won, 0);
      const seats_contested = parties.reduce((sum, party) => sum + party.seats_contested, 0);
      const votes = parties.reduce((sum, party) => sum + party.votes, 0);
      return {
        coalition_uid,
        coalition: parties[0]?.coalition ?? coalition_uid,
        parties: [...parties].sort((a, b) => b.seats_won - a.seats_won),
        seats_total,
        seats_won,
        seats_won_perc: seats_total ? (seats_won / seats_total) * 100 : 0,
        seats_contested,
        seats_contested_perc: seats_total ? (seats_contested / seats_total) * 100 : 0,
        votes,
        votes_perc: votesTotal ? (votes / votesTotal) * 100 : 0,
      };
    });

    groups.sort((a, b) => b.seats_won - a.seats_won);
    alone.sort((a, b) => b.seats_won - a.seats_won);
    return { groups, alone };
  }, [data]);

  const coalitionIds = useMemo(() => groups.map((group) => group.coalition_uid), [groups]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => setCollapsed(new Set(coalitionIds)), [coalitionIds]);

  const rows = useMemo(() => {
    const rows: OverviewRow[] = [];
    const sorted = [
      ...groups.map((group) => ({ kind: "coalition" as const, group, seats_won: group.seats_won })),
      ...alone.map((party) => ({ kind: "party" as const, party, seats_won: party.seats_won })),
    ].sort((a, b) => b.seats_won - a.seats_won);
    for (const row of sorted) {
      if (row.kind === "coalition") {
        rows.push({ kind: "coalition", group: row.group });
        if (!collapsed.has(row.group.coalition_uid)) {
          rows.push(...row.group.parties.map((party) => ({ kind: "party" as const, party, isChild: true })));
        }
      } else {
        rows.push({ kind: "party", party: row.party, isChild: false });
      }
    }
    return rows;
  }, [alone, collapsed, groups]);
  const seatWidth = `${Math.max(
    1,
    ...data.flatMap((party) => [party.seats_won, party.seats_contested, party.seats_total]).map((value) => String(value).length),
    ...groups.flatMap((group) => [group.seats_won, group.seats_contested, group.seats_total]).map((value) => String(value).length)
  )}ch`;

  const toggle = (uid: string) => setCollapsed((current) => {
    const next = new Set(current);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });

  return (
    <div className="overflow-x-auto md:overflow-x-visible">
      <table className="w-full text-left text-body-sm">
        <thead>
          <tr className="border-b-2 border-otl-gray-200 font-medium">
            <th className="sticky left-0 z-20 whitespace-nowrap bg-bg-white py-3 pl-4 pr-3">{c("party_name") || "Party"}</th>
            <th className="whitespace-nowrap px-3 py-3">{c("seats_won") || "Seats Won"}</th>
            <th className="whitespace-nowrap px-3 py-3">{c("votes_won") || "Votes Won"}</th>
            <th className="whitespace-nowrap px-3 py-3">{c("seats_contested") || "Seats Contested"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            if (row.kind === "coalition") {
              const { group } = row;
              const isCollapsed = collapsed.has(group.coalition_uid);
              return (
                <tr
                  key={`coalition-${group.coalition_uid}`}
                  className="cursor-pointer border-b border-otl-gray-200 bg-bg-washed hover:bg-bg-black-50"
                  onClick={() => toggle(group.coalition_uid)}
                >
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-bg-washed py-[11px] pl-4 pr-3 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <OverviewLogo uid={group.coalition_uid} name={group.coalition} folder="coalitions" />
                      <span>{group.coalition}</span>
                      <svg className="h-4 w-4 text-txt-black-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d={isCollapsed
                            ? "M5.22 7.72a.75.75 0 0 1 1.06 0L10 11.44l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.78a.75.75 0 0 1 0-1.06Z"
                            : "M14.78 12.28a.75.75 0 0 1-1.06 0L10 8.56l-3.72 3.72a.75.75 0 1 1-1.06-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06Z"}
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </td>
                  <OverviewNumbers seats={group.seats_won} total={group.seats_total} seatWidth={seatWidth} percentage={group.seats_won_perc} />
                  <OverviewNumbers votes={group.votes} voteWidth={voteWidth} percentage={group.votes_perc} />
                  <OverviewNumbers seats={group.seats_contested} total={group.seats_total} seatWidth={seatWidth} percentage={group.seats_contested_perc} />
                </tr>
              );
            }
            const { party, isChild } = row;
            return (
              <tr key={`party-${party.party}-${index}`} className="border-b border-otl-gray-200">
                <td className={`sticky left-0 z-10 whitespace-nowrap bg-bg-white py-[11px] pr-3 ${isChild ? "pl-10" : "pl-4"}`}>
                  <div className="flex items-center gap-1.5">
                    <OverviewLogo uid={party.party_uid} name={party.party} folder="parties" />
                    <span>{party.party}</span>
                  </div>
                </td>
                <OverviewNumbers seats={party.seats_won} total={party.seats_total} seatWidth={seatWidth} percentage={party.seats_won_perc} />
                <OverviewNumbers votes={party.votes} voteWidth={voteWidth} percentage={party.votes_perc} />
                <OverviewNumbers seats={party.seats_contested} total={party.seats_total} seatWidth={seatWidth} percentage={party.seats_contested_perc} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OverviewNumbers({ seats, votes, total, seatWidth, voteWidth, percentage }: { seats?: number; votes?: number; total?: number; seatWidth?: string; voteWidth?: string; percentage: number }) {
  return (
    <td className={`px-4 py-[11px] ${monoNumberClass}`}>
      <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
        <Bar value={percentage} />
        <span className="whitespace-nowrap">
          {votes != null ? (
            <span className="inline-block text-right" style={{ minWidth: voteWidth }}>{num(votes)}</span>
          ) : (
            <>
              <span className="inline-block text-right" style={{ minWidth: seatWidth }}>{seats}</span>
              <span className="inline-block w-[3ch] text-center">/</span>
              <span className="inline-block text-right" style={{ minWidth: seatWidth }}>{total}</span>
            </>
          )}
          {" "}({perc(percentage)})
        </span>
      </div>
    </td>
  );
}

function CoalitionCell({ coalition, uid }: { coalition?: string; uid?: string }) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      imgRef.current.naturalWidth === 0 ? setErr(true) : setLoaded(true);
    }
  }, []);

  if (!coalition || coalition === "ALONE") {
    return <span className="font-light text-txt-black-400">&nbsp;—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      {uid && !err ? (
        <div className="relative flex h-[18px] w-8 shrink-0 items-center justify-center text-xs text-txt-black-400">
          ?
          <img
            ref={imgRef}
            src={`/static/images/coalitions/${uid}.png`}
            alt={coalition}
            width={32}
            height={18}
            className={`absolute inset-0 h-full w-full object-contain ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
            onError={() => setErr(true)}
          />
        </div>
      ) : (
        <span className="flex h-[18px] w-8 shrink-0 items-center justify-center border border-otl-gray-200 text-xs text-txt-black-400">?</span>
      )}
      <span>{coalition}</span>
    </div>
  );
}

function InlineStateDropdown({
  currentState,
  currentStateName,
  stateOptions,
  partyUid,
  localePrefix,
}: {
  currentState: string;
  currentStateName: string;
  stateOptions: { value: string; label: string }[];
  partyUid: string;
  localePrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = stateOptions.find((s) => s.value === currentState);
  const currentLabel = current?.label ?? currentStateName;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative w-fit">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex select-none items-center gap-1.5 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 text-start text-body-sm font-medium text-txt-black-900 shadow-button outline-none hover:border-bg-black-400 active:bg-bg-black-100"
      >
        <img
          src={`/static/images/states/${currentState}.jpeg`}
          width={20}
          height={12}
          alt={currentLabel}
          className="self-center"
        />
        <span className="grow truncate">{currentLabel}</span>
        <svg className="-mx-[5px] h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-60 min-w-full overflow-y-auto rounded-md bg-bg-white text-txt-black-900 shadow-lg ring-1 ring-otl-gray-200 ring-opacity-5">
          {stateOptions.map((o) => (
            <li key={o.value}>
              <a
                href={`${localePrefix}/parties/${partyUid}/${o.value}`}
                onClick={() => {
                  try {
                    sessionStorage.setItem("partySearchScrollY", String(window.scrollY));
                  } catch {}
                }}
                className="flex w-full select-none items-center gap-2 whitespace-nowrap py-2 pl-4 pr-4 text-body-sm text-txt-black-900 hover:bg-bg-black-100"
              >
                <img
                  src={`/static/images/states/${o.value}.jpeg`}
                  width={20}
                  height={12}
                  alt={o.label}
                />
                <span className={`grow truncate ${o.value === currentState ? "font-medium" : "font-normal"}`}>
                  {o.label}
                </span>
                {o.value === currentState && (
                  <svg className="h-4 w-4 shrink-0 text-primary-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.051l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.816a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PartyElectionTable({
  parlimen,
  dun,
  partyName,
  partyUid,
  partyType,
  stateCode,
  stateName,
  stateOptions,
  isMalay,
  localePrefix,
  apiBase,
  translations,
  noDunState,
}: Props) {
  const c = (key: string) => tr(translations.common, key);
  const p = (key: string, vars?: Record<string, string>) => tr(translations.parties, key, vars);

  const [tabIndex, setTabIndex] = useState(0);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    loading: false,
    electionName: "",
    state: "",
    date: "",
    table: [],
    currentIndex: 0,
    elections: [],
  });

  const elections = tabIndex === 0 ? parlimen : dun;
  const seatDigits = Math.max(
    1,
    ...elections.flatMap((e) => [e.seats_won, e.seats_contested, e.seats_total]).map((value) => String(value).length)
  );
  const seatWidth = `${seatDigits}ch`;
  const voteWidth = `${Math.max(1, ...elections.map((e) => num(e.votes).length))}ch`;
  const isCoalition = partyType === "coalition";
  const partyFolder = isCoalition ? "coalitions" : "parties";
  const showKnownAs = !isCoalition && new Set(elections.map((e) => e.known_as ?? "")).size > 1;

  const fetchFullResult = useCallback(
    async (e: PartyElection, index: number, list: PartyElection[]) => {
      const elType = e.type;
      setModal({
        open: true,
        loading: true,
        electionName: e.election_name,
        state: e.state,
        date: new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        table: [],
        currentIndex: index,
        elections: list,
      });

      try {
        const url = `${apiBase}/elections/${encodeURIComponent(e.state)}/${elType}-${e.election_name}.json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch election result: ${res.status}`);
        const json = await res.json();
        const table: ElectionParty[] = json?.ballot ?? json?.data?.ballot ?? [];
        setModal((prev) => ({
          ...prev,
          loading: false,
          table,
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

  return (
    <div className="min-h-[250px] w-full space-y-6 pb-10 lg:pb-0">
      {/* Heading row: party logo + title + state dropdown | tab pills */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-heading-2xs font-bold">
          <div className="flex items-center gap-2">
            <OverviewLogo uid={partyUid} name={partyName} folder={partyFolder} />
            <span>
              <strong>{partyName}'s history</strong>
              {" in "}
            </span>
          </div>
          <InlineStateDropdown
            currentState={stateCode}
            currentStateName={stateName}
            stateOptions={stateOptions}
            partyUid={partyUid}
            localePrefix={localePrefix}
          />
        </div>

        {/* Tab pills */}
        <div className="flex h-8 w-fit shrink-0 items-center rounded-lg bg-bg-washed p-0">
          {[c("parlimen") || "Parliament", c("dun") || "DUN"].map((label, i) => {
            const disabled = i === 1 && noDunState;
            return (
              <button
                key={i}
                onClick={() => !disabled && setTabIndex(i)}
                disabled={disabled}
                className={[
                  "flex h-8 min-h-8 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-body-sm font-medium transition-colors",
                  i === tabIndex
                    ? "rounded-md border border-otl-gray-200 bg-bg-dialog-active text-txt-black-900 shadow-button"
                    : disabled
                      ? "cursor-not-allowed text-txt-black-300"
                      : "text-txt-black-500 hover:text-txt-black-900",
                ].join(" ")}
              >
                {label}
                <span className={`text-body-xs ${i === tabIndex ? "text-txt-black-500" : "text-txt-black-400"}`}>
                  ({i === 0 ? parlimen.length : dun.length})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* No-data state */}
      {elections.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center">
          <div className="flex h-auto w-[300px] rounded-md bg-otl-gray-200 px-3 pb-2 pt-1 lg:w-fit">
            <p className="text-sm">
              <span className="inline-flex pr-1" aria-hidden="true">
                <svg className="h-5 w-5 translate-y-0.5 text-txt-black-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </span>
              {tabIndex === 1 && noDunState
                ? p("no_data_dun_wp") || "No DUN (Federal Territory)."
                : p("no_data_parlimen", { party: partyName, state: stateName })
                  || `${partyName} has never contested Parliament seats in ${stateName}.`}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="divide-y divide-otl-gray-200 border-y border-otl-gray-200 md:hidden">
            {elections.map((e, idx) => {
              const year = new Date(e.date).getFullYear();
              return (
                <div key={idx} className="space-y-3 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="shrink-0 text-body-sm font-medium">
                        {fmt(e.election_name, isMalay)} ({year})
                      </p>
                      {showKnownAs && e.known_as && (
                        <>
                          <span className="shrink-0 text-txt-black-500" aria-hidden="true">&bull;</span>
                          <div className="flex items-center gap-1.5">
                            <OverviewLogo uid={e.known_as_uid} name={e.known_as} folder="parties" />
                            <span>{e.known_as}</span>
                          </div>
                        </>
                      )}
                      {!isCoalition && e.coalition && e.coalition !== "ALONE" && (
                        <>
                          <span className="shrink-0 text-txt-black-500" aria-hidden="true">&bull;</span>
                          <CoalitionCell coalition={e.coalition} uid={e.coalition_uid} />
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => fetchFullResult(e, idx, elections)}
                      className="flex shrink-0 items-center gap-1.5 text-body-sm font-medium text-txt-black-700 hover:text-txt-black-900"
                      aria-label={c("full_result") || "Details"}
                    >
                      <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2.5 text-body-sm">
                    <div className="flex items-center gap-2">
                      <p className="w-[120px] shrink-0 whitespace-nowrap font-medium text-txt-black-500">{c("seats_won") || "Seats Won"}:</p>
                      <Bar value={e.seats_won_perc} size="h-[5px] flex-1" />
                      <p className="shrink-0 whitespace-nowrap">{e.seats_won} / {e.seats_total} ({perc(e.seats_won_perc)})</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="w-[120px] shrink-0 whitespace-nowrap font-medium text-txt-black-500">{c("seats_contested") || "Seats Contested"}:</p>
                      <Bar value={e.seats_contested_perc} size="h-[5px] flex-1" />
                      <p className="shrink-0 whitespace-nowrap">{e.seats_contested} / {e.seats_total} ({perc(e.seats_contested_perc)})</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="w-[120px] shrink-0 whitespace-nowrap font-medium text-txt-black-500">{c("votes_won") || "Votes Won"}:</p>
                      <Bar value={e.votes_perc} size="h-[5px] flex-1" />
                      <p className="shrink-0 whitespace-nowrap">{num(e.votes)} ({perc(e.votes_perc)})</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: full table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b-2 border-otl-gray-200 font-medium text-txt-black-700">
                  <th className="whitespace-nowrap py-3 pl-4 pr-4">{c("election_name") || "Election"}</th>
                  {showKnownAs && <th className="whitespace-nowrap px-4 py-3">{p("known_as") || "Known As"}</th>}
                  {!isCoalition && <th className="whitespace-nowrap px-4 py-3">{c("coalition_name") || "Coalition"}</th>}
                  <th className="whitespace-nowrap px-4 py-3">{c("seats_won") || "Seats Won"}</th>
                  <th className="whitespace-nowrap px-4 py-3">{c("votes_won") || "Votes"}</th>
                  <th className="whitespace-nowrap px-4 py-3">{c("seats_contested") || "Seats Contested"}</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {elections.map((e, idx) => {
                  const year = new Date(e.date).getFullYear();
                  return (
                    <tr key={idx} className="border-b border-otl-gray-200 hover:bg-bg-black-50">
                      <td className={`whitespace-nowrap py-[11px] pl-4 pr-4 ${monoCellClass}`}>
                        {fmt(e.election_name, isMalay)} ({year})
                      </td>
                      {showKnownAs && (
                        <td className="whitespace-nowrap px-4 py-[11px]">
                          {e.known_as ? (
                            <div className="flex items-center gap-1.5">
                              <OverviewLogo uid={e.known_as_uid} name={e.known_as} folder="parties" />
                              <span>{e.known_as}</span>
                            </div>
                          ) : (
                            <span className="font-light text-txt-black-400">&nbsp;—</span>
                          )}
                        </td>
                      )}
                      {!isCoalition && (
                        <td className="whitespace-nowrap px-4 py-[11px]">
                          <CoalitionCell coalition={e.coalition} uid={e.coalition_uid} />
                        </td>
                      )}
                      {/* Seats Won — bar + text */}
                      <td className={`px-4 py-[11px] ${monoNumberClass}`}>
                        <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
                          <Bar value={e.seats_won_perc} />
                          <p className="whitespace-nowrap">
                            <span className="inline-block text-right" style={{ minWidth: seatWidth }}>{e.seats_won}</span>
                            <span className="inline-block w-[3ch] text-center">/</span>
                            <span className="inline-block text-right" style={{ minWidth: seatWidth }}>{e.seats_total}</span>
                            {" "}({perc(e.seats_won_perc)})
                          </p>
                        </div>
                      </td>
                      {/* Votes — bar + text */}
                      <td className={`px-4 py-[11px] ${monoNumberClass}`}>
                        <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
                          <Bar value={e.votes_perc} />
                          <p className="whitespace-nowrap">
                            <span className="inline-block text-right" style={{ minWidth: voteWidth }}>{num(e.votes)}</span>
                            {" "}({perc(e.votes_perc)})
                          </p>
                        </div>
                      </td>
                      {/* Seats Contested — bar + text */}
                      <td className={`px-4 py-[11px] ${monoNumberClass}`}>
                        <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
                          <Bar value={e.seats_contested_perc} />
                          <p className="whitespace-nowrap">
                            <span className="inline-block text-right" style={{ minWidth: seatWidth }}>{e.seats_contested}</span>
                            <span className="inline-block w-[3ch] text-center">/</span>
                            <span className="inline-block text-right" style={{ minWidth: seatWidth }}>{e.seats_total}</span>
                            {" "}({perc(e.seats_contested_perc)})
                          </p>
                        </div>
                      </td>
                      {/* Details button */}
                      <td className="px-4 py-[11px] text-right">
                        <button
                          onClick={() => fetchFullResult(e, idx, elections)}
                          className="flex items-center gap-1.5 text-body-sm font-medium text-txt-black-700 hover:text-txt-black-900"
                        >
                          <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          <p className="whitespace-nowrap">{c("full_result") || "Details"}</p>
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
            .party-modal-panel {
              animation: modal-slide-up 0.28s cubic-bezier(0.32,0.72,0,1) both;
            }
            @media (min-width: 640px) {
              .party-modal-panel {
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
            <div className="party-modal-panel relative z-10 flex max-h-[calc(100%-40px)] w-full flex-col overflow-hidden rounded-t-2xl bg-bg-white shadow-xl sm:max-w-5xl sm:rounded-xl">
              {/* Header */}
              <div className="flex flex-col gap-1 px-4 pb-0 pt-4 uppercase sm:px-6 sm:pt-5">
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 text-body-md">
                    <span className="font-semibold">{fmt(modal.electionName, isMalay)}</span>
                    <span className="text-txt-black-500" aria-hidden="true">&middot;</span>
                    <span className="text-txt-black-500">{modal.date}</span>
                    <span className="text-txt-black-500" aria-hidden="true">&middot;</span>
                    <span className="text-txt-black-500">{modal.state}</span>
                  </div>
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

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 sm:px-6">
                {modal.loading ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-txt-danger border-t-transparent" />
                  </div>
                ) : (
                  <>
                    {modal.table.length > 0 ? (
                      <ElectionOverviewTable data={modal.table} c={c} />
                    ) : (
                      <p className="py-8 text-center text-body-sm text-txt-black-500">No data available.</p>
                    )}
                  </>
                )}
              </div>

              {/* Pagination */}
              {modal.elections.length > 1 && (
                <div className="flex shrink-0 items-center justify-center gap-4 px-6 py-4 text-body-sm font-medium">
                  <button
                    onClick={() => fetchFullResult(modal.elections[modal.currentIndex - 1], modal.currentIndex - 1, modal.elections)}
                    disabled={modal.currentIndex === 0}
                    className="flex items-center gap-1.5 rounded-md border border-otl-gray-200 px-3 py-1.5 text-txt-black-700 hover:bg-bg-black-50 disabled:opacity-40"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                    </svg>
                    {c("previous") || "Previous"}
                  </button>
                  <span className="text-txt-black-900">{modal.currentIndex + 1} of {modal.elections.length}</span>
                  <button
                    onClick={() => fetchFullResult(modal.elections[modal.currentIndex + 1], modal.currentIndex + 1, modal.elections)}
                    disabled={modal.currentIndex === modal.elections.length - 1}
                    className="flex items-center gap-1.5 rounded-md border border-otl-gray-200 px-3 py-1.5 text-txt-black-700 hover:bg-bg-black-50 disabled:opacity-40"
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
