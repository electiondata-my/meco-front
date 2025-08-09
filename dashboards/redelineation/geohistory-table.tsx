import ElectionTable from "@components/Election/ElectionTable";
import {
  RedelineationTableNew,
  RedelineationTableOld,
} from "@dashboards/types";
import { useMediaQuery } from "@hooks/useMediaQuery";
import { useTranslation } from "@hooks/useTranslation";
import { generateSchema } from "@lib/schema/election-explorer";
import { FunctionComponent, useMemo } from "react";
import BarPerc from "@charts/bar-perc";

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
            return <p className="">{getValue()}</p>;
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
            return <p className="">{getValue()}</p>;
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
    return (
      <ElectionTable
        data={table}
        columns={t_schema}
        isLoading={false}
        headerClassName="last-of-type:text-right"
      />
    );
  }

  return (
    <div className="space-y-4.5">
      {type === "new" &&
        table
          .sort((a, b) => b.perc_from_parent - a.perc_from_parent)
          .map((data) => (
            <div className="flex w-full flex-col gap-3 rounded-md border border-otl-gray-200 bg-bg-white p-3">
              <p className="text-body-sm">
                <span className="font-semibold">
                  {t("new_constituency")} ({data.seat_new})
                </span>{" "}
                {t("table.seat_transferred_from")} ({data.parent})
              </p>
              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center justify-between text-body-sm">
                  <p className="text-txt-black-500">
                    {t("table.seat_transferred")}
                  </p>
                  <p>{data.perc_from_parent}</p>
                </div>
                <BarPerc
                  className="w-full"
                  hidden
                  value={data.perc_from_parent}
                  size={"h-[4px] w-full"}
                />
              </div>
            </div>
          ))}
      {type === "old" &&
        table
          .sort((a, b) => b.perc_to_child - a.perc_to_child)
          .map((data) => (
            <div className="flex w-full flex-col gap-3 rounded-md border border-otl-gray-200 bg-bg-white p-3">
              <p className="text-body-sm">
                <span className="font-semibold">
                  {t("old_constituency")} ({data.seat_old})
                </span>{" "}
                {t("table.seat_transferred_from")} ({data.child})
              </p>
              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center justify-between text-body-sm">
                  <p className="text-txt-black-500">
                    {t("table.seat_transferred")}
                  </p>
                  <p>{data.perc_to_child}</p>
                </div>
                <BarPerc
                  className="w-full"
                  hidden
                  value={data.perc_to_child}
                  size={"h-[4px] w-full"}
                />
              </div>
            </div>
          ))}
    </div>
  );
};

export default GeohistoryTable;
