import { useState, useEffect, useMemo, useRef } from "react";

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
  return (
    <div className={`flex overflow-x-hidden rounded-full bg-bg-washed ${size}`}>
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
      <span className="flex h-4 w-8 shrink-0 items-center justify-center border border-otl-gray-200 text-xs text-txt-black-400">
        ?
      </span>
    );
  }
  return (
    <span className="relative flex h-4 w-8 shrink-0 items-center justify-center border border-otl-gray-200 text-xs text-txt-black-400">
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
  percentage: number;
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
  votes_perc: number;
};

type OverviewRow =
  | { kind: "coalition"; group: CoalitionGroup }
  | { kind: "party"; party: ElectionParty; isChild: boolean };

export function ElectionOverviewTable({ data, c }: { data: ElectionParty[]; c: (key: string) => string }) {
  const coalitionVotes = Object.values(
    data.reduce(
      (totals, party) => {
        if (party.coalition_uid && party.coalition_uid !== "00-ALONE") {
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
      if (!party.coalition_uid || party.coalition_uid === "00-ALONE") {
        alone.push(party);
      } else {
        grouped.set(party.coalition_uid, [...(grouped.get(party.coalition_uid) ?? []), party]);
      }
    }

    const groups = [...grouped.entries()].map(([coalition_uid, parties]) => {
      const seats_total = parties[0]?.seats_total ?? 0;
      const seats_won = parties.reduce((sum, p) => sum + p.seats_won, 0);
      const seats_contested = parties.reduce((sum, p) => sum + p.seats_contested, 0);
      const votes = parties.reduce((sum, p) => sum + p.votes, 0);
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

  const coalitionIds = useMemo(() => groups.map((g) => g.coalition_uid), [groups]);
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
    ...data
      .flatMap((p) => [p.seats_won, p.seats_contested, p.seats_total])
      .map((v) => String(v).length),
    ...groups
      .flatMap((g) => [g.seats_won, g.seats_contested, g.seats_total])
      .map((v) => String(v).length),
  )}ch`;

  const toggle = (uid: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });

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
          {rows.map((row, index) => {
            if (row.kind === "coalition") {
              const { group } = row;
              const isCollapsed = collapsed.has(group.coalition_uid);
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
                  total={party.seats_total}
                  seatWidth={seatWidth}
                  percentage={party.seats_won_perc}
                />
                <OverviewNumbers votes={party.votes} voteWidth={voteWidth} percentage={party.votes_perc} />
                <OverviewNumbers
                  seats={party.seats_contested}
                  total={party.seats_total}
                  seatWidth={seatWidth}
                  percentage={party.seats_contested_perc}
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
  translations: { common: Record<string, any> };
}

export default function ElectionOverviewIsland({ data, translations }: IslandProps) {
  const c = (key: string) => tr(translations.common, key);
  return <ElectionOverviewTable data={data} c={c} />;
}
