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
  Container,
  Hero,
  ImageWithFallback,
  LeftRightCard,
  StateDropdown,
} from "@components/index";
import SectionGrid from "@components/Section/section-grid";
import { FullResultContent } from "@components/Election/content";
import { ArrowsPointingOutIcon } from "@heroicons/react/20/solid";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useCache } from "@hooks/useCache";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { get } from "@lib/api";
import { clx, numFormat, toDate } from "@lib/helpers";
import { generateSchema } from "@lib/schema/election-explorer";
import { CountryAndStates } from "@lib/constants";
import { routes } from "@lib/routes";
import { BaseResult } from "@dashboards/types";
import { FunctionComponent, useEffect, useRef } from "react";
import { useToast } from "@govtechmy/myds-react/hooks";

/**
 * By-Elections Dashboard
 * @overview Status: Live
 */

export type ByElectionSeat = {
  seat: string;
  state: string;
  date: string;
  party: string;
  party_uid: string;
  coalition: string;
  coalition_uid: number;
  name: string;
  majority: number;
  majority_perc: number;
  voter_turnout: number;
  voter_turnout_perc: number;
  votes_rejected: number;
  votes_rejected_perc: number;
};

interface ByElectionsDashboardProps {
  seats: ByElectionSeat[];
}

const ByElectionsDashboard: FunctionComponent<ByElectionsDashboardProps> = ({
  seats,
}) => {
  const { t, i18n } = useTranslation(["common", "byelections"]);
  const { cache } = useCache();
  const { toast } = useToast();
  const scrollRef = useRef<Record<string, HTMLDivElement | null>>({});

  const getStateCode = (state: string) =>
    state in CountryAndStates
      ? state
      : Object.entries(CountryAndStates).find(([, name]) => name === state)?.[0] ??
        state;

  const statesWithByelections = Array.from(
    new Set(seats.map((s) => getStateCode(s.state))),
  );
  const excludeStates = Object.keys(CountryAndStates).filter(
    (code) => code !== "mys" && !statesWithByelections.includes(code),
  );

  const { data, setData } = useData({
    seat: seats[0]?.seat ?? "",
    search_seat: "",
    loading: false,
    results: {} as { data?: BaseResult[]; votes?: any[] },
    filter_state: "mys",
    open: false,
  });

  const filteredSeats =
    !data.filter_state || data.filter_state === "mys"
      ? seats
      : seats.filter((s) => getStateCode(s.state) === data.filter_state);

  const SEAT_OPTIONS = filteredSeats.map((s) => {
    const year = new Date(s.date).getFullYear();
    return { label: `[${year}]  ${s.seat}`, value: s.seat };
  });

  const columns = generateSchema<BaseResult>([
    { key: "name", id: "name", header: t("candidate_name") },
    { key: "party", id: "party", header: t("party_name") },
    { key: "votes", id: "votes", header: t("votes_won") },
  ]);

  const fetchSeatResult = async (seat: string, date: string) => {
    const identifier = `byelection-${seat}-${date}`;
    if (cache.has(identifier)) return setData("results", cache.get(identifier));
    setData("loading", true);
    try {
      const response = await get(
        `/results/${encodeURIComponent(seat)}/${date}.json`,
      );
      const { ballot, summary } = response.data;
      const stats = summary[0];
      const results = {
        data: ballot,
        votes: [
          { x: "majority", abs: stats.majority, perc: stats.majority_perc },
          {
            x: "voter_turnout",
            abs: stats.voter_turnout,
            perc: stats.voter_turnout_perc,
          },
          {
            x: "rejected_votes",
            abs: stats.votes_rejected,
            perc: stats.votes_rejected_perc,
          },
        ],
      };
      cache.set(identifier, results);
      setData("results", results);
    } catch (e) {
      toast({
        variant: "error",
        title: t("toast.request_failure"),
        description: t("toast.try_again"),
      });
    } finally {
      setData("loading", false);
    }
  };

  useEffect(() => {
    if (seats.length > 0) {
      const first = seats[0];
      setData("seat", first.seat);
      fetchSeatResult(first.seat, first.date);
    }
  }, [seats]);

  const selectedSeat = seats.find((s) => s.seat === data.seat);

  return (
    <>
      <Hero
        background="red"
        category={[t("hero.category", { ns: "byelections" }), "text-txt-danger"]}
        header={[t("hero.header", { ns: "byelections" })]}
        description={[t("hero.description", { ns: "byelections", count: seats.length })]}
        pageId={routes.BYELECTIONS}
      />
      <Container>
        <SectionGrid className="space-y-6 py-2 pb-16 lg:space-y-12 lg:pb-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-center gap-2">
              <StateDropdown
                currentState={data.filter_state ?? "mys"}
                exclude={excludeStates}
                onChange={(selected) => {
                  const newState = selected?.value ?? "mys";
                  setData("filter_state", newState);
                  const newFiltered =
                    newState === "mys"
                      ? seats
                      : seats.filter((s) => getStateCode(s.state) === newState);
                  if (newFiltered.length > 0) {
                    setData("seat", newFiltered[0].seat);
                    setData("search_seat", "");
                    fetchSeatResult(newFiltered[0].seat, newFiltered[0].date);
                  }
                }}
                width="w-fit"
                anchor="left"
              />
            </div>
          </div>

          <div className="max-h-[650px] w-full">
            <LeftRightCard
              leftBg="overflow-hidden lg:max-w-[360px] lg:w-full"
              left={
                <div className="relative flex h-fit w-full flex-col overflow-hidden bg-bg-washed px-3 pb-3 md:overflow-y-auto lg:h-[650px] lg:rounded-bl-xl lg:rounded-tl-xl lg:rounded-tr-none lg:pb-8 xl:px-6">
                  <div className="sticky top-0 z-10 border-b border-otl-gray-200 pb-3 pt-6">
                    <ComboBox
                      placeholder={t("search_seat", { ns: "byelections" })}
                      options={SEAT_OPTIONS}
                      config={{
                        keys: ["label"],
                        baseSort: (a: any, b: any) => a.refIndex - b.refIndex,
                      }}
                      format={(option) => (
                        <span className="block min-w-0 truncate">
                          {option.label}
                        </span>
                      )}
                      selected={
                        data.search_seat
                          ? SEAT_OPTIONS.find(
                              (e) => e.value === data.search_seat,
                            )
                          : null
                      }
                      onChange={(selected) => {
                        if (selected) {
                          const found = seats.find(
                            (s) => s.seat === selected.value,
                          );
                          if (found) {
                            setData("seat", found.seat);
                            setData("search_seat", found.seat);
                            fetchSeatResult(found.seat, found.date);
                            scrollRef.current[found.seat]?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                              inline: "end",
                            });
                          }
                        } else {
                          setData("search_seat", "");
                        }
                      }}
                    />
                  </div>
                  <Drawer
                    open={data.open}
                    onOpenChange={(open) => setData("open", open)}
                  >
                    <div className="hide-scrollbar grid h-[394px] max-w-screen-sm grid-flow-col grid-rows-3 overflow-x-auto rounded-md sm:max-w-screen-md md:max-w-screen-lg lg:flex lg:h-full lg:w-full lg:flex-col lg:overflow-y-auto lg:px-0.5">
                      {filteredSeats.map((_seat) => {
                        const {
                          seat,
                          name,
                          majority,
                          majority_perc,
                          party,
                          date,
                        } = _seat;
                        return (
                          <div
                            ref={(ref) => {
                              scrollRef && (scrollRef.current[seat] = ref);
                            }}
                            key={`${seat}-${date}`}
                            className="pb-px pl-px pr-3 pt-3 lg:pr-0"
                          >
                            <div
                              className={clx(
                                "flex h-full w-full flex-col gap-2 p-3 text-body-sm max-lg:w-72",
                                "bg-bg-white lg:active:bg-bg-black-100",
                                "border border-bg-black-200 lg:hover:border-bg-black-400",
                                "rounded-xl focus:outline-none",
                                seat === data.seat &&
                                  "ring-1 ring-danger-600 lg:hover:border-transparent",
                              )}
                              onClick={() => {
                                setData("seat", seat);
                                setData("search_seat", seat);
                                fetchSeatResult(seat, date);
                              }}
                            >
                              <div className="flex w-full items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 gap-2">
                                  <span className="text-zinc-500 text-sm font-medium shrink-0">
                                    {seat.slice(0, 5)}
                                  </span>
                                  <span className="truncate font-medium">
                                    {seat.slice(5)}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <span className="text-body-xs text-txt-black-400 uppercase">
                                    {toDate(date, "dd MMM yyyy", i18n.language)}
                                  </span>
                                  <DrawerTrigger asChild>
                                    <Button
                                      type="reset"
                                      className="text-zinc-500 p-0 lg:hidden"
                                    >
                                      <ArrowsPointingOutIcon className="h-4 w-4" />
                                    </Button>
                                  </DrawerTrigger>
                                </div>
                              </div>

                              <div className="flex h-8 w-full items-center gap-1.5">
                                <ImageWithFallback
                                  className="border border-otl-gray-200"
                                  src={`/static/images/parties/${_seat.party_uid}.png`}
                                  width={32}
                                  height={18}
                                  alt={party}
                                  style={{
                                    width: "auto",
                                    maxWidth: "32px",
                                    height: "auto",
                                    maxHeight: "32px",
                                  }}
                                />
                                <span className="max-w-full truncate font-medium">
                                  {`${name} `}
                                </span>
                                <span>{`(${party})`}</span>
                                <Won />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <p className="text-body-sm text-txt-black-500">
                                    {t("majority")}
                                  </p>
                                  <span>
                                    {majority === null
                                      ? `—`
                                      : numFormat(majority, "standard")}
                                    {majority_perc === null
                                      ? ` (—)`
                                      : ` (${numFormat(majority_perc, "compact", 1)}%)`}
                                  </span>
                                </div>
                                <BarPerc
                                  hidden
                                  value={majority_perc}
                                  size="h-[5px] w-[30px] lg:w-[288px]"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <DrawerContent className="h-full max-h-[calc(100%-96px)] pt-0">
                      <DrawerHeader className="flex w-full items-start gap-3 px-4 py-3">
                        {selectedSeat && (
                          <ByElectionResultHeader seat={selectedSeat} />
                        )}
                        <DrawerClose>
                          <XMarkIcon className="h-5 w-5 text-txt-black-500" />
                        </DrawerClose>
                      </DrawerHeader>
                      <FullResultContent
                        columns={columns}
                        data={data.results.data}
                        highlightedRows={[0]}
                        loading={data.loading}
                        result="won"
                        votes={data.results.votes ?? []}
                      />
                    </DrawerContent>
                  </Drawer>
                </div>
              }
              rightBg="lg:w-full h-[650px] w-full space-y-4.5 bg-bg-white p-6 pb-8 max-lg:hidden overflow-scroll"
              right={
                <div className="space-y-4.5">
                  {data.results.data &&
                    data.results.data.length > 0 &&
                    selectedSeat && (
                      <>
                        <ByElectionResultHeader seat={selectedSeat} />
                        <FullResultContent
                          columns={columns}
                          data={data.results.data}
                          highlightedRows={[0]}
                          loading={data.loading}
                          result="won"
                          votes={data.results.votes ?? []}
                        />
                      </>
                    )}
                </div>
              }
            />
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

interface ByElectionResultHeaderProps {
  seat: ByElectionSeat;
}

const ByElectionResultHeader = ({ seat }: ByElectionResultHeaderProps) => {
  const { t, i18n } = useTranslation(["common", "byelections"]);
  const [area, state] = seat.seat.split(",");

  return (
    <div className="flex grow flex-col gap-2">
      <div className="flex flex-wrap gap-x-1.5 text-body-lg uppercase">
        <h5 className="font-bold">{area}</h5>
        <p className="text-txt-black-500">{state}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 text-body-md">
        <p>{t("byelections:election_name")}</p>
        <p className="text-txt-black-500">
          {toDate(seat.date, "dd MMM yyyy", i18n.language)}
        </p>
      </div>
    </div>
  );
};

export default ByElectionsDashboard;
