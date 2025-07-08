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
import { ImageWithFallback, Skeleton, Tooltip } from "@components/index";
import { clx, numFormat, toDate } from "@lib/helpers";
import { useTranslation } from "@hooks/useTranslation";
import { FunctionComponent, ReactNode } from "react";

export interface ElectionTableProps {
  className?: string;
  title?: string | ReactNode;
  empty?: string | ReactNode;
  data?: any;
  columns: Array<ColumnDef<any, any>>;
  highlightedRows?: Array<number>;
  highlighted?: string;
  result?: ElectionResult;
  isLoading: boolean;
}

type TableIds =
  | "index"
  | "party"
  | "election_name"
  | "name"
  | "votes"
  | "majority"
  | "seats"
  | "seat"
  | "result"
  | "full_result";

const ElectionTable: FunctionComponent<ElectionTableProps> = ({
  className = "",
  title,
  empty,
  data = dummyData,
  columns,
  highlightedRows,
  highlighted,
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation(["common", "election", "party"]);

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
          <div className="w-fit">
            <Tooltip
              tip={
                cell.row.original.date &&
                toDate(cell.row.original.date, "dd MMM yyyy", i18n.language)
              }
              className="max-xl:-left-3"
            >
              {(open) => (
                <div
                  className="cursor-help whitespace-nowrap underline decoration-dashed [text-underline-position:from-font]"
                  tabIndex={0}
                  onClick={open}
                >
                  {t(`election:${value}`)}
                </div>
              )}
            </Tooltip>
          </div>
        );
      case "party":
        return (
          <div className="flex items-center gap-1.5">
            <div className="relative flex h-auto w-8 justify-center">
              <ImageWithFallback
                className="rounded border border-otl-gray-200"
                src={`/static/images/parties/${value}.png`}
                width={32}
                height={18}
                alt={value}
                style={{
                  width: "auto",
                  maxWidth: "32px",
                  height: "auto",
                  maxHeight: "32px",
                }}
              />
            </div>
            <span>
              {!table
                .getAllColumns()
                .map((col) => col.id)
                .includes("full_result")
                ? t(`party:${value}`)
                : value}
            </span>
          </div>
        );
      case "seats":
        percent = cell.row.original.seats_perc;
        const total = cell.row.original.seats_total;
        return (
          <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
            <div>
              <BarPerc hidden value={percent} />
            </div>
            <p className="whitespace-nowrap">{`${value} / ${total} ${
              percent !== null
                ? ` (${numFormat(percent, "compact", [1, 1])}%)`
                : " (—)"
            }`}</p>
          </div>
        );
      case "result":
        return <ResultBadge value={value} />;

      case "votes":
      case "majority":
        percent = cell.row.original[id + "_perc"];
        return (
          <div className="flex items-center gap-2 md:flex-col md:items-start lg:flex-row lg:items-center">
            <div className="lg:self-center">
              <BarPerc hidden value={percent} />
            </div>
            <span className="whitespace-nowrap">
              {value !== null ? numFormat(value, "standard") : `—`}
              {percent !== null
                ? ` (${numFormat(percent, "compact", [1, 1])}%)`
                : " (—)"}
            </span>
          </div>
        );
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
      case "party":
        return (
          <div className="flex items-center gap-1.5">
            <div className="relative flex h-auto w-8 justify-center">
              <ImageWithFallback
                className="rounded border border-otl-gray-200"
                src={`/static/images/parties/${value}.png`}
                width={32}
                height={18}
                alt={value}
                style={{
                  width: "auto",
                  maxWidth: "32px",
                  height: "auto",
                  maxHeight: "32px",
                }}
              />
            </div>
            {cell.row.original.name ? (
              <span>
                <span className="pr-1 font-medium">
                  {cell.row.original.name}
                </span>
                <span className="inline-flex pr-1">{` (${value})`}</span>
                <span className="inline-flex translate-y-0.5">
                  {highlight && (
                    <ResultBadge hidden value={cell.row.original.result} />
                  )}
                </span>
              </span>
            ) : (
              <span className="font-medium">{t(`party:${value}`)}</span>
            )}
          </div>
        );
      case "election_name":
        return (
          <div className="flex flex-wrap gap-x-3 text-sm">
            <p className="font-medium">{t(`election:${value}`)}</p>
            {cell.row.original.date && (
              <p className="text-txt-black-500">
                {toDate(cell.row.original.date, "dd MMM yyyy", i18n.language)}
              </p>
            )}
          </div>
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
                 (${
                   percent !== null
                     ? `${numFormat(percent, "compact", [1, 1])}%`
                     : "(—)"
                 })`}
              </p>
            </div>
          </div>
        );
      case "votes":
        percent = cell.row.original.votes_perc;
        return (
          <div className="flex flex-col space-y-1">
            <p className="font-medium text-txt-black-500">
              {flexRender(cell.column.columnDef.header, cell.getContext())}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <BarPerc hidden value={percent} />
              <p>{`${value !== null ? numFormat(value, "standard") : "—"} (${
                percent !== null
                  ? `${numFormat(percent, "compact", [1, 1])}%`
                  : "—"
              })`}</p>
            </div>
          </div>
        );
      case "majority":
        percent = cell.row.original.majority_perc;
        return (
          <div className="flex flex-row gap-2">
            <p className="font-medium text-txt-black-500">
              {flexRender(cell.column.columnDef.header, cell.getContext())}
            </p>
            {typeof value === "number" ? (
              <p className="font-bold">{value}</p>
            ) : (
              <div className="flex items-center gap-2">
                <BarPerc hidden value={percent} />
                <p>{`${value !== null ? numFormat(value, "standard") : "—"} (${
                  percent !== null
                    ? `${numFormat(percent, "compact", [1, 1])}%`
                    : "—"
                })`}</p>
              </div>
            )}
          </div>
        );
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
          className="bg-red-50 text-red-800 dark:text-red-200 border-slate-200 dark:border-zinc-800 border-b py-2 text-center text-sm italic dark:bg-[rgba(185,28,28,0.5)]"
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
          <span className="pb-6 text-base font-bold text-txt-black-900">
            {title}
          </span>
        ) : (
          title
        )}
      </div>
      <div className={clx("relative", className)}>
        {/* Desktop */}
        <table className="hidden w-full text-left text-sm md:table">
          <thead>
            {table.getHeaderGroups().map((headerGroup: any) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className="whitespace-nowrap border-b-2 border-otl-gray-200 px-2 py-[10px] font-medium"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
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
                    highlight ? "bg-bg-black-50" : "bg-inherit",
                    "border-b border-otl-gray-200",
                  )}
                >
                  {tableRow
                    .getVisibleCells()
                    .map((cell: any, colIndex: number) => (
                      <td
                        key={cell.id}
                        className={clx(
                          highlight && colIndex === 0
                            ? "font-medium"
                            : "font-normal",
                          "px-2 py-[10px]",
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
                    ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile */}
        {data.map((row: any, idx: number) => {
          if (row.change_en) {
            const isMalay = i18n.language && i18n.language.startsWith("ms");
            return (
              <div
                key={"explanation-mobile-" + idx}
                className="bg-red-50 text-red-800 dark:text-red-200 border-b border-otl-gray-200 py-2 text-center text-sm italic md:hidden dark:bg-[rgba(185,28,28,0.5)]"
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
            <div className="flex flex-col gap-2 border-b border-otl-gray-200 p-3 first-of-type:border-t-2 md:hidden">
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
                "flex flex-col space-y-2 border-b border-otl-gray-200 p-3 text-sm first:border-t-2 md:hidden",
                idx === 0 && "border-t-2",
                highlight ? "bg-bg-black-50" : "bg-inherit",
              )}
              key={idx}
            >
              {/* Row 1 - Election Name / Date / Full result */}
              {["election_name", "full_result"].some((id) =>
                ids.includes(id),
              ) && (
                <div className="flex items-start justify-between gap-x-2">
                  <div className="flex gap-x-2">
                    {_row.index}
                    {_row.election_name}
                  </div>
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
              {_row.party && <div>{_row.party}</div>}
              {/* Row 4 - Result *Depends on page shown */}
              {_row.name && (
                <div className="flex gap-2">
                  {_row.majority}
                  {_row.votes}
                </div>
              )}
              {_row.result && (
                <div className="flex gap-4">
                  {_row.votes}
                  {_row.result}
                </div>
              )}
              {_row.seats && (
                <div className="flex gap-3">
                  {_row.seats}
                  {_row.votes}
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
