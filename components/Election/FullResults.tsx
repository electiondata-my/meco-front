import ResultBadge from "@components/Election/ResultBadge";
import type {
  BaseResult,
  Candidate,
  ElectionResult,
  Seat,
} from "@dashboards/types";
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
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@components/drawer";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { ArrowsPointingOutIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { clx, toDate } from "@lib/helpers";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { useState, type ReactNode } from "react";
import { useMediaQuery } from "@hooks/useMediaQuery";
import { FullResultContent } from "./content";
import { ButtonIcon, Button } from "@govtechmy/myds-react/button";

export type Result<T> = {
  data: T;
  votes?: Array<{
    x: string;
    abs: number;
    perc: number;
  }>;
} | void;

interface FullResultsProps<T extends Candidate | Seat> {
  onChange: (option: T) => Promise<Result<BaseResult[]>>;
  options: Array<T>;
  columns?: any;
  highlighted?: string | Record<string, any>;
  highlightedRows?: Array<number>;
  currentIndex: number;
  /** When "short", party column shows party code + (coalition) instead of full name. */
  partyNameDisplay?: "full" | "short";
  /** Content to prepend inside the mobile (Drawer) trigger button, replacing the text label. */
  mobileTriggerPrefix?: ReactNode;
}

/**
 * Modal popup for a single constituency result (candidates / seats / byelections).
 * For the full election result (parties), use ElectionFullResults instead.
 */
const FullResults = <T extends Candidate | Seat>({
  onChange,
  options,
  columns,
  highlighted,
  highlightedRows,
  currentIndex,
  partyNameDisplay,
  mobileTriggerPrefix,
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
    results: Result<BaseResult[]> | undefined;
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

  const selected = options[currentIndex];
  const isCandidate = typeof selected === "object" && "result" in selected;

  const getData = (obj: Candidate | Seat) => {
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

  const Trigger = ({ mobile = false }: { mobile?: boolean }) => {
    const prefix = mobile ? mobileTriggerPrefix : null;
    return (
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
        {prefix}
        <ButtonIcon>
          <ArrowsPointingOutIcon className="h-4.5 w-4.5" />
        </ButtonIcon>
        {!prefix && (
          <p className="whitespace-nowrap font-normal">{t("full_result")}</p>
        )}
      </Button>
    );
  };

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

  const ResultHeading = () => (
    <div className="flex flex-wrap items-center gap-x-1.5 text-body-md font-semibold uppercase">
      <span>
        {t("election_result")}
        {isCandidate && data.badge ? ":" : ""}
      </span>
      {isCandidate && data.badge && (
        <span className="font-normal">
          <ResultBadge value={data.badge} reversed />
        </span>
      )}
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
          <DialogHeader className="gap-3 space-y-0 pr-8 uppercase">
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-wrap items-center gap-x-1 text-body-md">
                <span className="font-semibold">{t(data.election_name, { ns: "election" })}</span>
                <span className="text-txt-black-500">·</span>
                <span className="text-txt-black-500">{data.date}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-1 text-body-md">
              <DialogTitle className="text-body-md font-semibold">
                {data.area}
                {data.state ? "," : ""}
              </DialogTitle>
              <DialogDescription className="text-body-md font-normal text-txt-black-500">
                {data.state}
              </DialogDescription>
            </div>
            <ResultHeading />
          </DialogHeader>
          <FullResultContent
            data={data.results?.data}
            columns={columns}
            loading={data.loading}
            highlighted={highlighted}
            highlightedRows={highlightedRows}
            result={isCandidate ? data.badge : undefined}
            votes={data.results?.votes ?? []}
            partyNameDisplay={partyNameDisplay}
            headerClassName="!bg-bg-dialog"
            showResultHeading={false}
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
        <Trigger mobile />
      </DrawerTrigger>
      <DrawerContent className="pt-0">
        <DrawerHeader className="flex w-full flex-col items-start gap-3 px-4 py-3 uppercase">
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-wrap items-center gap-x-1 text-body-md">
              <span className="font-semibold">{t(data.election_name, { ns: "election" })}</span>
              <span className="text-txt-black-500">·</span>
              <span className="text-txt-black-500">{data.date}</span>
            </div>
            <DrawerClose>
              <XMarkIcon className="h-5 w-5 text-txt-black-500" />
            </DrawerClose>
          </div>
          <div className="flex flex-wrap items-center gap-x-1 text-body-md">
            <DrawerTitle className="text-body-md font-semibold">
              {data.area}
              {data.state ? "," : ""}
            </DrawerTitle>
            <span className="text-txt-black-500">{data.state}</span>
          </div>
          <ResultHeading />
        </DrawerHeader>
        <FullResultContent
          data={data.results?.data}
          columns={columns}
          loading={data.loading}
          highlighted={highlighted}
          highlightedRows={highlightedRows}
          result={isCandidate ? data.badge : undefined}
          votes={data.results?.votes || []}
          partyNameDisplay={partyNameDisplay}
          compactMobileTable
          showResultHeading={false}
        />
        <DrawerFooter>
          <Pagination />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default FullResults;
