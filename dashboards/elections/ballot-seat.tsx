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
  Dropdown,
} from "@components/index";
import { ArrowsPointingOutIcon } from "@heroicons/react/20/solid";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useCache } from "@hooks/useCache";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { get } from "@lib/api";
import { clx, numFormat, toDate } from "@lib/helpers";
import { generateSchema } from "@lib/schema/election-explorer";
import { BaseResult, OverallSeat } from "../types";
import { FullResultContent } from "../../components/Election/content";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import SectionGrid from "@components/Section/section-grid";
import { useToast } from "@govtechmy/myds-react/hooks";

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
  const { toast } = useToast();
  const scrollRef = useRef<Record<string, HTMLDivElement | null>>({});

  const { data, setData } = useData({
    seat: seats[0].seat,
    search_seat: "",
    loading: false,
    results: {},
    filter_result: t("contested_by", { ns: "elections" }),
    filter_party: "",
  });

  const [open, setOpen] = useState<boolean>(false);

  const filteredSeats = seats.filter((seat) => {
    const partyLost = seat.party_lost || [];
    const selectedParty = data.filter_party;
    const selectedResult = data.filter_result;

    if (selectedParty && selectedParty !== "" && selectedResult) {
      if (selectedResult === t("won_by", { ns: "elections" })) {
        return seat.party === selectedParty;
      } else if (selectedResult === t("lost_by", { ns: "elections" })) {
        return partyLost.includes(selectedParty);
      } else if (selectedResult === t("contested_by", { ns: "elections" })) {
        return (
          seat.party === selectedParty || partyLost.includes(selectedParty)
        );
      }
    } else if (selectedParty && selectedParty !== "") {
      // If only party is selected, show all seats where the party won or lost
      return seat.party === selectedParty || partyLost.includes(selectedParty);
    } else if (selectedResult) {
      // If only result is selected, show all seats that match the result for any party
      return true;
    }
    return true;
  });

  // Dynamically generate party options based on filter_result
  let partyOptions: { label: string; value: string | null }[] = [];
  if (data.filter_result === t("won_by", { ns: "elections" })) {
    partyOptions = Array.from(new Set(seats.map((seat) => seat.party)))
      .filter((party) => !!party)
      .map((party) => ({
        label: t(party, { ns: "parties" }),
        value: String(party),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } else if (data.filter_result === t("lost_by", { ns: "elections" })) {
    const lostParties = seats.flatMap((seat) => seat.party_lost || []);
    partyOptions = Array.from(new Set(lostParties))
      .filter((party) => !!party)
      .map((party) => ({
        label: t(party, { ns: "parties" }),
        value: String(party),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } else {
    // Contested By: union of party and party_lost
    const allParties = [
      ...seats.map((seat) => seat.party),
      ...seats.flatMap((seat) => seat.party_lost || []),
    ];
    partyOptions = Array.from(new Set(allParties))
      .filter((party) => !!party)
      .map((party) => ({
        label: t(party, { ns: "parties" }),
        value: String(party),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  // Add 'All Parties' option at the top
  partyOptions.unshift({
    label: t("all_parties", { ns: "elections" }),
    value: "",
  });

  const SEAT_OPTIONS = filteredSeats.map((seat) => ({
    label: seat.seat,
    value: seat.seat,
  }));

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

  const fetchSeatResult = async (seat: string, date: string) => {
    if (!election) return;
    const identifier = `${state}-${election}-${seat}`;
    if (cache.has(identifier)) return setData("results", cache.get(identifier));
    else {
      setData("loading", true);
      try {
        const response = await get(
          `/results/${encodeURIComponent(seat)}/${date}.json`,
        );
        const { ballot, summary } = response.data;
        const summaryStats = summary[0];
        const votes = [
          {
            x: "majority",
            abs: summaryStats.majority,
            perc: summaryStats.majority_perc,
          },
          {
            x: "voter_turnout",
            abs: summaryStats.voter_turnout,
            perc: summaryStats.voter_turnout_perc,
          },
          {
            x: "rejected_votes",
            abs: summaryStats.votes_rejected,
            perc: summaryStats.votes_rejected_perc,
          },
        ];
        const results = { data: ballot, votes };
        cache.set(identifier, results);
        setData("results", results);
        setData("loading", false);
      } catch (e) {
        toast({
          variant: "error",
          title: t("toast.request_failure"),
          description: t("toast.try_again"),
        });
        throw new Error("Invalid election or seat. Message: " + e);
      }
    }
  };

  useEffect(() => {
    if (seats.length > 0) {
      const { seat } = seats[0];
      setData("seat", seat);
      fetchSeatResult(seat, seats[0].date);
    }
  }, [seats]);

  return (
    <SectionGrid className="space-y-12 overflow-scroll py-12">
      <div className="flex flex-col gap-6">
        <h4 className="text-center font-heading text-heading-2xs font-bold">
          {t("header_2", { ns: "elections" })}
        </h4>
        <div className="mx-auto flex w-fit items-center gap-2">
          <div className="max-w-fit rounded-full bg-bg-white p-1">
            <Dropdown
              width="w-fit"
              anchor="left"
              placeholder={t("filter_by_result", { ns: "elections" })}
              options={[
                {
                  label: t("contested_by", { ns: "elections" }),
                  value: t("contested_by", { ns: "elections" }),
                },
                {
                  label: t("won_by", { ns: "elections" }),
                  value: t("won_by", { ns: "elections" }),
                },
                {
                  label: t("lost_by", { ns: "elections" }),
                  value: t("lost_by", { ns: "elections" }),
                },
              ]}
              selected={
                data.filter_result
                  ? {
                      label: t(data.filter_result),
                      value: data.filter_result,
                    }
                  : undefined
              }
              onChange={(selected) => {
                setData("filter_result", selected?.value ?? null);
              }}
            />
          </div>
          <div className="max-w-fit rounded-full bg-bg-white p-1">
            <Dropdown
              width="w-fit"
              anchor="left"
              placeholder={t("filter_by_party", { ns: "elections" })}
              options={partyOptions.map((opt) => ({
                ...opt,
                value: opt.value || "", // Convert null to empty string
              }))}
              selected={
                data.filter_party
                  ? partyOptions.find((opt) => opt.value === data.filter_party)
                      ?.value
                    ? {
                        label: partyOptions.find(
                          (opt) => opt.value === data.filter_party,
                        )!.label,
                        value: partyOptions.find(
                          (opt) => opt.value === data.filter_party,
                        )!.value!,
                      }
                    : { label: partyOptions[0].label, value: "" }
                  : { label: partyOptions[0].label, value: "" }
              }
              onChange={(selected) => {
                setData("filter_party", selected?.value ?? "");
              }}
            />
          </div>
        </div>
      </div>
      <LeftRightCard
        leftBg="overflow-hidden lg:max-w-[360px]"
        left={
          <div className="relative flex h-fit w-full flex-col overflow-hidden bg-bg-washed px-3 pb-3 md:overflow-y-auto lg:h-[600px] lg:rounded-bl-xl lg:rounded-tl-xl lg:rounded-tr-none lg:pb-6 xl:px-6">
            <div className="sticky top-0 z-10 border-b border-otl-gray-200 pb-3 pt-6">
              <ComboBox
                placeholder={t("home:search_seat")}
                options={SEAT_OPTIONS}
                selected={
                  data.search_seat
                    ? SEAT_OPTIONS.find((e) => e.value === data.search_seat)
                    : null
                }
                onChange={(selected) => {
                  if (selected) {
                    fetchSeatResult(selected.value, seats[0].date);
                    setData("seat", selected.value);
                    setData("search_seat", selected.value);
                    scrollRef.current[selected.value]?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                      inline: "end",
                    });
                  } else setData("search_seat", "");
                }}
              />
            </div>
            <Drawer open={open} onOpenChange={setOpen}>
              {election && (
                <div className="grid h-[394px] max-w-xs grid-flow-col grid-rows-3 overflow-x-auto rounded-md lg:flex lg:h-full lg:w-full lg:flex-col lg:overflow-y-auto lg:overflow-x-clip">
                  {filteredSeats.map((_seat) => {
                    const { seat, name, majority, majority_perc, party } =
                      _seat;
                    return (
                      <div
                        ref={(ref) => {
                          scrollRef && (scrollRef.current[seat] = ref);
                        }}
                        key={seat}
                        className="pb-px pl-px pr-3 pt-3 lg:pr-0"
                      >
                        <div
                          className={clx(
                            "flex h-full w-full flex-col gap-2 p-3 text-body-sm max-lg:w-72",
                            "bg-bg-white lg:active:bg-bg-black-100",
                            "border border-bg-black-200 lg:hover:border-bg-black-400",
                            "rounded-xl focus:outline-none",
                            seat === data.seat &&
                              "lg:ring-1 lg:ring-primary-600 lg:hover:border-transparent",
                          )}
                          onClick={() => {
                            setData("seat", seat);
                            setData("search_seat", seat);
                            fetchSeatResult(seat, seats[0].date);
                          }}
                        >
                          <div className="flex w-full items-center justify-between">
                            <div className="flex gap-2">
                              <span className="text-zinc-500 text-sm font-medium">
                                {seat.slice(0, 5)}
                              </span>
                              <span className="truncate">{seat.slice(5)}</span>
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

                          <div className="flex h-8 w-full items-center gap-1.5">
                            <ImageWithFallback
                              className="rounded border border-otl-gray-200"
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
                                  : ` (${numFormat(
                                      majority_perc,
                                      "compact",
                                      1,
                                    )}%)`}
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
              )}
              <DrawerContent className="max-h-[calc(100%-96px)] pt-0">
                <DrawerHeader className="flex w-full items-start gap-3 px-4 py-3">
                  <FullResultHeader
                    date={seats[0].date}
                    election={election}
                    seat={data.seat}
                  />
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
                  votes={data.results.votes}
                />
              </DrawerContent>
            </Drawer>
          </div>
        }
        right={
          <div className="h-[600px] w-full space-y-8 overflow-y-auto bg-bg-white p-8 max-lg:hidden">
            {data.results.data && data.results.data.length > 0 && election && (
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
    </SectionGrid>
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
    <div className="flex grow flex-col gap-2">
      <div className="flex flex-wrap gap-x-1.5 text-body-lg uppercase">
        <h5 className="font-bold">{area}</h5>
        <p className="text-txt-black-500">{state}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 text-body-md">
        <p>{t(election)}</p>
        <p className="text-txt-black-500">
          {toDate(date, "dd MMM yyyy", i18n.language)}
        </p>
      </div>
    </div>
  );
};

export { FullResultHeader };
