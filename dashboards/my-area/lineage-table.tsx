import { Button, ButtonIcon } from "@govtechmy/myds-react/button";
import { TableIcon } from "@govtechmy/myds-react/icon";
import { useData } from "@hooks/useData";
import { useMediaQuery } from "@hooks/useMediaQuery";
import { useTranslation } from "@hooks/useTranslation";
import { FunctionComponent, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@components/drawer";
import ElectionTable from "@components/Election/ElectionTable";
import { generateSchema } from "@lib/schema/election-explorer";
import { Tag } from "@govtechmy/myds-react/tag";
import { Lineage } from "@dashboards/types";
import { groupBy, pick } from "lodash";
import { clx } from "@lib/helpers";

/**
 * Lineage Table
 * Rendered inside the mapbox map in My Area
 * @overview Status: Live
 */

interface LineageTableProps {
  lineage: Lineage;
}

const LineageTable: FunctionComponent<LineageTableProps> = ({ lineage }) => {
  const { t } = useTranslation(["home"]);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { data, setData } = useData({
    open: false,
  });
  const { open } = data;

  const t_schema = useMemo(() => {
    if (lineage.type === "parlimen") {
      return generateSchema<(typeof lineage)["data"]>([
        {
          key: "year",
          id: "year",
          header: t("lineage.year"),
          cell: ({ getValue }) => {
            return <p className="text-center">{getValue()}</p>;
          },
        },
        { key: "parlimen", id: "parlimen", header: t("lineage.parlimen") },
        {
          key: "n_duns",
          id: "n_duns",
          header: t("lineage.n_duns"),
          cell: ({ getValue }) => {
            return <p className="text-center tabular-nums">{getValue()}</p>;
          },
        },
        { key: "duns", id: "duns", header: t("lineage.duns") },
        {
          key: "overlap_pct",
          id: "overlap_pct",
          header: t("lineage.overlap_pct"),
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
    if (lineage.type === "dun") {
      return generateSchema<(typeof lineage)["data"]>([
        {
          key: "year",
          id: "year",
          header: t("lineage.year"),
          cell: ({ getValue }) => {
            return <p className="text-center">{getValue()}</p>;
          },
        },
        { key: "dun", id: "dun", header: t("lineage.dun") },
        { key: "parlimen", id: "parlimen", header: t("lineage.parlimen") },
        {
          key: "overlap_pct",
          id: "overlap_pct",
          header: t("lineage.overlap_pct"),
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
  }, [lineage.type]);

  const Trigger = () => {
    return (
      <Button
        variant={"default-outline"}
        onClick={() => {
          setData("open", true);
        }}
      >
        <ButtonIcon>
          <TableIcon />
        </ButtonIcon>
        {t("lineage.title")}
      </Button>
    );
  };

  if (!lineage.data) {
    return null;
  }

  const grouped = groupBy(lineage.data, "year");
  const sortedYears = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);
  const alternatingYears = sortedYears.filter((_, index) => index % 2 === 1);
  const indexes = lineage.data
    .map((item, index) => (alternatingYears.includes(item.year) ? index : -1))
    .filter((index) => index !== -1);

  if (isDesktop && t_schema) {
    return (
      <Dialog
        open={open}
        onOpenChange={(open) => {
          setData("open", open);
        }}
      >
        <DialogTrigger asChild>
          <Trigger />
        </DialogTrigger>
        <DialogContent className="flex max-h-[calc(100%-40px)] max-w-[800px] flex-col gap-0 overflow-x-hidden overflow-y-scroll pb-0">
          <DialogHeader className="pb-6 pr-8">
            <DialogTitle asChild>
              <h6 className="flex items-center gap-3 text-body-lg font-semibold">
                <TableIcon />
                {t("lineage.title")}
              </h6>
            </DialogTitle>
          </DialogHeader>
          <DialogDescription />
          <div className="hide-scrollbar h-full flex-1 overflow-y-scroll pb-4 text-body-md max-md:px-4">
            <ElectionTable
              data={lineage.data}
              columns={t_schema}
              isLoading={false}
              alternateTextColor={true}
              highlightedRows={indexes}
              headerClassName="first-of-type:pl-3 last-of-type:text-right"
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(open) => {
        setData("open", open);
      }}
    >
      <DrawerTrigger asChild>
        <Trigger />
      </DrawerTrigger>
      <DrawerContent className="max-h-[700px]">
        <DrawerHeader>
          <DrawerTitle asChild>
            <h6 className="flex items-center gap-3 text-body-lg font-semibold">
              <TableIcon />
              {t("lineage.title")}
            </h6>
          </DrawerTitle>
        </DrawerHeader>
        <DrawerDescription />
        <div className="scroll hide-scrollbar h-full flex-1 overflow-y-scroll text-body-md">
          {lineage.type === "parlimen" &&
            lineage.data.map((row, index) => (
              <div
                key={index}
                className={clx(
                  "flex flex-col gap-2 border-b border-otl-gray-200 p-4.5 first-of-type:border-t",
                  indexes.includes(index) && "bg-bg-washed",
                )}
              >
                <div className="flex items-center font-medium">
                  <p className="flex-1 text-body-sm">{row.parlimen}</p>
                  <Tag dot={false} mode="pill" variant="danger" size="small">
                    {row.year}
                  </Tag>
                </div>
                <p className="text-body-sm font-medium">
                  {row.duns} ({row.n_duns} DUNs)
                </p>
                <p className="text-body-xs text-txt-black-500">
                  {row.overlap_pct} % {t("lineage.area_overlap")}
                </p>
              </div>
            ))}
          {lineage.type === "dun" &&
            lineage.data.map((row, index) => (
              <div
                key={index}
                className={clx(
                  "flex flex-col gap-2 border-b border-otl-gray-200 p-4.5 first-of-type:border-t",
                  indexes.includes(index) && "bg-bg-washed",
                )}
              >
                <div className="flex items-center font-medium">
                  <p className="flex-1 text-body-sm">{row.dun}</p>
                  <Tag dot={false} mode="pill" variant="danger" size="small">
                    {row.year}
                  </Tag>
                </div>
                <p className="text-body-sm font-medium">{row.parlimen}</p>
                <p className="text-body-xs text-txt-black-500">
                  {row.overlap_pct} % {t("lineage.area_overlap")}
                </p>
              </div>
            ))}
        </div>
        <DrawerFooter className="pb-10">
          <Button
            onClick={() => setData("open", false)}
            variant={"default-outline"}
            className="w-full justify-center focus:ring-otl-gray-200"
          >
            {t("common:close")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default LineageTable;
