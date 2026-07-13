import { useState, useEffect, useMemo, useRef } from "react";
import { ElectionTimeseriesTable, electionName, type TimeseriesVariable } from "./ElectionTimeseriesTable";
import type { Timeseries } from "@src/lib/elections";

export type ElectionParty = {
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

function tr(dict: Record<string, any>, key: string): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], dict);
  return typeof val === "string" ? val : "";
}

function num(n: number): string {
  return n?.toLocaleString("en-GB") ?? "—";
}

function perc(p: number | null | undefined): string {
  return p != null ? `${p.toFixed(1)}%` : "—";
}

const monoClass = "font-['IBM_Plex_Mono','Roboto_Mono',monospace] tabular-nums";

export function Bar({ value, size = "w-[100px] h-[5px]" }: { value?: number | null; size?: string }) {
  // Track is black-200, not washed: washed is the same token as black-100, which is also
  // the coalition rows' background — a washed track is invisible on exactly those rows.
  return (
    <div className={`flex overflow-x-hidden rounded-full bg-bg-black-200 ${size}`}>
      <div
        className="h-full overflow-hidden rounded-full bg-bg-black-900"
        style={{ width: `${Math.min(value ?? 0, 100)}%` }}
      />
    </div>
  );
}

export function OverviewLogo({ uid, name, folder }: { uid?: string; name: string; folder: "parties" | "coalitions" }) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      imgRef.current.naturalWidth === 0 ? setErr(true) : setLoaded(true);
    }
  }, []);

  if (!uid || err) {
    return (
      <span className="flex h-4 w-8 shrink-0 items-center justify-center outline outline-1 outline-otl-gray-200 text-xs text-txt-black-400">
        ?
      </span>
    );
  }
  return (
    <span className="relative flex h-4 w-8 shrink-0 items-center justify-center outline outline-1 outline-otl-gray-200 text-xs text-txt-black-400">
      ?
      <img
        ref={imgRef}
        src={`/static/images/${folder}/${uid}.png`}
        alt={name}
        width={32}
        height={16}
        className={`absolute inset-0 h-full w-full object-contain ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setErr(true)}
      />
    </span>
  );
}

function OverviewNumbers({
  seats,
  votes,
  total,
  seatWidth,
  voteWidth,
  percentage,
}: {
  seats?: number;
  votes?: number;
  total?: number;
  seatWidth?: string;
  voteWidth?: string;
  percentage: number | null;
}) {
  return (
    <td className={`px-4 py-[11px] ${monoClass}`}>
      <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
        <Bar value={percentage} />
        <span className="whitespace-nowrap">
          {votes != null ? (
            <span className="inline-block text-right" style={{ minWidth: voteWidth }}>
              {num(votes)}
            </span>
          ) : (
            <>
              <span className="inline-block text-right" style={{ minWidth: seatWidth }}>
                {seats}
              </span>
              <span className="inline-block w-[3ch] text-center">/</span>
              <span className="inline-block text-right" style={{ minWidth: seatWidth }}>
                {total}
              </span>
            </>
          )}{" "}
          ({perc(percentage)})
        </span>
      </div>
    </td>
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
  votes_perc: number | null;
};

type OverviewRow =
  | { kind: "coalition"; group: CoalitionGroup }
  | { kind: "party"; party: ElectionParty; isChild: boolean };

export function ElectionOverviewTable({
  data,
  c,
  pendingLabel,
  seatsTotalOverride,
  expanded,
  onToggle,
}: {
  data: ElectionParty[];
  c: (key: string) => string;
  pendingLabel?: string;
  seatsTotalOverride?: number;
  /** Optional: hand in the expanded set to share it with a sibling table. */
  expanded?: Set<string>;
  onToggle?: (uid: string) => void;
}) {
  // NOTE: party.seats_total is NOT the chamber size mid-count — upstream sets it to the
  // number of seats DECLARED so far (it read 56 before results, then 6/8/10 as seats were
  // called). Using it as a denominator yields absurdities like "56 / 6 (933.3%)" contested.
  // The caller passes the true seat count, which we use for every ratio in this table.
  const seatsTotal = seatsTotalOverride ?? data[0]?.seats_total ?? 0;
  const pct = (n: number) => (seatsTotal ? (n / seatsTotal) * 100 : 0);

  // Seats still awaiting an announced winner.
  const seatsPending = seatsTotal - data.reduce((sum, p) => sum + p.seats_won, 0);
  const showPending = !!pendingLabel && seatsPending > 0;

  const coalitionVotes = Object.values(
    data.reduce(
      (totals, party) => {
        if (party.coalition_uid && party.coalition_uid !== "000-ALONE") {
          totals[party.coalition_uid] = (totals[party.coalition_uid] ?? 0) + party.votes;
        }
        return totals;
      },
      {} as Record<string, number>,
    ),
  );
  const voteWidth = `${Math.max(1, ...data.map((p) => num(p.votes).length), ...coalitionVotes.map((v) => num(v).length))}ch`;

  const { groups, alone } = useMemo(() => {
    const grouped = new Map<string, ElectionParty[]>();
    const alone: ElectionParty[] = [];
    const votesTotal =
      data.find((p) => p.votes_total)?.votes_total ?? data.reduce((sum, p) => sum + p.votes, 0);

    for (const party of data) {
      if (!party.coalition_uid || party.coalition_uid === "000-ALONE") {
        alone.push(party);
      } else {
        grouped.set(party.coalition_uid, [...(grouped.get(party.coalition_uid) ?? []), party]);
      }
    }

    const groups = [...grouped.entries()].map(([coalition_uid, parties]) => {
      const seats_won = parties.reduce((sum, p) => sum + p.seats_won, 0);
      const seats_contested = parties.reduce((sum, p) => sum + p.seats_contested, 0);
      const votes = parties.reduce((sum, p) => sum + p.votes, 0);
      const allVotesNull = parties.every((p) => p.votes_perc == null);
      return {
        coalition_uid,
        coalition: parties[0]?.coalition ?? coalition_uid,
        parties: [...parties].sort((a, b) => b.seats_won - a.seats_won || b.seats_contested - a.seats_contested),
        seats_total: seatsTotal,
        seats_won,
        seats_won_perc: seatsTotal ? (seats_won / seatsTotal) * 100 : 0,
        seats_contested,
        seats_contested_perc: seatsTotal ? (seats_contested / seatsTotal) * 100 : 0,
        votes,
        votes_perc: allVotesNull ? null : votesTotal ? (votes / votesTotal) * 100 : 0,
      };
    });

    groups.sort((a, b) => b.seats_won - a.seats_won || b.seats_contested - a.seats_contested);
    alone.sort((a, b) => b.seats_won - a.seats_won || b.seats_contested - a.seats_contested);
    return { groups, alone };
  }, [data, seatsTotal]);

  // Tracked as "expanded", not "collapsed", so a re-grouping (new data, new selection)
  // leaves the reader's open rows open instead of snapping everything shut.
  const [ownExpanded, setOwnExpanded] = useState<Set<string>>(new Set());
  const expandedSet = expanded ?? ownExpanded;

  const rows = useMemo(() => {
    const rows: OverviewRow[] = [];
    const sorted = [
      ...groups.map((group) => ({ kind: "coalition" as const, group, seats_won: group.seats_won, seats_contested: group.seats_contested })),
      ...alone.map((party) => ({ kind: "party" as const, party, seats_won: party.seats_won, seats_contested: party.seats_contested })),
    ].sort((a, b) => b.seats_won - a.seats_won || b.seats_contested - a.seats_contested);
    for (const row of sorted) {
      if (row.kind === "coalition") {
        rows.push({ kind: "coalition", group: row.group });
        if (expandedSet.has(row.group.coalition_uid)) {
          rows.push(...row.group.parties.map((party) => ({ kind: "party" as const, party, isChild: true })));
        }
      } else {
        rows.push({ kind: "party", party: row.party, isChild: false });
      }
    }
    return rows;
  }, [alone, expandedSet, groups]);

  const seatWidth = `${Math.max(
    1,
    ...data
      .flatMap((p) => [p.seats_won, p.seats_contested, seatsTotal])
      .map((v) => String(v).length),
    ...groups
      .flatMap((g) => [g.seats_won, g.seats_contested, g.seats_total])
      .map((v) => String(v).length),
  )}ch`;

  const toggle =
    onToggle ??
    ((uid: string) =>
      setOwnExpanded((current) => {
        const next = new Set(current);
        next.has(uid) ? next.delete(uid) : next.add(uid);
        return next;
      }));

  return (
    <div className="overflow-x-auto md:overflow-x-visible">
      <table className="w-full text-left text-body-sm">
        <thead>
          <tr className="border-b-2 border-otl-gray-200 font-medium">
            <th className="sticky left-0 z-20 whitespace-nowrap bg-bg-white py-3 pr-3 text-left">
              {c("party_name") || "Party"}
            </th>
            <th className="whitespace-nowrap px-3 py-3">{c("seats_won") || "Seats Won"}</th>
            <th className="whitespace-nowrap px-3 py-3">{c("votes_won") || "Votes Won"}</th>
            <th className="whitespace-nowrap px-3 py-3">{c("seats_contested") || "Seats Contested"}</th>
          </tr>
        </thead>
        <tbody>
          {showPending && (
            <tr className="group border-b border-otl-gray-200 hover:bg-bg-black-50">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-bg-white py-[11px] pl-2 pr-3 text-left group-hover:bg-bg-black-50">
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-8 shrink-0" aria-hidden="true" />
                  <span className="italic text-txt-black-500">{pendingLabel}</span>
                </div>
              </td>
              <OverviewNumbers
                seats={seatsPending}
                total={seatsTotal}
                seatWidth={seatWidth}
                percentage={seatsTotal ? (seatsPending / seatsTotal) * 100 : 0}
              />
              <td />
              <td />
            </tr>
          )}
          {rows.map((row, index) => {
            if (row.kind === "coalition") {
              const { group } = row;
              const isCollapsed = !expandedSet.has(group.coalition_uid);
              return (
                <tr
                  key={`coalition-${group.coalition_uid}`}
                  className="group cursor-pointer border-b border-otl-gray-200 bg-bg-washed hover:bg-bg-black-50"
                  onClick={() => toggle(group.coalition_uid)}
                >
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-bg-washed py-[11px] pl-2 pr-3 text-left font-semibold group-hover:bg-bg-black-50">
                    <div className="flex items-center gap-1.5">
                      <OverviewLogo uid={group.coalition_uid} name={group.coalition} folder="coalitions" />
                      <span>{group.coalition}</span>
                      <svg
                        className="h-4 w-4 text-txt-black-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d={
                            isCollapsed
                              ? "M5.22 7.72a.75.75 0 0 1 1.06 0L10 11.44l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.78a.75.75 0 0 1 0-1.06Z"
                              : "M14.78 12.28a.75.75 0 0 1-1.06 0L10 8.56l-3.72 3.72a.75.75 0 1 1-1.06-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06Z"
                          }
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </td>
                  <OverviewNumbers
                    seats={group.seats_won}
                    total={group.seats_total}
                    seatWidth={seatWidth}
                    percentage={group.seats_won_perc}
                  />
                  <OverviewNumbers votes={group.votes} voteWidth={voteWidth} percentage={group.votes_perc} />
                  <OverviewNumbers
                    seats={group.seats_contested}
                    total={group.seats_total}
                    seatWidth={seatWidth}
                    percentage={group.seats_contested_perc}
                  />
                </tr>
              );
            }
            const { party, isChild } = row;
            return (
              <tr key={`party-${party.party}-${index}`} className="group border-b border-otl-gray-200 hover:bg-bg-black-50">
                <td
                  className={`sticky left-0 z-10 whitespace-nowrap bg-bg-white py-[11px] pr-3 text-left group-hover:bg-bg-black-50 ${isChild ? "pl-8" : "pl-2"}`}
                >
                  <div className="flex items-center gap-1.5">
                    <OverviewLogo uid={party.party_uid} name={party.party} folder="parties" />
                    <span>{party.party}</span>
                  </div>
                </td>
                <OverviewNumbers
                  seats={party.seats_won}
                  total={seatsTotal}
                  seatWidth={seatWidth}
                  percentage={pct(party.seats_won)}
                />
                <OverviewNumbers votes={party.votes} voteWidth={voteWidth} percentage={party.votes_perc} />
                <OverviewNumbers
                  seats={party.seats_contested}
                  total={seatsTotal}
                  seatWidth={seatWidth}
                  percentage={pct(party.seats_contested)}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Island wrapper — used as <ElectionOverviewIsland client:load /> in Astro pages
interface IslandProps {
  data: ElectionParty[];
  translations: { common: Record<string, any>; elections?: Record<string, any> };
  pendingLabel?: string;
  seatsTotalOverride?: number;
  timeseries?: Timeseries;
  isMalay?: boolean;
}

const VARIABLES: { key: TimeseriesVariable; label: string; fallback: string }[] = [
  { key: "seats_won", label: "seats_won", fallback: "Seats Won" },
  { key: "votes", label: "votes_won", fallback: "Votes Won" },
  { key: "seats_contested", label: "seats_contested", fallback: "Seats Contested" },
];

// Switching election is a full page navigation, so the reader's view settings would
// otherwise reset every time. Coalition UIDs are stable across elections, so the open
// rows carry over too; the picked columns don't, since they are per-election.
const STORE_KEY = "elections-overview-view";
type StoredView = { tab: "snapshot" | "timeseries"; variable: TimeseriesVariable; expanded: string[] };

export default function ElectionOverviewIsland({
  data,
  translations,
  pendingLabel,
  seatsTotalOverride,
  timeseries,
  isMalay = false,
}: IslandProps) {
  const c = (key: string) => tr(translations.common, key);
  const e = (key: string) => tr(translations.elections ?? {}, key);
  const [tab, setTab] = useState<"snapshot" | "timeseries">("snapshot");
  const [variable, setVariable] = useState<TimeseriesVariable>("seats_won");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(timeseries?.selected ?? []);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [restored, setRestored] = useState(false);
  const hasTimeseries = (timeseries?.selected.length ?? 0) > 1;

  const pinnedEdition = timeseries?.editions.find((edition) => edition.election === timeseries.current);
  const groupingNote = (
    e("timeseries_note") ||
    "Coalitions are as fixed as contested in {{election}} ({{year}}) to ensure comparability across elections."
  )
    .replace("{{election}}", electionName(pinnedEdition?.election ?? "", isMalay))
    .replace("{{year}}", pinnedEdition?.year ?? "");

  // Restored after mount, not during render — the server has no sessionStorage, and
  // seeding initial state from it would produce a hydration mismatch.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORE_KEY);
      if (stored) {
        const view = JSON.parse(stored) as StoredView;
        if (view.tab) setTab(view.tab);
        if (view.variable) setVariable(view.variable);
        if (view.expanded) setExpanded(new Set(view.expanded));
      }
    } catch {
      // Private mode / disabled storage — fall back to defaults.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      const view: StoredView = { tab, variable, expanded: [...expanded] };
      sessionStorage.setItem(STORE_KEY, JSON.stringify(view));
    } catch {
      // Nothing to do — persistence is a nicety, not a requirement.
    }
  }, [restored, tab, variable, expanded]);

  const toggleExpanded = (uid: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  const showTimeseries = hasTimeseries && tab === "timeseries";
  const selectedVariable = VARIABLES.find((v) => v.key === variable)!;

  return (
    <div className="space-y-4">
      {hasTimeseries && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex h-8 items-center rounded-lg bg-bg-washed p-0.5">
            {(["snapshot", "timeseries"] as const).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={`flex h-7 items-center rounded-md px-3 text-body-sm font-medium ${
                  tab === name
                    ? "border border-otl-gray-200 bg-bg-dialog-active text-txt-black-900 shadow-button"
                    : "text-txt-black-500"
                }`}
              >
                {e(`tabs.${name}`) || (name === "snapshot" ? "Snapshot" : "Over Time")}
              </button>
            ))}
          </div>
          {showTimeseries && (
            <div className="relative w-fit">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                onBlur={() => setMenuOpen(false)}
                className="flex select-none items-center gap-1.5 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 text-start text-body-sm font-medium text-txt-black-900 shadow-button outline-none hover:border-bg-black-400 active:bg-bg-black-100"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span>{c(selectedVariable.label) || selectedVariable.fallback}</span>
                <svg className="-mx-[5px] h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {menuOpen && (
                <ul className="absolute right-0 top-full z-50 mt-1 min-w-full overflow-y-auto rounded-md bg-bg-white text-left text-txt-black-900 shadow-floating ring-1 ring-otl-gray-200 ring-opacity-5">
                  {VARIABLES.map((v) => (
                    <li key={v.key}>
                      <button
                        type="button"
                        onMouseDown={() => {
                          setVariable(v.key);
                          setMenuOpen(false);
                        }}
                        className="flex w-full select-none items-center gap-2 whitespace-nowrap py-2 pl-4 pr-4 text-left text-body-sm text-txt-black-900 hover:bg-bg-black-100"
                      >
                        <span className={`grow truncate ${v.key === variable ? "font-medium" : "font-normal"}`}>
                          {c(v.label) || v.fallback}
                        </span>
                        {v.key === variable && (
                          <svg className="h-4 w-4 text-primary-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm14.03-2.03a.75.75 0 0 0-1.06-1.06l-4.72 4.72-1.72-1.72a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l5.25-5.25Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {showTimeseries && (
        <p className="mx-auto max-w-2xl text-balance text-center text-body-sm italic text-txt-black-500">
          {groupingNote}
        </p>
      )}

      {showTimeseries ? (
        <ElectionTimeseriesTable
          editions={timeseries!.editions}
          selected={selected}
          onSelect={(index, election) =>
            setSelected((current) => current.map((name, i) => (i === index ? election : name)))
          }
          current={timeseries!.current}
          variable={variable}
          expanded={expanded}
          onToggle={toggleExpanded}
          isMalay={isMalay}
          c={c}
        />
      ) : (
        <ElectionOverviewTable
          data={data}
          c={c}
          pendingLabel={pendingLabel}
          seatsTotalOverride={seatsTotalOverride}
          expanded={expanded}
          onToggle={toggleExpanded}
        />
      )}
    </div>
  );
}
