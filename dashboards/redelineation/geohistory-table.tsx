import ElectionTable from "@components/Election/ElectionTable";
import { RedelineationTable } from "@dashboards/types";
import { useMediaQuery } from "@hooks/useMediaQuery";
import { useTranslation } from "@hooks/useTranslation";
import { generateSchema } from "@lib/schema/election-explorer";
import { FunctionComponent, useMemo } from "react";

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
          header: t("table.seat_transferred"),
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
          header: t("table.seat_transferred"),
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
    <div>
      mobile
      <p>ssdsd</p>
    </div>
  );
};

export default GeohistoryTable;
