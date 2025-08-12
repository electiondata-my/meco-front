import {
  RedelineationTableNew,
  RedelineationTableOld,
} from "@dashboards/types";
import { useMediaQuery } from "@hooks/useMediaQuery";
import { useTranslation } from "@hooks/useTranslation";
import { generateSchema } from "@lib/schema/election-explorer";
import { FunctionComponent, useMemo } from "react";

type GeohistoryTableProps = (
  | {
      type: "old";
      table: RedelineationTableOld[];
    }
  | {
      type: "new";
      table: RedelineationTableNew[];
    }
) & {
  year: [string, string];
};

const GeohistoryTable: FunctionComponent<GeohistoryTableProps> = ({
  type,
  table,
  year,
}) => {
  const { t } = useTranslation(["redelineation"]);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const t_schema = useMemo(() => {
    if (type === "new") {
      return generateSchema<typeof table>([
        {
          key: "seat_new",
          id: "seat_new",
          header: `${t("table.seat_new")} (${year[0]})`,
          cell: ({ getValue }) => {
            const value = getValue();
            return value ? <p className="">{value}</p> : <p className=""></p>;
          },
        },
        {
          key: "parent",
          id: "parent",
          header: `${t("table.parent")} (${year[1]})`,
        },
        {
          key: "perc_from_parent",
          id: "perc_from_parent",
          header: t("table.perc_from_parent"),
          cell: ({ getValue }) => {
            return (
              <p className="text-right font-mono tabular-nums">
                {Number(getValue()).toFixed(2)}
              </p>
            );
          },
        },
      ]);
    }
    if (type === "old") {
      return generateSchema<typeof table>([
        {
          key: "seat_old",
          id: "seat_old",
          header: `${t("table.seat_old")} (${year[1]})`,
          cell: ({ getValue }) => {
            const value = getValue();
            return value ? <p className="">{value}</p> : <p className=""></p>;
          },
        },
        {
          key: "child",
          id: "child",
          header: `${t("table.child")} (${year[0]})`,
        },
        {
          key: "perc_to_child",
          id: "perc_to_child",
          header: t("table.perc_to_child"),
          cell: ({ getValue }) => {
            return (
              <p className="text-right font-mono tabular-nums">
                {Number(getValue()).toFixed(2)}
              </p>
            );
          },
        },
      ]);
    }
  }, [type]);

  if (!table) {
    return null;
  }

  if (isDesktop && t_schema) {
    // Custom table with rowSpan for merged first column
    return (
      <div className="group overflow-x-auto">
        <table className="w-full border-collapse border border-otl-gray-200">
          <thead>
            <tr className="border-b border-otl-gray-200">
              {t_schema.map((column, index) => (
                <th
                  key={column.id}
                  className={`px-3 py-3 text-left text-body-sm font-semibold text-txt-black-700 ${
                    index === t_schema.length - 1 ? "text-right" : ""
                  } ${
                    index < t_schema.length - 1
                      ? "border-r border-otl-gray-200"
                      : ""
                  }`}
                >
                  {typeof column.header === "string" ? column.header : "Header"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-otl-gray-200 hover:bg-bg-washed"
              >
                {t_schema.map((column, colIndex) => {
                  const columnKey = "key" in column ? column.key : column.id;
                  const value = row[columnKey as keyof typeof row];

                  // For the first column, implement rowSpan logic
                  if (colIndex === 0) {
                    if (rowIndex === 0) {
                      // First row: show the value and set rowSpan to span all rows
                      return (
                        <td
                          key={column.id}
                          rowSpan={table.length}
                          className="border-r border-otl-gray-200 px-3 py-3 group-hover:bg-bg-washed"
                        >
                          <p className="flex h-full items-center">{value}</p>
                        </td>
                      );
                    } else {
                      // Other rows: skip this cell (it's merged with the first row)
                      return null;
                    }
                  }

                  // For other columns, render normally
                  return (
                    <td
                      key={column.id}
                      className={`py-3 ${
                        colIndex === t_schema.length - 1 ? "pl-1 pr-3" : "px-3"
                      } ${
                        colIndex === t_schema.length - 1 ? "text-right" : ""
                      } ${
                        colIndex < t_schema.length - 1
                          ? "border-r border-otl-gray-200"
                          : ""
                      }`}
                    >
                      <p
                        className={
                          colIndex === t_schema.length - 1
                            ? "text-right font-mono tabular-nums"
                            : ""
                        }
                      >
                        {colIndex === t_schema.length - 1
                          ? Number(value).toFixed(2)
                          : value}
                      </p>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="lg:hidden">
      {/* Mobile-optimized table with header */}

      <h3 className="mb-4 pl-2 text-center text-body-md font-semibold text-txt-black-700">
        {type === "new"
          ? `${t("table.seat_new")} (${year[0]})`
          : `${t("table.seat_old")} (${year[1]})`}
        :{" "}
        {type === "new"
          ? (table[0] as any).seat_new
          : (table[0] as any).seat_old}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-otl-gray-200">
          <thead>
            <tr className="border-b border-otl-gray-200">
              <th className="w-3/5 border-r border-otl-gray-200 px-3 py-3 text-left text-sm font-semibold text-txt-black-700">
                {type === "new" ? t("table.parent") : t("table.child")} (
                {type === "new" ? year[1] : year[0]})
              </th>
              <th className="w-2/5 px-3 py-3 text-right text-sm font-semibold text-txt-black-700">
                {type === "new"
                  ? t("table.perc_from_parent")
                  : t("table.perc_to_child")}
              </th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, rowIndex) => {
              const otherValue =
                type === "new" ? (row as any).parent : (row as any).child;
              const percentageValue =
                type === "new"
                  ? (row as any).perc_from_parent
                  : (row as any).perc_to_child;

              return (
                <tr
                  key={rowIndex}
                  className="border-b border-otl-gray-200 hover:bg-bg-washed"
                >
                  {/* First column */}
                  <td className="border-r border-otl-gray-200 px-3 py-3">
                    <p className="text-sm text-txt-black-700">{otherValue}</p>
                  </td>

                  {/* Second column */}
                  <td className="px-3 py-3 text-right">
                    <p className="font-mono text-sm tabular-nums text-txt-black-700">
                      {Number(percentageValue).toFixed(2)}
                    </p>
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

export default GeohistoryTable;
