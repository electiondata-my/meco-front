import ResultBadge from "@components/Election/ResultBadge";
import { ElectionResult } from "@dashboards/types";
import { FaceFrownIcon } from "@heroicons/react/24/outline";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import BarPerc from "@charts/bar-perc";
import { ImageWithFallback, Skeleton } from "@components/index";
import { clx, numFormat, toDate } from "@lib/helpers";
import { useTranslation } from "@hooks/useTranslation";
import { FunctionComponent, ReactNode } from "react";
export interface ElectionTableProps {
  className?: string;
  fullBorder?: boolean;
  alternateTextColor?: boolean;
  title?: string | ReactNode;
  empty?: string | ReactNode;
  data?: any;
  columns: Array<ColumnDef<any, any>>;
  highlightedRows?: Array<number>;
  highlighted?: string;
  result?: ElectionResult;
  isLoading: boolean;
  headerClassName?: string;
  /** When true, mobile party cell does not show row.original.name (e.g. for candidates page where name is redundant). */
  hideNameInMobileParty?: boolean;
  /** Column ids that display only the percentage (e.g. ["majority", "voter_turnout"] for seats table). */
  percentOnlyColumns?: string[];
  /** When true, reduces left padding on first column (e.g. for modal/dialog contexts). */
  compactFirstColumn?: boolean;
  /** When "short", party column shows party code + (coalition) instead of full translated name. */
  partyNameDisplay?: "full" | "short";
  /** When true, first column uses whitespace-nowrap so it sizes to content without wrapping. */
  firstColumnNoWrap?: boolean;
  /** When true, uses a smaller bar width for percentage columns (e.g. in modals). */
  compactBars?: boolean;
  /** When true, renders a compact table on mobile instead of the verbose card layout. seats_total is shown once in the Seats Won header. */
  simpleMobileTable?: boolean;
  /** When true, wraps the desktop table in its own fixed-height scroll container (max 14.5 rows). Mirrors the mobile simpleMobileTable scroll behaviour. */
  scrollable?: boolean;
  /** When true, renders a compact 3-column table on mobile (Name | Party | Votes Won) for use in the FullResult modal drawer. */
  compactMobileTable?: boolean;
}

type TableIds =
  | "index"
  | "party"
  | "coalition"
  | "election_name"
  | "name"
  | "votes"
  | "majority"
  | "voter_turnout"
  | "seats"
  | "seats_contested"
  | "seats_won"
  | "seat"
  | "result"
  | "full_result";

/**
 * Format election name for display: name + year, with locale-specific abbreviations.
 * - By-Election → "By-Elec" (en) / "PRK" (ms)
 * - Malay: GE- → PRU-, SE- → PRN-
 */
const formatElectionDisplay = (
  electionName: string,
  date: string | undefined,
  locale: string,
): string => {
  const isMalay = locale?.startsWith("ms");
  const year = date ? toDate(date, "yyyy", locale) : "";
  const suffix = year ? ` (${year})` : "";

  if (electionName === "By-Election") {
    return (isMalay ? "PRK" : "By-Elec") + suffix;
  }
  let displayName = electionName;
  if (isMalay) {
    displayName = displayName.replace(/^GE-/g, "PRU-").replace(/^SE-/g, "PRN-");
  }
  return displayName + suffix;
};

