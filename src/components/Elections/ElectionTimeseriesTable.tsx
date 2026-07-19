import { useMemo, useState } from "react";
import { Bar } from "./ElectionOverviewTable";
import { PartyFlag } from "@components/PartyFlag";
import type { TimeseriesEdition, TimeseriesParty } from "@src/lib/elections";

export type TimeseriesVariable = "seats_won" | "votes" | "seats_contested";

const monoClass = "font-['IBM_Plex_Mono','Roboto_Mono',monospace] tabular-nums";

function num(n: number): string {
  return n.toLocaleString("en-GB");
}

export const electionName = (election: string, isMalay: boolean) =>
  isMalay ? election.replace(/^GE/, "PRU").replace(/^SE/, "PRN") : election;

const editionLabel = (edition: TimeseriesEdition, isMalay: boolean) =>
  edition.year ? `${electionName(edition.election, isMalay)} (${edition.year})` : electionName(edition.election, isMalay);

// A cell is null when the party/coalition did not contest that edition.
type Cell = { value: number; total: number; perc: number } | null;

type Row = {
  uid: string;
  name: string;
  kind: "coalition" | "party";
  isChild: boolean;
  cells: Cell[];
};

const key = (p: TimeseriesParty) => p.party_uid ?? p.party;
const inCoalition = (p: TimeseriesParty) => !!p.coalition_uid && p.coalition_uid !== "000-ALONE";

