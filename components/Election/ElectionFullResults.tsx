import type { Party, PartyResult } from "@dashboards/types";
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
  DrawerClose,
  DrawerHeader,
  DrawerTrigger,
  DrawerFooter,
} from "@components/drawer";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { ArrowsPointingOutIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { toDate } from "@lib/helpers";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { useState } from "react";
import { useMediaQuery } from "@hooks/useMediaQuery";
import { ButtonIcon, Button } from "@govtechmy/myds-react/button";
import type { Result } from "./FullResults";
import dynamic from "next/dynamic";
import Skeleton from "@components/Skeleton";

const ElectionOverviewTable = dynamic(
  () => import("@dashboards/elections/ElectionOverviewTable"),
  { ssr: false },
);

interface ElectionFullResultsProps {
  onChange: (option: Party) => Promise<Result<PartyResult>>;
  options: Array<Party>;
  currentIndex: number;
}

/**
 * Modal popup for a full election result (all parties).
 * Used on the /parties page. Always renders the compact mobile table layout.
 */
const ElectionFullResults = ({
  onChange,
  options,
  currentIndex,
}: ElectionFullResultsProps) => {
  if (!options) return <></>;

  const { t, i18n } = useTranslation(["common", "election"]);
  const [open, setOpen] = useState<boolean>(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { data, setData } = useData<{
    index: number;
    date: string;
    election_name: string;
    loading: boolean;
    results: Result<PartyResult> | undefined;
  }>({
    index: currentIndex,
    date: "",
    election_name: "",
    results: undefined,
    loading: false,
  });

  const selected = options[currentIndex];

  const getData = (obj: Party) => {
    setData("date", toDate(obj.date, "dd MMM yyyy", i18n.language));
    setData("election_name", obj.election_name);
  };

  const Trigger = () => (
    <Button
      variant="default-ghost"
      className="border-0 py-0"
      onClick={() => {
        setData("loading", true);
        setOpen(true);
        getData(options[data.index]);
        onChange(selected)
          .then((results) => {
            if (!results) return;
            setData("results", results);
          })
          .finally(() => setData("loading", false));
      }}
    >
      <ButtonIcon>
        <ArrowsPointingOutIcon className="h-4.5 w-4.5" />
      </ButtonIcon>
      <p className="whitespace-nowrap font-normal">{t("full_result")}</p>
    </Button>
  );

  const Pagination = () => {
    if (options.length > 1)
      return (
        <div className="flex items-center justify-center gap-4 pt-3 text-sm font-medium">
          <Button
            variant={"default-outline"}
            onClick={() => {
              setData("loading", true);
              onChange(options[data.index - 1])
                .then((results) => {
                  if (!results) return;
                  setData("index", data.index - 1);
                  getData(options[data.index - 1]);
                  setData("results", results);
                })
                .finally(() => setData("loading", false));
            }}
            disabled={data.index === 0}
          >
            <ButtonIcon>
              <ChevronLeftIcon className="h-4.5 w-4.5" />
            </ButtonIcon>
            {t("common:previous")}
          </Button>

          <span className="flex items-center gap-1 text-center text-sm text-txt-black-900">
            {`${data.index + 1} of ${options.length}`}
          </span>

          <Button
            variant={"default-outline"}
            onClick={() => {
              setData("loading", true);
              onChange(options[data.index + 1])
                .then((results) => {
                  if (!results) return;
                  setData("index", data.index + 1);
                  setData("results", results);
                  getData(options[data.index + 1]);
                })
                .finally(() => setData("loading", false));
            }}
            disabled={data.index === options.length - 1}
          >
            {t("common:next")}
            <ButtonIcon>
              <ChevronRightIcon className="h-4.5 w-4.5" />
            </ButtonIcon>
          </Button>
        </div>
      );
    return <></>;
  };

  const TableContent = () =>
    data.loading ? (
      <div className="flex-1 space-y-2 px-4 py-2">
        {Array(6)
          .fill(null)
          .map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
      </div>
    ) : (
      <div className="hide-scrollbar flex-1 overflow-y-scroll">
        <ElectionOverviewTable data={(data.results?.data ?? []) as any} className="pt-0" />
      </div>
    );

  if (isDesktop)
    return (
      <Dialog
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
          setData("index", currentIndex);
        }}
      >
        <DialogTrigger asChild>
          <Trigger />
        </DialogTrigger>
        <DialogContent className="flex max-h-[calc(100%-40px)] max-w-4xl flex-col">
          <DialogHeader className="pr-8 uppercase">
            <div className="flex flex-wrap gap-x-2 text-lg">
              <DialogTitle className="text-body-lg font-semibold">
                {t(data.election_name, { ns: "election" })}
              </DialogTitle>
              <DialogDescription className="font-normal text-txt-black-500">
                {data.date}
              </DialogDescription>
            </div>
          </DialogHeader>
          <TableContent />
          <Pagination />
        </DialogContent>
      </Dialog>
    );

  return (
    <Drawer
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        setData("index", currentIndex);
      }}
    >
      <DrawerTrigger asChild>
        <Trigger />
      </DrawerTrigger>
      <DrawerContent className="max-h-[calc(100%-96px)] pt-0">
        <DrawerHeader className="flex w-full flex-col items-start px-4 py-3 uppercase">
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-wrap items-center gap-x-2 text-lg">
              <h5 className="text-body-lg font-semibold">
                {t(data.election_name, { ns: "election" })}
              </h5>
              <span className="text-txt-black-500">{data.date}</span>
            </div>
            <DrawerClose>
              <XMarkIcon className="h-5 w-5 text-txt-black-500" />
            </DrawerClose>
          </div>
        </DrawerHeader>
        <TableContent />
        <DrawerFooter>
          <Pagination />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ElectionFullResults;