const ElectionTable: FunctionComponent<ElectionTableProps> = ({
  className = "",
  fullBorder,
  alternateTextColor,
  title,
  empty,
  data = dummyData,
  columns,
  highlightedRows,
  highlighted,
  isLoading = false,
  headerClassName,
  hideNameInMobileParty = false,
  percentOnlyColumns = [],
  compactFirstColumn = false,
  partyNameDisplay = "full",
  firstColumnNoWrap = false,
  compactBars = false,
  simpleMobileTable = false,
  scrollable = false,
  compactMobileTable = false,
}) => {
  const { t, i18n } = useTranslation(["common", "election", "party"]);
  const barSize = compactBars ? "w-[72px] h-[5px]" : "w-[100px] h-[5px]";

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  /**
   * Special cells
   * keys: party | election_name | seats | result | votes | majority
   */
  const lookupDesktop = (id: TableIds, cell: any, highlight: boolean) => {
    const value = cell.getValue();
    let percent;
    switch (id) {
      case "index":
        return highlight ? <p className="text-primary-600">{value}</p> : value;
      case "name":
        return highlight ? (
          <p>
            {value}
            <span className="ml-1 inline-flex translate-y-0.5">
              <ResultBadge hidden value={cell.row.original.result} />
            </span>
          </p>
        ) : (
          value
        );
      case "election_name":
        return (
          <div className="w-fit whitespace-nowrap">
            {formatElectionDisplay(
              value,
              cell.row.original.date,
              i18n.language ?? "en-GB",
            )}
          </div>
        );
      case "party": {
        const logoId = cell.row.original.party_uid;
        const coalition = cell.row.original.coalition;
        const useShortName =
          partyNameDisplay === "short" ||
          table
            .getAllColumns()
            .map((col) => col.id)
            .includes("full_result");
        const partyName = useShortName ? value : t(`party:${value}`);
        const partyLogoSrc = logoId
          ? `/static/images/parties/${logoId}.png`
          : "/static/images/parties/_fallback_.png";
        return (
          <div className="flex items-center gap-1.5">
            <div className="relative flex h-4.5 w-8 justify-center">
              <ImageWithFallback
                className="border border-otl-gray-200"
                src={partyLogoSrc}
                width={32}
                height={18}
                alt={value}
              />
            </div>
            <span>
              {coalition && coalition !== "ALONE"
                ? `${partyName} (${coalition})`
                : partyName}
            </span>
          </div>
        );
      }
      case "coalition": {
        if (!value || value === "ALONE") return <span className="font-light">&nbsp;&nbsp;—</span>;
        const coalitionUid = cell.row.original.coalition_uid;
        const coalitionLogoSrc = coalitionUid
          ? `/static/images/coalitions/${coalitionUid}.png`
          : "/static/images/coalitions/_fallback_.png";
        return (
          <div className="flex items-center gap-1.5">
            <div className="relative flex h-4.5 w-8 justify-center">
              <ImageWithFallback
                className="border border-otl-gray-200"
                src={coalitionLogoSrc}
                width={32}
                height={18}
                alt={value}
              />
            </div>
            <span>{value}</span>
          </div>
        );
      }
      case "seats":
        percent = cell.row.original.seats_perc;
        const total = cell.row.original.seats_total;
        return (
          <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
            <div>
              <BarPerc hidden value={percent} size={barSize} />
            </div>
            <p className="whitespace-nowrap">{`${value} / ${total} ${percent !== null
                ? ` (${numFormat(percent, "compact", [1, 1])}%)`
                : " (—)"
              }`}</p>
          </div>
        );
      case "seats_contested":
      case "seats_won": {
        const seatsPerc = cell.row.original[id + "_perc"];
        const seatsTotal = cell.row.original.seats_total;
        return (
          <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
            <div>
              <BarPerc hidden value={seatsPerc} size={barSize} />
            </div>
            <p className="whitespace-nowrap">{`${value} / ${seatsTotal}${seatsPerc !== null
                ? ` (${numFormat(seatsPerc, "compact", [1, 1])}%)`
                : " (—)"
              }`}</p>
          </div>
        );
      }
      case "result":
        return <ResultBadge value={value} />;

      case "votes":
      case "majority":
      case "voter_turnout": {
        percent = cell.row.original[id + "_perc"];
        const showPercentOnly = percentOnlyColumns.includes(id);
        if (showPercentOnly) {
          return (
            <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
              <div className="lg:self-center">
                <BarPerc hidden value={percent} size={barSize} />
              </div>
              <span className="whitespace-nowrap">
                {percent != null
                  ? `${numFormat(percent, "compact", [1, 1])}%`
                  : "—"}
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
            <div className="lg:self-center">
              <BarPerc hidden value={percent} size={barSize} />
            </div>
            <span className="whitespace-nowrap">
              {value !== null ? numFormat(value, "standard") : `—`}
              {percent !== null
                ? ` (${numFormat(percent, "compact", [1, 1])}%)`
                : " (—)"}
            </span>
          </div>
        );
      }
      default:
        return flexRender(cell.column.columnDef.cell, cell.getContext());
    }
  };

  const lookupMobile = (id: TableIds, cell: any, highlight: boolean) => {
    if (!cell) return <></>;
    const value = cell.getValue();
    let percent;

    switch (id) {
      case "index":
        return highlight ? (
          <p className="font-bold text-primary-600">#{value}</p>
        ) : (
          <>#{value}</>
        );
      case "party": {
        const logoId = cell.row.original.party_uid;
        const coalition = cell.row.original.coalition;
        const useShortName = partyNameDisplay === "short";
        const partyLabel =
          coalition && coalition !== "ALONE"
            ? useShortName
              ? `${value} (${coalition})`
              : `${value} / ${coalition}`
            : useShortName
              ? value
              : t(`party:${value}`);
        const partyLogoSrc = logoId
          ? `/static/images/parties/${logoId}.png`
          : "/static/images/parties/_fallback_.png";
        const showName = !hideNameInMobileParty && cell.row.original.name;
        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="relative flex h-4.5 w-8 shrink-0">
              <ImageWithFallback
                className="border border-otl-gray-200"
                src={partyLogoSrc}
                width={32}
                height={18}
                alt={value}
              />
            </div>
            {showName ? (
              <span className="flex min-w-0 flex-1 items-center gap-1 whitespace-nowrap">
                <span
                  className="truncate font-medium"
                  title={cell.row.original.name}
                >
                  {cell.row.original.name}
                </span>
                <span className="shrink-0">{`(${partyLabel})`}</span>
                {highlight && (
                  <span className="shrink-0 translate-y-0.5">
                    <ResultBadge hidden value={cell.row.original.result} />
                  </span>
                )}
              </span>
            ) : (
              <span className="font-medium">
                {partyLabel}
                {highlight && (
                  <span className="ml-1 inline-flex translate-y-0.5">
                    <ResultBadge hidden value={cell.row.original.result} />
                  </span>
                )}
              </span>
            )}
          </div>
        );
      }
      case "coalition": {
        if (!value || value === "ALONE") return null;
        const coalitionUid = cell.row.original.coalition_uid;
        const coalitionLogoSrc = coalitionUid
          ? `/static/images/coalitions/${coalitionUid}.png`
          : "/static/images/coalitions/_fallback_.png";
        return (
          <div className="flex items-center gap-1.5">
            <div className="relative flex h-4.5 w-8 justify-center">
              <ImageWithFallback
                className="border border-otl-gray-200"
                src={coalitionLogoSrc}
                width={32}
                height={18}
                alt={value}
              />
            </div>
            <span>{value}</span>
          </div>
        );
      }
      case "election_name":
        return (
          <p className="font-medium">
            {formatElectionDisplay(
              value,
              cell.row.original.date,
              i18n.language ?? "en-GB",
            )}
          </p>
        );
      case "seats":
        percent = cell.row.original.seats_perc;
        const total = cell.row.original.seats_total;
        return (
          <div className="flex flex-col space-y-1">
            <p className="font-medium text-txt-black-500">
              {flexRender(cell.column.columnDef.header, cell.getContext())}
            </p>
            <div className="flex items-center gap-2">
              <BarPerc hidden value={percent} />
              <p>
                {`${value} / ${total}
                 (${percent !== null
                    ? `${numFormat(percent, "compact", [1, 1])}%`
                    : "(—)"
                  })`}
              </p>
            </div>
          </div>
        );
      case "seats_contested":
      case "seats_won": {
        const seatsPerc = cell.row.original[id + "_perc"];
        const seatsTotal = cell.row.original.seats_total;
        return (
          <div className="flex flex-col space-y-1">
            <p className="font-medium text-txt-black-500">
              {flexRender(cell.column.columnDef.header, cell.getContext())}
            </p>
            <div className="flex items-center gap-2">
              <BarPerc hidden value={seatsPerc} />
              <p>{`${value} / ${seatsTotal} (${seatsPerc !== null
                  ? `${numFormat(seatsPerc, "compact", [1, 1])}%`
                  : "—"
                })`}</p>
            </div>
          </div>
        );
      }
      case "votes":
        percent = cell.row.original.votes_perc;
        return (
          <div className="flex flex-col space-y-1">
            <p className="font-medium text-txt-black-500">
              {flexRender(cell.column.columnDef.header, cell.getContext())}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <BarPerc hidden value={percent} size="w-[40px] h-[5px]" />
              <p>{`${value !== null ? numFormat(value, "standard") : "—"} (${percent !== null
                  ? `${numFormat(percent, "compact", [1, 1])}%`
                  : "—"
                })`}</p>
            </div>
          </div>
        );
      case "majority":
      case "voter_turnout": {
        percent = cell.row.original[id + "_perc"];
        if (percentOnlyColumns.includes(id)) {
          return (
            <div className="flex flex-col space-y-1">
              <p className="font-medium text-txt-black-500">
                {flexRender(cell.column.columnDef.header, cell.getContext())}
              </p>
              <div className="flex items-center gap-2">
                <BarPerc hidden value={percent} size="w-[40px] h-[5px]" />
                <p>{percent != null ? `${numFormat(percent, "compact", [1, 1])}%` : "—"}</p>
              </div>
            </div>
          );
        }
        if (id === "majority") {
          return (
            <div className="flex flex-row gap-2">
              <p className="font-medium text-txt-black-500">
                {flexRender(cell.column.columnDef.header, cell.getContext())}
              </p>
              {typeof value === "number" ? (
                <p className="font-bold">{value}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <BarPerc hidden value={percent} size="w-[40px] h-[5px]" />
                  <p>{`${value !== null ? numFormat(value, "standard") : "—"} (${percent !== null
                      ? `${numFormat(percent, "compact", [1, 1])}%`
                      : "—"
                    })`}</p>
                </div>
              )}
            </div>
          );
        }
        return null;
      }
      case "result":
        return (
          <div className="flex flex-col space-y-1">
            <p className="font-medium text-txt-black-500">
              {flexRender(cell.column.columnDef.header, cell.getContext())}
            </p>
            <ResultBadge value={value} />
          </div>
        );
      default:
        return flexRender(cell.column.columnDef.cell, cell.getContext());
    }
  };

  const isHighlighted = (row: any) => {
    if (highlightedRows) return highlightedRows.includes(row.index);
    else if ("name" in row.original) return row.original.name === highlighted;
    else if ("party" in row.original) return row.original.party === highlighted;
    else return false;
  };

  // Add this component for explanation rows
  const ExplanationRow: FunctionComponent<{
    change_en: string;
    change_ms?: string;
  }> = ({ change_en, change_ms }) => {
    const { i18n } = useTranslation();
    const isMalay = i18n.language && i18n.language.startsWith("ms");
    return (
      <tr>
        <td
          colSpan={100}
          className="border-b border-otl-gray-200 bg-bg-washed p-3 text-center text-body-sm italic text-txt-black-700"
        >
          {isMalay && change_ms ? change_ms : change_en}
        </td>
      </tr>
    );
  };

  return (
    <>
      <div>
        {title && typeof title === "string" ? (
          <span className="pb-6 text-body-md font-bold text-txt-black-900">
            {title}
          </span>
        ) : (
          title
        )}
      </div>
      <div className={clx("relative", className)}>
        {/* Desktop */}
        <div className={clx(
          scrollable && "hidden md:block overflow-y-auto max-h-[537px] [&::-webkit-scrollbar]:hidden",
        )}>
        <table className={clx("w-full text-left text-body-sm", !scrollable && "hidden md:table")}>
          <thead>
            {table.getHeaderGroups().map((headerGroup: any) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header: any, colIndex: number) => {
                  const isLastCol =
                    colIndex === headerGroup.headers.length - 1;
                  const isFirstCol = colIndex === 0;
                  const isFullResultCol = header.column.columnDef.id === "full_result";
                  return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={clx(
                      "sticky top-0 z-10 whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white py-3 font-medium",
                      isFirstCol
                        ? compactFirstColumn
                          ? "pl-2 pr-3"
                          : "pl-4 pr-3"
                        : "px-3",
                      isLastCol && isFullResultCol && "pr-1 text-right",
                      fullBorder && "border border-b-2 text-body-xs",
                      alternateTextColor && "text-txt-black-500",
                      headerClassName,
                      isFirstCol && firstColumnNoWrap && "whitespace-nowrap",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                  </th>
                );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {data.map((row: any, idx: number) => {
              if (row.change_en) {
                return (
                  <ExplanationRow
                    key={"explanation-" + idx}
                    change_en={row.change_en}
                    change_ms={row.change_ms}
                  />
                );
              }
              // Use react-table for normal rows
              const tableRow = table
                .getRowModel()
                .rows.find((r: any) => r.index === idx);
              if (!tableRow) return null;
              const highlight = isHighlighted(tableRow);
              return (
                <tr
                  key={tableRow.id}
                  className={clx(
                    highlight ? "bg-bg-washed" : "bg-inherit",
                    "border-b border-otl-gray-200",
                  )}
                >
                  {tableRow
                    .getVisibleCells()
                    .map((cell: any, colIndex: number) => {
                      const isLastCol =
                        colIndex === tableRow.getVisibleCells().length - 1;
                      const isFirstCol = colIndex === 0;
                      const isFullResultCol =
                        cell.column.columnDef.id === "full_result";
                      return (
                      <td
                        key={cell.id}
                        className={clx(
                          highlight && isFirstCol
                            ? "font-medium"
                            : "font-normal",
                          "py-[11px]",
                          isFirstCol && firstColumnNoWrap && "whitespace-nowrap",
                          isFirstCol
                            ? compactFirstColumn
                              ? "pl-2 pr-3"
                              : "pl-4 pr-3"
                            : "px-3",
                          isLastCol && isFullResultCol && "pr-1 text-right",
                          fullBorder && "border",
                        )}
                      >
                        {isLoading ? (
                          <Skeleton />
                        ) : (
                          lookupDesktop(
                            cell.column.columnDef.id,
                            cell,
                            highlight,
                          )
                        )}
                      </td>
                    );
                    })}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {/* Mobile – simple table (e.g. elections overview) */}
        {simpleMobileTable && (
          <div className="md:hidden overflow-x-auto overflow-y-auto max-h-[498px] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left text-body-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup: any) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header: any, colIndex: number) => {
                      const isSeatsWon = header.column.columnDef.id === "seats_won";
                      const seatsTotal = data[0]?.seats_total;
                      const isFirst = colIndex === 0;
                      return (
                        <th
                          key={header.id}
                          className={clx(
                            "sticky top-0 whitespace-nowrap border-b-2 border-otl-gray-200 bg-bg-white py-3 font-medium",
                            isFirst ? "left-0 z-30" : "z-20",
                            isFirst
                              ? `${compactFirstColumn ? "pl-2" : "pl-4"} pr-3`
                              : "px-3",
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {isSeatsWon && seatsTotal != null && (
                            <span className="font-normal text-txt-black-500">{` / ${seatsTotal}`}</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((tableRow: any) => {
                  const highlight = isHighlighted(tableRow);
                  const stickyBg = highlight ? "bg-bg-washed" : "bg-bg-white";
                  return (
                    <tr
                      key={tableRow.id}
                      className={clx(
                        "border-b border-otl-gray-200",
                        highlight ? "bg-bg-black-50" : "bg-inherit",
                      )}
                    >
                      {tableRow.getVisibleCells().map((cell: any, colIndex: number) => {
                        const id = cell.column.columnDef.id;
                        const value = cell.getValue();
                        const isFirst = colIndex === 0;
                        let content: ReactNode;
                        if (id === "party") {
                          content = lookupMobile("party", cell, highlight);
                        } else if (id === "seats_won" || id === "seats_contested") {
                          const seatsPerc = cell.row.original[id + "_perc"];
                          content = isLoading ? (
                            <Skeleton className="w-16" />
                          ) : (
                            <span className="whitespace-nowrap">
                              {value}
                              {seatsPerc !== null
                                ? ` (${numFormat(seatsPerc, "compact", [1, 1])}%)`
                                : " (—)"}
                            </span>
                          );
                        } else if (id === "votes") {
                          const votesPerc = cell.row.original.votes_perc;
                          content = isLoading ? (
                            <Skeleton className="w-20" />
                          ) : (
                            <span className="whitespace-nowrap">
                              {value !== null ? numFormat(value, "standard") : "—"}
                              {votesPerc !== null
                                ? ` (${numFormat(votesPerc, "compact", [1, 1])}%)`
                                : " (—)"}
                            </span>
                          );
                        } else {
                          content = flexRender(cell.column.columnDef.cell, cell.getContext());
                        }
                        return (
                          <td
                            key={cell.id}
                            className={clx(
                              "py-[11px]",
                              isFirst
                                ? `sticky left-0 z-10 w-px whitespace-nowrap ${compactFirstColumn ? "pl-2" : "pl-4"} pr-3 ${stickyBg}`
                                : "px-3",
                            )}
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile – compact 3-column table (FullResult modal drawer) */}
        {compactMobileTable && (
          <div className="md:hidden overflow-y-auto max-h-[498px] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 border-b-2 border-otl-gray-200 bg-bg-white py-3 pl-2 pr-3 font-medium">
                    {t("candidate_name")}
                  </th>
                  <th className="sticky top-0 z-10 border-b-2 border-otl-gray-200 bg-bg-white px-3 py-3 text-center font-medium">
                    {t("party_name")}
                  </th>
                  <th className="sticky top-0 z-10 border-b-2 border-otl-gray-200 bg-bg-white px-3 py-3 font-medium">
                    {t("votes_won")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.getRowModel().rows.map((tableRow: any) => {
                  const highlight = isHighlighted(tableRow);
                  const row = tableRow.original;
                  const logoSrc = row.party_uid
                    ? `/static/images/parties/${row.party_uid}.png`
                    : "/static/images/parties/_fallback_.png";
                  const coalition = row.coalition;
                  const useShortName = partyNameDisplay === "short";
                  const partyLabel =
                    coalition && coalition !== "ALONE"
                      ? `${useShortName ? row.party : t(`party:${row.party}`)} (${coalition})`
                      : useShortName
                        ? row.party
                        : t(`party:${row.party}`);
                  const votesPerc = row.votes_perc;
                  return (
                    <tr
                      key={tableRow.id}
                      className={clx(
                        "border-b border-otl-gray-200",
                        highlight ? "bg-bg-black-50" : "bg-inherit",
                      )}
                    >
                      {/* Name */}
                      <td className={clx("py-3 pl-2 pr-3 w-full min-w-0", highlight && "font-medium")}>
                        {isLoading ? (
                          <Skeleton className="w-24" />
                        ) : (
                          <span>
                            {row.name}
                            {highlight && (
                              <span className="ml-1 inline-flex translate-y-0.5">
                                <ResultBadge hidden value={row.result} />
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      {/* Party */}
                      <td className="px-3 py-3">
                        {isLoading ? (
                          <Skeleton className="mx-auto w-8" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <div className="relative flex h-4.5 w-8 justify-center">
                              <ImageWithFallback
                                className="border border-otl-gray-200"
                                src={logoSrc}
                                width={32}
                                height={18}
                                alt={row.party}
                              />
                            </div>
                            <span className="whitespace-nowrap text-center text-xs text-txt-black-700">{partyLabel}</span>
                          </div>
                        )}
                      </td>
                      {/* Votes Won */}
                      <td className="px-3 py-3">
                        {isLoading ? (
                          <Skeleton className="w-16" />
                        ) : (
                          <div className="flex flex-col gap-2">
                            <BarPerc hidden value={votesPerc} size="w-[80px] h-[5px]" />
                            <span className="whitespace-nowrap text-xs">
                              {row.votes !== null ? numFormat(row.votes, "standard") : "—"}
                              {votesPerc !== null
                                ? ` (${numFormat(votesPerc, "compact", [1, 1])}%)`
                                : " (—)"}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile – card layout */}
        {!simpleMobileTable && !compactMobileTable && data.map((row: any, idx: number) => {
          if (row.change_en) {
            const isMalay = i18n.language && i18n.language.startsWith("ms");
            return (
              <div
                key={"explanation-mobile-" + idx}
                className="border-b border-otl-gray-200 bg-bg-washed p-3 text-center text-body-sm italic text-txt-black-700 md:hidden"
              >
                {isMalay && row.change_ms ? row.change_ms : row.change_en}
              </div>
            );
          }
          // Use react-table for normal rows
          const tableRow = table
            .getRowModel()
            .rows.find((r: any) => r.index === idx);
          if (!tableRow) return null;
          const ids = table.getAllColumns().map((col) => col.id);
          const highlight = isHighlighted(tableRow);

          let _row: Record<string, ReactNode> = {};
          tableRow.getVisibleCells().forEach((cell: any) => {
            _row[cell.column.columnDef.id] = lookupMobile(
              cell.column.columnDef.id,
              cell,
              highlight,
            );
          });
          return isLoading ? (
            <div
              key={idx}
              className="flex flex-col gap-2 border-b border-otl-gray-200 p-3 first-of-type:border-t-2 md:hidden"
            >
              <Skeleton className="w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="w-24" />
                <Skeleton className="w-24" />
                <Skeleton className="w-32" />
                <Skeleton className="w-32" />
              </div>
            </div>
          ) : (
            <div
              className={clx(
                "flex flex-col space-y-3 border-b border-otl-gray-200 px-4 py-4 text-body-sm first:border-t-2 md:hidden",
                idx === 0 && "border-t-2",
                highlight ? "bg-bg-black-50" : "bg-inherit",
              )}
              key={idx}
            >
              {/* Row 1 - Election Name / Coalition (centre) / Full result */}
              {["election_name", "full_result"].some((id) =>
                ids.includes(id),
              ) && (
                  <div className="flex items-center justify-between gap-x-2">
                    <div className="flex gap-x-2">
                      {_row.index}
                      {_row.election_name}
                    </div>
                    {_row.coalition && (
                      <div className="flex flex-1 justify-center">
                        {_row.coalition}
                      </div>
                    )}
                    {_row.full_result}
                  </div>
                )}
              {/* Row 2 - Seat (if available)*/}
              {(_row.result || _row.index) && (
                <div>
                  <p>{_row.seat} </p>
                </div>
              )}
              {/* Row 3 - Party */}
              {_row.party && (
                <div className="min-w-0 overflow-hidden">
                  {_row.party}
                </div>
              )}
              {/* Row 4 - Result *Depends on page shown */}
              {_row.name && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {_row.majority}
                  {_row.voter_turnout}
                  {_row.votes}
                </div>
              )}
              {_row.result && (
                <div className="flex gap-4">
                  {_row.votes}
                  {_row.result}
                </div>
              )}
              {(_row.seats_won || _row.seats || _row.seats_contested) && (
                <div className="flex flex-col gap-3">
                  {(_row.seats_won || _row.seats) && (
                    <div className="flex gap-6">
                      {_row.seats_won ?? _row.seats}
                      {_row.votes}
                    </div>
                  )}
                  {_row.seats_contested && (
                    <div>{_row.seats_contested}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!data.length && (
          <div className="flex h-[200px] items-center justify-center">
            <div className="flex h-auto w-[300px] rounded-md bg-otl-gray-200 px-3 pb-2 pt-1 lg:w-fit">
              <p className="text-sm">
                <span className="inline-flex pr-1">
                  <FaceFrownIcon className="h-5 w-5 translate-y-1" />
                </span>
                {empty}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ElectionTable;

export const dummyData = [
  {
    name: "Rushdan Bin Rusmi",
    type: "parlimen",
    date: "2022-11-19",
    election_name: "GE-15",
    seat: "P.001 Padang Besar, Perlis",
    party: "PN",
    votes: 24267,
    votes_perc: 53.5,
    majority: 24267,
    majority_perc: 53.5,
    result: "won",
  },
  {
    name: "Ko Chu Liang",
    type: "parlimen",
    date: "2022-11-19",
    election_name: "GE-15",
    seat: "P.001 Padang Besar, Perlis",
    party: "WARISAN",
    votes: 244,
    votes_perc: 0.5,
    majority: 244,
    majority_perc: 0.5,
    result: "lost_deposit",
  },
  {
    name: "Zahidi Bin Zainul Abidin",
    type: "parlimen",
    date: "2022-11-19",
    election_name: "GE-15",
    seat: "P.001 Padang Besar, Perlis",
    party: "BEBAS",
    votes: 1939,
    votes_perc: 4.2,
    majority: 1939,
    majority_perc: 4.2,
    result: "lost_deposit",
  },
  {
    name: "Zahida Binti Zarik Khan",
    type: "parlimen",
    date: "2022-11-19",
    election_name: "GE-15",
    seat: "P.001 Padang Besar, Perlis",
    party: "BN",
    votes: 11753,
    votes_perc: 25.9,
    majority: 11753,
    majority_perc: 25.9,
    result: "lost",
  },
  {
    name: "Kapt (B) Hj Mohamad Yahaya",
    type: "parlimen",
    date: "2022-11-19",
    election_name: "GE-15",
    seat: "P.001 Padang Besar, Perlis",
    party: "PH",
    votes: 7085,
    votes_perc: 15.6,
    majority: 7085,
    majority_perc: 15.6,
    result: "lost",
  },
];
