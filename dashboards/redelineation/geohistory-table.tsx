import ElectionTable from "@components/Election/ElectionTable";
import { RedelineationTable } from "@dashboards/types";
import { useMediaQuery } from "@hooks/useMediaQuery";
import { useTranslation } from "@hooks/useTranslation";
import { generateSchema } from "@lib/schema/election-explorer";
import { FunctionComponent, useMemo } from "react";
import BarPerc from "@charts/bar-perc";

interface GeohistoryTableProps {
  type: "old" | "new";
  table: RedelineationTable;
}

const GeohistoryTable: FunctionComponent<GeohistoryTableProps> = ({
  type,
  table,
}) => {
  const { t } = useTranslation(["redelineation"]);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const t_schema = useMemo(() => {
    if (table.type === "new") {
      return generateSchema<(typeof table)["data"]>([
        {
          key: "new_name",
          id: "new_name",
          header: t("table.new_name"),
          cell: ({ getValue }) => {
            return <p className="">{getValue()}</p>;
          },
        },
        {
          key: "seat_transferred",
          id: "seat_transferred",
          header: t("table.seat_transferred_from"),
        },
        {
          key: "pct_transferred",
          id: "pct_transferred",
          header: t("table.pct_transferred"),
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
    if (table.type === "old") {
      return generateSchema<(typeof table)["data"]>([
        {
          key: "old_name",
          id: "old_name",
          header: t("table.old_name"),
          cell: ({ getValue }) => {
            return <p className="">{getValue()}</p>;
          },
        },
        {
          key: "seat_transferred",
          id: "seat_transferred",
          header: t("table.seat_transferred_from"),
        },
        {
          key: "pct_transferred",
          id: "pct_transferred",
          header: t("table.pct_transferred"),
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
  }, [table.type]);

  if (!table.data) {
    return null;
  }

  if (isDesktop && t_schema) {
    return (
      <ElectionTable
        data={table.data}
        columns={t_schema}
        isLoading={false}
        headerClassName="last-of-type:text-right"
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-md border border-otl-gray-200 bg-bg-white p-3">
      <p className="text-body-sm">
        <span className="font-semibold">
          {t("new_constituency")} (P.138 Kota Melaka)
        </span>{" "}
        {t("table.seat_transferred_from_to")} (P.138 Bandar Malacca)
      </p>
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center justify-between text-body-sm">
          <p className="text-txt-black-500">{t("table.seat_transferred")}</p>
          <p>79.20%</p>
        </div>
        <BarPerc
          className="w-full"
          hidden
          value={79.2}
          size={"h-[4px] w-full"}
        />
      </div>
    </div>
  );
};

export default GeohistoryTable;