function ColumnPicker({
  editions,
  value,
  disabled,
  isMalay,
  onChange,
}: {
  editions: TimeseriesEdition[];
  value: TimeseriesEdition;
  disabled: string[];
  isMalay: boolean;
  onChange: (election: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative w-fit">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="flex select-none items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-start text-body-sm font-medium text-txt-black-900 outline-none hover:bg-bg-black-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{editionLabel(value, isMalay)}</span>
        <svg className="-mr-1 h-4 w-4 shrink-0 text-txt-black-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-60 min-w-full overflow-y-auto rounded-md bg-bg-white text-left font-normal text-txt-black-900 shadow-floating ring-1 ring-otl-gray-200 ring-opacity-5">
          {editions.map((edition) => {
            const isTaken = disabled.includes(edition.election) && edition.election !== value.election;
            return (
              <li key={edition.election}>
                <button
                  type="button"
                  disabled={isTaken}
                  onMouseDown={() => {
                    onChange(edition.election);
                    setOpen(false);
                  }}
                  className="flex w-full select-none items-center gap-2 whitespace-nowrap py-2 pl-4 pr-4 text-left text-body-sm text-txt-black-900 hover:bg-bg-black-100 disabled:cursor-not-allowed disabled:text-txt-black-400 disabled:hover:bg-transparent"
                >
                  <span className={`grow truncate ${edition.election === value.election ? "font-medium" : "font-normal"}`}>
                    {editionLabel(edition, isMalay)}
                  </span>
                  {edition.election === value.election && (
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
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ElectionTimeseriesTable({
  editions,
  selected,
  onSelect,
  current,
  variable,
  expanded,
  onToggle,
  isMalay,
  c,
}: {
  editions: TimeseriesEdition[];
  selected: string[];
  onSelect: (index: number, election: string) => void;
  current: string;
  variable: TimeseriesVariable;
  expanded: Set<string>;
  onToggle: (uid: string) => void;
  isMalay: boolean;
  c: (key: string) => string;
}) {
  const columns = useMemo(
    () => selected.map((name) => editions.find((edition) => edition.election === name)!).filter(Boolean),
    [editions, selected],
  );

  const { groups, alone, cellsFor } = useMemo(() => {
    const denominator = (column: TimeseriesEdition) =>
      variable === "votes" ? column.votesTotal : column.seatsTotal;

    // Groupings are pinned to the page's own election, so they don't shift under the
    // reader when a column is swapped. A party with no coalition there — including one
    // that had since dissolved, or not yet formed — stands alone rather than being
    // filed under a bloc it wasn't in that year.
    const pinned = new Map(
      (editions.find((edition) => edition.election === current)?.parties ?? []).map((p) => [key(p), p]),
    );

    const seen = new Map<string, TimeseriesParty>();
    for (const column of columns) {
      for (const party of column.parties) {
        if (!seen.has(key(party))) seen.set(key(party), party);
      }
    }

    const cellsFor = (uids: string[]): Cell[] =>
      columns.map((column) => {
        const members = column.parties.filter((p) => uids.includes(key(p)));
        if (members.length === 0) return null;
        const value = members.reduce((sum, p) => sum + p[variable], 0);
        const total = denominator(column);
        return { value, total, perc: total ? (value / total) * 100 : 0 };
      });

    const grouped = new Map<string, TimeseriesParty[]>();
    const alone: TimeseriesParty[] = [];
    for (const party of seen.values()) {
      const asPinned = pinned.get(key(party));
      if (asPinned && inCoalition(asPinned)) {
        grouped.set(asPinned.coalition_uid!, [...(grouped.get(asPinned.coalition_uid!) ?? []), asPinned]);
      } else {
        alone.push(party);
      }
    }

    const groups = [...grouped.entries()].map(([coalition_uid, parties]) => ({
      coalition_uid,
      coalition: parties[0]?.coalition ?? coalition_uid,
      parties,
      cells: cellsFor(parties.map(key)),
    }));

    return { groups, alone, cellsFor };
  }, [columns, current, editions, variable]);

  // Rank on the leftmost column, breaking ties on each column in turn — otherwise every
  // row that scored zero in the newest election lands in an arbitrary order. A row that
  // did not contest an election sorts below one that contested it and won nothing.
  const compare = (a: Cell[], b: Cell[]) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const diff = (b[i]?.value ?? -1) - (a[i]?.value ?? -1);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  const rows = useMemo(() => {
    const rows: Row[] = [];
    const top = [
      ...groups.map((group) => ({ cells: group.cells, group })),
      ...alone.map((party) => ({ cells: cellsFor([key(party)]), party })),
    ].sort((a, b) => compare(a.cells, b.cells));

    for (const entry of top) {
      if ("group" in entry) {
        const { group } = entry;
        rows.push({
          uid: group.coalition_uid,
          name: group.coalition,
          kind: "coalition",
          isChild: false,
          cells: group.cells,
        });
        if (expanded.has(group.coalition_uid)) {
          rows.push(
            ...group.parties
              .map((party) => ({
                uid: key(party),
                name: party.party,
                kind: "party" as const,
                isChild: true,
                cells: cellsFor([key(party)]),
              }))
              .sort((a, b) => compare(a.cells, b.cells)),
          );
        }
      } else {
        rows.push({
          uid: key(entry.party),
          name: entry.party.party,
          kind: "party",
          isChild: false,
          cells: cellsFor([key(entry.party)]),
        });
      }
    }
    return rows;
  }, [alone, cellsFor, expanded, groups]);

  const showTotal = variable !== "votes";
  const allCells = rows.flatMap((row) => row.cells);
  const valueWidth = `${Math.max(1, ...allCells.map((cell) => (cell ? num(cell.value).length : 1)))}ch`;
  const totalWidth = `${Math.max(1, ...allCells.map((cell) => (cell ? num(cell.total).length : 1)))}ch`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-body-sm">
        <thead>
          <tr className="border-b-2 border-otl-gray-200 font-medium">
            <th className="sticky left-0 z-20 whitespace-nowrap bg-bg-white py-3 pr-3 text-left">
              {c("party_name") || "Party"}
            </th>
            {columns.map((column, index) => (
              <th key={column.election} className="px-2 py-2">
                <ColumnPicker
                  editions={editions}
                  value={column}
                  disabled={selected}
                  isMalay={isMalay}
                  onChange={(election) => onSelect(index, election)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isCoalition = row.kind === "coalition";
            const isCollapsed = !expanded.has(row.uid);
            return (
              <tr
                key={`${row.kind}-${row.uid}`}
                className={`group border-b border-otl-gray-200 hover:bg-bg-black-50 ${isCoalition ? "cursor-pointer bg-bg-washed" : ""}`}
                onClick={isCoalition ? () => onToggle(row.uid) : undefined}
              >
                <td
                  className={`sticky left-0 z-10 whitespace-nowrap py-[11px] pr-3 text-left group-hover:bg-bg-black-50 ${
                    isCoalition ? "bg-bg-washed pl-2 font-semibold" : `bg-bg-white ${row.isChild ? "pl-8" : "pl-2"}`
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <PartyFlag uid={row.uid} name={row.name} folder={isCoalition ? "coalitions" : "parties"} />
                    <span>{row.name}</span>
                    {isCoalition && (
                      <svg className="h-4 w-4 text-txt-black-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
                    )}
                  </div>
                </td>
                {row.cells.map((cell, index) => (
                  <td key={columns[index].election} className={`px-4 py-[11px] ${monoClass}`}>
                    {cell ? (
                      <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
                        <Bar value={cell.perc} />
                        <span className="whitespace-nowrap">
                          <span className="inline-block text-right" style={{ minWidth: valueWidth }}>
                            {num(cell.value)}
                          </span>
                          {showTotal && (
                            <>
                              <span className="inline-block w-[3ch] text-center">/</span>
                              <span className="inline-block text-right" style={{ minWidth: totalWidth }}>
                                {num(cell.total)}
                              </span>
                            </>
                          )}{" "}
                          ({cell.perc.toFixed(1)}%)
                        </span>
                      </div>
                    ) : (
                      <span className="text-txt-black-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
