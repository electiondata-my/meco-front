import ResultBadge from "@components/Election/ResultBadge";
import type {
  BaseResult,
  Candidate,
  ElectionResult,
  Party,
  PartyResult,
  Seat,
} from "@dashboards/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import Button from "@components/Button";
import { clx, toDate } from "@lib/helpers";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { useState } from "react";
import { useMediaQuery } from "@hooks/useMediaQuery";
import { FullResultContent } from "./content";

export type Result<T> = {
  data: T;
  votes?: Array<{
    x: string;
    abs: number;
    perc: number;
  }>;
} | void;

interface FullResultsProps<T extends Candidate | Party | Seat> {
  onChange: (option: T) => Promise<Result<BaseResult[] | PartyResult>>;
  options: Array<T>;
  columns?: any;
  highlighted?: string;
  highlightedRows?: Array<number>;
  currentIndex: number;
}

const FullResults = <T extends Candidate | Party | Seat>({
  onChange,
  options,
  columns,
  highlighted,
  highlightedRows,
  currentIndex,
}: FullResultsProps<T>) => {
  if (!options) return <></>;

  const { t, i18n } = useTranslation(["common", "election"]);
  const [open, setOpen] = useState<boolean>(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { data, setData } = useData<{
    index: number;
    badge: ElectionResult | undefined;
    area: string;
    date: string;
    election_name: string;
    state: string;
    loading: boolean;
    results: Result<BaseResult[] | PartyResult> | undefined;
  }>({
    index: currentIndex,
    area: "",
    badge: undefined,
    date: "",
    election_name: "",
    state: "",
    results: undefined,
    loading: false,
  });

  console.log(options);

  const selected = options[currentIndex];
  const isCandidate = typeof selected === "object" && "result" in selected;
  const isParty =
    typeof selected === "object" && "seats" in selected && "state" in selected;

  const getData = (obj: Candidate | Party | Seat) => {
    setData("date", toDate(obj.date, "dd MMM yyyy", i18n.language));
    setData("election_name", obj.election_name);
    if ("seat" in obj) {
      const matches = obj.seat.split(",");
      setData("area", matches[0]);
      setData("state", matches[1]);
    }
    if ("result" in obj) {
      setData("badge", obj.result);
    }
  };

  const Trigger = () => (
    <Button
      variant="reset"
      className="flex gap-2 text-txt-black-500 hover:text-txt-black-900"
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
      <ArrowsPointingOutIcon className="h-4.5 w-4.5" />
      <p className="whitespace-nowrap font-normal">{t("full_result")}</p>
    </Button>
  );

  const Pagination = () => {
    if (options.length > 1)
      return (
        <div className="space-y-3">
          {options && options?.length <= 10 && (
            <div className="flex flex-row items-center justify-center gap-1.5">
              {options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setData("loading", true);
                    onChange(option)
                      .then((results) => {
                        if (!results) return;
                        setData("index", index);
                        setData("results", results);
                        getData(options[index]);
                      })
                      .finally(() => setData("loading", false));
                  }}
                  disabled={index === data.index}
                  className={clx(
                    "h-1 w-5 rounded-md",
                    index === data.index
                      ? "bg-zinc-900 dark:bg-white"
                      : "bg-slate-200 hover:bg-slate-100 dark:bg-zinc-700 dark:hover:bg-zinc-800",
                  )}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-4 text-sm font-medium">
            <Button
              className="btn-default btn-disabled"
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
              <ChevronLeftIcon className="h-4.5 w-4.5" />
              {t("common:previous")}
            </Button>
            {options.length > 10 && (
              <span className="flex items-center gap-1 text-center text-sm">
                {`${data.index + 1} / ${options.length}`}
              </span>
            )}
            <Button
              className="btn-default btn-disabled"
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
              <ChevronRightIcon className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      );
    return <></>;
  };

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
        <DialogContent className="max-w-4xl">
          <DialogHeader className="pr-8 uppercase">
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-wrap gap-x-2 text-lg">
                <h5 className="text-body-lg font-semibold">
                  {isParty
                    ? t(data.election_name, { ns: "election" })
                    : data.area}
                </h5>
                <span className="font-normal text-txt-black-500">
                  {isParty ? data.date : data.state}
                </span>
              </div>

              {isCandidate && <ResultBadge value={data.badge} />}
            </div>
            {!isParty && (
              <div className="flex flex-wrap gap-x-2 text-body-sm">
                <span>{t(data.election_name, { ns: "election" })}</span>
                <span className="text-txt-black-500">{data.date}</span>
              </div>
            )}
          </DialogHeader>
          <FullResultContent
            data={data.results?.data}
            columns={columns}
            loading={data.loading}
            highlighted={highlighted}
            highlightedRows={highlightedRows}
            result={isCandidate ? selected.result : undefined}
            votes={data.results?.votes ?? []}
          />
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
            <div className="flex flex-wrap gap-x-2 text-lg">
              <h5>
                {isParty
                  ? t(data.election_name, { ns: "election" })
                  : data.area}
              </h5>
              <span className="text-zinc-500">
                {isParty ? data.date : data.state}
              </span>
            </div>
            <DrawerClose>
              <XMarkIcon className="text-zinc-500 h-5 w-5" />
            </DrawerClose>
          </div>
          {!isParty && (
            <div className="flex flex-wrap gap-x-2">
              <span>{t(data.election_name, { ns: "election" })}</span>
              <span className="text-zinc-500">{data.date}</span>
            </div>
          )}
          {isCandidate && <ResultBadge value={data.badge} />}
        </DrawerHeader>
        <FullResultContent
          data={data.results?.data}
          columns={columns}
          loading={data.loading}
          highlighted={highlighted}
          highlightedRows={highlightedRows}
          result={isCandidate ? selected.result : undefined}
          votes={data.results?.votes || []}
        />
        <DrawerFooter>
          <Pagination />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default FullResults;
