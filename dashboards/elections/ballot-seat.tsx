import BarPerc from "@charts/bar-perc";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTrigger,
} from "@components/drawer";
import { Won } from "@components/Election/ResultBadge";
import {
  Button,
  ComboBox,
  ImageWithFallback,
  LeftRightCard,
  Section,
  toast,
} from "@components/index";
import { ArrowsPointingOutIcon } from "@heroicons/react/20/solid";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useCache } from "@hooks/useCache";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { getNew } from "@lib/api";
import { CountryAndStates } from "@lib/constants";
import { clx, numFormat, toDate } from "@lib/helpers";
import { generateSchema } from "@lib/schema/election-explorer";
import { BaseResult, OverallSeat } from "../types";
import { FullResultContent } from "../../components/Election/content";
import { FunctionComponent, useEffect, useRef, useState } from "react";

/**
 * Election Explorer - Ballot Seat
 * @overview Status: In-development
 */

interface BallotSeatProps {
  seats: OverallSeat[];
  state: string;
  election: string;
}

const BallotSeat: FunctionComponent<BallotSeatProps> = ({
  seats,
  state,
  election,
}) => {
  const { t } = useTranslation(["common", "elections", "home"]);
  const { cache } = useCache();
  const scrollRef = useRef<Record<string, HTMLDivElement | null>>({});

  const SEAT_OPTIONS = seats.map((seat) => ({
    label: seat.seat,
    value: seat.seat,
  }));

  const [open, setOpen] = useState<boolean>(false);
  const { data, setData } = useData({
    seat: seats[0].seat,
    search_seat: "",
    loading: false,
    results: {},
  });

  const columns = generateSchema<BaseResult>([
    {
      key: "name",
      id: "name",
      header: t("candidate_name"),
    },
    {
      key: "party",
      id: "party",
      header: t("party_name"),
    },
    {
      key: "votes",
      id: "votes",
      header: t("votes_won"),
    },
  ]);

  const fetchSeatResult = async (seat: string) => {
    if (!election) return;
    const identifier = `${state}-${election}-${seat}`;
    if (cache.has(identifier))
      return setData("seat_result", cache.get(identifier));
    else {
      setData("loading", true);
      const responses = await Promise.allSettled([
        getNew(`/results/${encodeURIComponent(seat)}/${election}.json`),
        getNew(`/results/${encodeURIComponent(seat)}/${election}-summary.json`),
      ]).catch((e) => {
        toast.error(t("toast.request_failure"), t("toast.try_again"));
        throw new Error("Invalid election or seat. Message: " + e);
      });

      const [{ data: ballot }, { data: ballot_summary }] = responses.map(
        (e) => {
          if (e.status === "rejected") return {};
          else return e.value.data;
        }
      );
      const summary = ballot_summary[0];
      const votes = [
        {
          x: "majority",
          abs: summary.majority,
          perc: summary.majority_perc,
        },
        {
          x: "voter_turnout",
          abs: summary.voter_turnout,
          perc: summary.voter_turnout_perc,
        },
        {
          x: "rejected_votes",
          abs: summary.votes_rejected,
          perc: summary.votes_rejected_perc,
        },
      ];
      const results = { data: ballot, votes };
      cache.set(identifier, results);
      setData("results", results);
      setData("loading", false);
    }
  };

  useEffect(() => {
    if (seats.length > 0) {
      const { seat } = seats[0];
      setData("seat", seat);
      fetchSeatResult(seat);
    }
  }, [seats]);

  return (
    <Section>
      <div className="grid grid-cols-12">
        <div className="col-span-full col-start-1 space-y-12 xl:col-span-10 xl:col-start-2">
          <div className="space-y-6">
            <h4 className="text-center">
              {t("header_2", { ns: "elections" })}
            </h4>
            <LeftRightCard
              left={
                <div
                  className="relative flex h-fit w-full flex-col overflow-hidden 
                px-3 pb-3 md:overflow-y-auto lg:h-[600px] lg:rounded-bl-xl lg:rounded-tr-none lg:pb-6 xl:px-6"
                >
                  <div className="bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 sticky top-0 z-10 border-b pb-3 pt-6">
                    <ComboBox
                      placeholder={t("home:search_seat")}
                      options={SEAT_OPTIONS}
                      selected={
                        data.search_seat
                          ? SEAT_OPTIONS.find(
                              (e) => e.value === data.search_seat
                            )
                          : null
                      }
                      onChange={(selected) => {
                        if (selected) {
                          fetchSeatResult(selected.value);
                          setData("seat", selected.value);
                          setData("search_seat", selected.value);
                          scrollRef.current[selected.value]?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                            inline: "end",
                          });
                        } else setData("search_seat", selected);
                      }}
                    />
                  </div>
                  <Drawer open={open} onOpenChange={setOpen}>
                    {election && (
                      <div className="grid lg:flex lg:flex-col grid-flow-col grid-rows-3 h-[394px] lg:h-full overflow-x-auto lg:overflow-y-auto">
                        {seats.map((_seat) => {
                          const { seat, name, majority, majority_perc, party } =
                            _seat;
                          return (
                            <div
                              ref={(ref) => {
                                scrollRef && (scrollRef.current[seat] = ref);
                              }}
                              key={seat}
                              className="pt-3 pr-3 pb-px pl-px"
                            >
                              <div
                                className={clx(
                                  "flex flex-col h-full max-lg:w-72 w-full gap-2 p-3 text-sm",
                                  "bg-white dark:bg-zinc-900 lg:hover:dark:bg-zinc-900/50 lg:active:bg-slate-100 lg:active:dark:bg-zinc-900",
                                  "border border-slate-200 dark:border-zinc-800 lg:hover:border-slate-400 lg:dark:hover:border-zinc-700",
                                  "rounded-xl focus:outline-none",
                                  seat === data.seat &&
                                    "lg:ring-primary lg:dark:ring-primary-dark lg:ring-1 lg:hover:border-transparent"
                                )}
                                onClick={() => {
                                  setData("seat", seat);
                                  setData("search_seat", seat);
                                  fetchSeatResult(seat);
                                }}
                              >
                                <div className="flex w-full items-center justify-between">
                                  <div className="flex gap-2">
                                    <span className="text-zinc-500 text-sm font-medium">
                                      {seat.slice(0, 5)}
                                    </span>
                                    <span className="truncate">
                                      {seat.slice(5)}
                                    </span>
                                  </div>

                                  <DrawerTrigger asChild>
                                    <Button
                                      type="reset"
                                      className="text-zinc-500 p-0 lg:hidden"
                                    >
                                      <ArrowsPointingOutIcon className="h-4 w-4" />
                                    </Button>
                                  </DrawerTrigger>
                                </div>

                                <div className="flex w-full h-8 items-center gap-1.5">
                                  <ImageWithFallback
                                    className="border-slate-200 dark:border-zinc-800 rounded border"
                                    src={`/static/images/parties/${party}.png`}
                                    width={32}
                                    height={18}
                                    alt={t(`${party}`)}
                                    style={{
                                      width: "auto",
                                      maxWidth: "32px",
                                      height: "auto",
                                      maxHeight: "32px",
                                    }}
                                  />
                                  <span className="max-w-full truncate font-medium">{`${name} `}</span>
                                  <span>{`(${party})`}</span>
                                  <Won />
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <p className="text-zinc-500 text-sm">
                                    {t("majority")}
                                  </p>
                                  <BarPerc
                                    hidden
                                    value={majority_perc}
                                    size="h-[5px] w-[30px] xl:w-[50px]"
                                  />
                                  <span>
                                    {majority === null
                                      ? `—`
                                      : numFormat(majority, "standard")}
                                    {majority_perc === null
                                      ? ` (—)`
                                      : ` (${numFormat(
                                          majority_perc,
                                          "compact",
                                          1
                                        )}%)`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <DrawerContent className="max-h-[calc(100%-96px)] pt-0">
                      <DrawerHeader className="flex gap-3 items-start w-full px-4 py-3">
                        <FullResultHeader
                          date={seats[0].date}
                          election={election}
                          seat={data.seat}
                        />
                        <DrawerClose>
                          <XMarkIcon className="h-5 w-5 text-zinc-500" />
                        </DrawerClose>
                      </DrawerHeader>
                      <FullResultContent
                        columns={columns}
                        data={data.results.data}
                        highlightedRows={[0]}
                        loading={data.loading}
                        result="won"
                        votes={data.results.votes}
                      />
                    </DrawerContent>
                  </Drawer>
                </div>
              }
              right={
                <div className="max-lg:hidden h-[600px] w-full space-y-8 overflow-y-auto p-8">
                  {data.results.data &&
                    data.results.data.length > 0 &&
                    election && (
                      <>
                        <FullResultHeader
                          date={seats[0].date}
                          election={election}
                          seat={data.seat}
                        />
                        <FullResultContent
                          columns={columns}
                          data={data.results.data}
                          highlightedRows={[0]}
                          loading={data.loading}
                          result="won"
                          votes={data.results.votes}
                        />
                      </>
                    )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </Section>
  );
};

export default BallotSeat;

interface FullResultHeaderProps {
  date: string;
  election: string;
  seat: string;
}

const FullResultHeader = ({ date, election, seat }: FullResultHeaderProps) => {
  const { t, i18n } = useTranslation();
  const [area, state] = seat.split(",");

  return (
    <div className="flex flex-col grow gap-2">
      <div className="flex flex-wrap gap-x-3 uppercase">
        <h5>{area}</h5>
        <p className="text-zinc-500 text-lg">{state}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3">
        <p>{t(election)}</p>
        <p className="text-zinc-500">
          {toDate(date, "dd MMM yyyy", i18n.language)}
        </p>
      </div>
    </div>
  );
};

export { FullResultHeader };
