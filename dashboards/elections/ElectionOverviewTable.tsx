import { Party } from "@dashboards/types";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import BarPerc from "@charts/bar-perc";
import { ImageWithFallback } from "@components/index";
import { clx, numFormat } from "@lib/helpers";
import { useTranslation } from "@hooks/useTranslation";
import { FunctionComponent, useEffect, useMemo, useState } from "react";

type PartyWithUid = Party & { party_uid?: string; votes_total?: number };

interface CoalitionGroup {
  coalition_uid: string;
  coalition: string;
  parties: PartyWithUid[];
  seats_won: number;
  seats_contested: number;
  votes: number;
  seats_total: number;
  votes_total: number;
  seats_won_perc: number;
  seats_contested_perc: number;
  votes_perc: number;
}

type DisplayRow =
  | { kind: "coalition"; group: CoalitionGroup }
  | { kind: "party"; party: PartyWithUid; isChild: boolean };

interface ElectionOverviewTableProps {
  data: PartyWithUid[];
  isLoading?: boolean;
  className?: string;
}

const ElectionOverviewTable: FunctionComponent<ElectionOverviewTableProps> = ({
  data,
  className = "",
}) => {
  const { t } = useTranslation(["common", "elections"]);

  const { coalitionGroups, aloneParties, seatsTotal } = useMemo(() => {
    const groupMap = new Map<string, PartyWithUid[]>();
    const alone: PartyWithUid[] = [];
    let seats_total = 222;
    let votes_total = 0;

    for (const party of data) {
      if (party.seats_total) seats_total = party.seats_total;
      if (party.votes_total) votes_total = party.votes_total;
      if (!party.coalition_uid || party.coalition_uid === "00-ALONE") {
        alone.push(party);
      } else {
        const existing = groupMap.get(party.coalition_uid) ?? [];
        groupMap.set(party.coalition_uid, [...existing, party]);
      }
    }

    const groups: CoalitionGroup[] = [];
    for (const [uid, parties] of groupMap.entries()) {
      const seats_won = parties.reduce((s, p) => s + p.seats_won, 0);
      const seats_contested = parties.reduce((s, p) => s + p.seats_contested, 0);
      const votes = parties.reduce((s, p) => s + p.votes, 0);
      const coalition = parties[0].coalition ?? uid;
      const sortedParties = [...parties].sort((a, b) => b.seats_won - a.seats_won);
      groups.push({
        coalition_uid: uid,
        coalition,
        parties: sortedParties,
        seats_won,
        seats_contested,
        votes,
        seats_total,
        votes_total,
        seats_won_perc: (seats_won / seats_total) * 100,
        seats_contested_perc: (seats_contested / seats_total) * 100,
        votes_perc: votes_total > 0 ? (votes / votes_total) * 100 : 0,
      });
    }

    groups.sort((a, b) => b.seats_won - a.seats_won);
    alone.sort((a, b) => b.seats_won - a.seats_won);

    return { coalitionGroups: groups, aloneParties: alone, seatsTotal: seats_total };
  }, [data]);

  const allCoalitionIds = useMemo(
    () => new Set(coalitionGroups.map((g) => g.coalition_uid)),
    [coalitionGroups],
  );

  // Default: collapsed on both mobile and desktop
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    setCollapsed(new Set(allCoalitionIds));
  }, [allCoalitionIds]);

  const toggleCollapse = (uid: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const displayRows = useMemo((): DisplayRow[] => {
    const rows: DisplayRow[] = [];
    const entries = [
      ...coalitionGroups.map((g) => ({ kind: "coalition" as const, group: g, seats_won: g.seats_won })),
      ...aloneParties.map((p) => ({ kind: "party" as const, party: p, seats_won: p.seats_won })),
    ].sort((a, b) => b.seats_won - a.seats_won);

    for (const entry of entries) {
      if (entry.kind === "coalition") {
        rows.push({ kind: "coalition", group: entry.group });
        if (!collapsed.has(entry.group.coalition_uid)) {
          for (const party of entry.group.parties) {
            rows.push({ kind: "party", party, isChild: true });
          }
        }
      } else {
        rows.push({ kind: "party", party: entry.party, isChild: false });
      }
    }
    return rows;
  }, [coalitionGroups, aloneParties, collapsed]);

  const barSize = "w-[100px] h-[5px]";
  const mobileBarSize = "w-[60px] h-[5px]";

  const renderSeatsWon = (value: number, perc: number, total: number, mobile = false) => (
    <div className={clx("flex items-center gap-2", !mobile && "md:flex-col md:items-start lg:flex-row lg:items-center")}>
      {!mobile && <div><BarPerc hidden value={perc} size={barSize} /></div>}
      {mobile && <BarPerc hidden value={perc} size={mobileBarSize} />}
      <p className="whitespace-nowrap">{`${value} / ${total} (${numFormat(perc, "compact", [1, 1])}%)`}</p>
    </div>
  );

  const renderSeatsContested = (value: number, perc: number, total: number, mobile = false) => (
    <div className={clx("flex items-center gap-2", !mobile && "md:flex-col md:items-start lg:flex-row lg:items-center")}>
      {!mobile && <div><BarPerc hidden value={perc} size={barSize} /></div>}
      {mobile && <BarPerc hidden value={perc} size={mobileBarSize} />}
      <p className="whitespace-nowrap">{`${value} / ${total} (${numFormat(perc, "compact", [1, 1])}%)`}</p>
    </div>
  );

  const renderVotes = (value: number, perc: number, mobile = false) => (
    <div className={clx("flex items-center gap-2", !mobile && "md:flex-col md:items-start lg:flex-row lg:items-center")}>
      {!mobile && <div className="lg:self-center"><BarPerc hidden value={perc} size={barSize} /></div>}
      {mobile && <BarPerc hidden value={perc} size={mobileBarSize} />}
      <span className="whitespace-nowrap">
        {numFormat(value, "standard")} ({numFormat(perc, "compact", [1, 1])}%)
      </span>
    </div>
  );

  return (
    <div className={clx("relative pt-6", className)}>
      {/* ── Desktop table ── */}
      <div className="hidden md:block">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr>
              <th className="whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white py-3 pl-4 pr-3 font-medium">
                {t("party_name")}
              </th>
              <th className="whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white px-3 py-3 font-medium">
                {t("seats_won")}
              </th>
              <th className="whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white px-3 py-3 font-medium">
                {t("votes_won")}
              </th>
              <th className="whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white px-3 py-3 font-medium">
                {t("seats_contested")}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              if (row.kind === "coalition") {
                const { group } = row;
                const isCollapsed = collapsed.has(group.coalition_uid);
                return (
                  <tr
                    key={`coalition-${group.coalition_uid}`}
                    className="cursor-pointer border-b border-otl-gray-200 bg-bg-washed hover:bg-bg-black-50"
                    onClick={() => toggleCollapse(group.coalition_uid)}
                  >
                    <td className="py-[11px] pl-4 pr-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex h-4.5 w-8 justify-center">
                          <ImageWithFallback
                            className="border border-otl-gray-200"
                            src={`/static/images/coalitions/${group.coalition_uid}.png`}
                            width={32}
                            height={18}
                            alt={group.coalition}
                          />
                        </div>
                        <span className="font-semibold">{group.coalition}</span>
                        <span className="ml-1 text-txt-black-500">
                          {isCollapsed ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-[11px]">
                      {renderSeatsWon(group.seats_won, group.seats_won_perc, group.seats_total)}
                    </td>
                    <td className="px-3 py-[11px]">
                      {renderVotes(group.votes, group.votes_perc)}
                    </td>
                    <td className="px-3 py-[11px]">
                      {renderSeatsContested(group.seats_contested, group.seats_contested_perc, group.seats_total)}
                    </td>
                  </tr>
                );
              }

              const { party, isChild } = row;
              const logoSrc = party.party_uid
                ? `/static/images/parties/${party.party_uid}.png`
                : "/static/images/parties/_fallback_.png";
              return (
                <tr key={`party-${party.party}-${idx}`} className="border-b border-otl-gray-200">
                  <td className={clx("py-[11px] pr-3", isChild ? "pl-10" : "pl-4")}>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex h-4.5 w-8 justify-center">
                        <ImageWithFallback
                          className="border border-otl-gray-200"
                          src={logoSrc}
                          width={32}
                          height={18}
                          alt={party.party}
                        />
                      </div>
                      <span>{party.party}</span>
                    </div>
                  </td>
                  <td className="px-3 py-[11px]">
                    {renderSeatsWon(party.seats_won, party.seats_won_perc, party.seats_total)}
                  </td>
                  <td className="px-3 py-[11px]">
                    {renderVotes(party.votes, party.votes_perc)}
                  </td>
                  <td className="px-3 py-[11px]">
                    {renderSeatsContested(party.seats_contested, party.seats_contested_perc, party.seats_total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile simple table ── */}
      <div className="overflow-x-auto md:hidden">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-30 whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white py-3 pl-4 pr-3 font-medium">
                {t("party_name")}
              </th>
              <th className="whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white px-3 py-3 font-medium">
                {t("seats_won")}
                <span className="font-normal text-txt-black-500">{` / ${seatsTotal}`}</span>
              </th>
              <th className="whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white px-3 py-3 font-medium">
                {t("votes_won")}
              </th>
              <th className="whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white px-3 py-3 font-medium">
                {t("seats_contested")}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              if (row.kind === "coalition") {
                const { group } = row;
                const isCollapsed = collapsed.has(group.coalition_uid);
                return (
                  <tr
                    key={`m-coalition-${group.coalition_uid}`}
                    className="cursor-pointer border-b border-otl-gray-200 bg-bg-washed"
                    onClick={() => toggleCollapse(group.coalition_uid)}
                  >
                    <td className="sticky left-0 z-10 w-px whitespace-nowrap bg-bg-washed py-[11px] pl-4 pr-3 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex h-4.5 w-8 shrink-0 justify-center">
                          <ImageWithFallback
                            className="border border-otl-gray-200"
                            src={`/static/images/coalitions/${group.coalition_uid}.png`}
                            width={32}
                            height={18}
                            alt={group.coalition}
                          />
                        </div>
                        <span>{group.coalition}</span>
                        <span className="text-txt-black-500">
                          {isCollapsed ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-[11px]">
                      <span className="whitespace-nowrap">
                        {`${group.seats_won} (${numFormat(group.seats_won_perc, "compact", [1, 1])}%)`}
                      </span>
                    </td>
                    <td className="px-3 py-[11px]">
                      <span className="whitespace-nowrap">
                        {`${numFormat(group.votes, "standard")} (${numFormat(group.votes_perc, "compact", [1, 1])}%)`}
                      </span>
                    </td>
                    <td className="px-3 py-[11px]">
                      <span className="whitespace-nowrap">
                        {`${group.seats_contested} (${numFormat(group.seats_contested_perc, "compact", [1, 1])}%)`}
                      </span>
                    </td>
                  </tr>
                );
              }

              const { party, isChild } = row;
              const logoSrc = party.party_uid
                ? `/static/images/parties/${party.party_uid}.png`
                : "/static/images/parties/_fallback_.png";
              return (
                <tr key={`m-party-${party.party}-${idx}`} className="border-b border-otl-gray-200">
                  <td
                    className={clx(
                      "sticky left-0 z-10 w-px whitespace-nowrap bg-bg-white py-[11px] pr-3",
                      isChild ? "pl-9" : "pl-4",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex h-4.5 w-8 shrink-0">
                        <ImageWithFallback
                          className="border border-otl-gray-200"
                          src={logoSrc}
                          width={32}
                          height={18}
                          alt={party.party}
                        />
                      </div>
                      <span className="font-medium">{party.party}</span>
                    </div>
                  </td>
                  <td className="px-3 py-[11px]">
                    <span className="whitespace-nowrap">
                      {`${party.seats_won} (${numFormat(party.seats_won_perc, "compact", [1, 1])}%)`}
                    </span>
                  </td>
                  <td className="px-3 py-[11px]">
                    <span className="whitespace-nowrap">
                      {`${numFormat(party.votes, "standard")} (${numFormat(party.votes_perc, "compact", [1, 1])}%)`}
                    </span>
                  </td>
                  <td className="px-3 py-[11px]">
                    <span className="whitespace-nowrap">
                      {`${party.seats_contested} (${numFormat(party.seats_contested_perc, "compact", [1, 1])}%)`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ElectionOverviewTable;
