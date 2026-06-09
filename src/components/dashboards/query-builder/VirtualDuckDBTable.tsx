import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clx } from "@lib/helpers";

const ROW_HEIGHT = 34;
const CHAR_PX = 7.8;
const CELL_PADDING = 24;
const MAX_COL_WIDTH = 300;

export const MAX_DISPLAY_ROWS = 10_000;

export interface DuckDBQueryResult {
  columns: string[];
  fieldTypes: string[];
  rows: unknown[][];
  executionTime: number;
  totalRows: number;
  truncated: boolean;
}

interface Props {
  result: DuckDBQueryResult;
  isRightAligned: boolean[];
  renderCell: (cell: unknown, ci: number) => string;
  cellClassName?: (cell: unknown, ci: number) => string | undefined;
  scrollClassName?: string;
  thClassName?: string;
}

export function VirtualDuckDBTable({
  result,
  isRightAligned,
  renderCell,
  cellClassName,
  scrollClassName = "max-h-[24rem] overflow-auto sm:max-h-[28rem] lg:max-h-[36rem]",
  thClassName = "sticky top-0 z-10 whitespace-nowrap border-b border-otl-gray-200 bg-bg-white px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-wider text-txt-black-400",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const colWidths = useMemo(
    () =>
      result.columns.map((col, ci) =>
        Math.min(
          Math.ceil(
            result.rows.reduce((max, row) => {
              const cell = row[ci];
              return cell == null ? max : Math.max(max, String(cell).length);
            }, col.length) * CHAR_PX,
          ) + CELL_PADDING,
          MAX_COL_WIDTH,
        ),
      ),
    [result],
  );

  const virtualizer = useVirtualizer({
    count: result.rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div ref={scrollRef} className={scrollClassName}>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {result.columns.map((col, ci) => (
              <th
                key={col}
                style={{ minWidth: colWidths[ci] }}
                className={clx(
                  thClassName,
                  isRightAligned[ci] ? "text-right" : "text-left",
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop }} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const row = result.rows[virtualRow.index];
            return (
              <tr
                key={virtualRow.index}
                className="border-b border-otl-gray-100 transition-colors hover:bg-bg-black-50/60"
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={clx(
                      "whitespace-nowrap px-3 py-1.5 font-mono text-[13px] text-txt-black-800",
                      isRightAligned[ci] ? "text-right tabular-nums" : "text-left",
                      cell == null && "italic text-txt-black-300",
                      cellClassName?.(cell, ci),
                    )}
                  >
                    {renderCell(cell, ci)}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
