import {
  BaseResult,
  ElectionResource,
  ElectionType,
  Seat,
  SeatOptions,
} from "./types";
import FullResults, { Result } from "@components/Election/FullResults";
import { generateSchema } from "@lib/schema/election-explorer";
import { get } from "@lib/api";
import { Container, Hero, toast } from "@components/index";
import SectionGrid from "@components/Section/section-grid";
import {
  SearchBar,
  SearchBarInput,
  SearchBarInputContainer,
  SearchBarSearchButton,
  SearchBarResults,
  SearchBarResultsList,
  SearchBarResultsItem,
  SearchBarClearButton,
  SearchBarHint,
} from "@govtechmy/myds-react/search-bar";
import { Pill } from "@govtechmy/myds-react/pill";
import { useCache } from "@hooks/useCache";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { OptionType } from "@lib/types";
import dynamic from "next/dynamic";
import { FunctionComponent, useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Seats
 * @overview Status: Live
 */

const ElectionTable = dynamic(
  () => import("@components/Election/ElectionTable"),
  {
    ssr: false,
  },
);
const Toast = dynamic(() => import("@components/Toast"), { ssr: false });

interface ElectionSeatsProps extends ElectionResource<Seat> {
  selection: Array<SeatOptions & { slug: string }>;
}

type SeatOption = {
  state: string;
  seat: string;
  type: ElectionType;
};

const ElectionSeatsDashboard: FunctionComponent<ElectionSeatsProps> = ({
  elections,
  last_updated,
  params,
  selection,
}) => {
  const { t } = useTranslation(["common", "home"]);
  const { cache } = useCache();

  const SEAT_OPTIONS: Array<OptionType & SeatOption> = selection.map(
    ({ seat_name, slug, type }) => ({
      label: seat_name.concat(` (${t(type)})`),
      value: type + "_" + slug,
      state: seat_name.split(", ")[1],
      seat: seat_name.split(", ")[0],
      type: type,
    }),
  );

  const DEFAULT_SEAT =
    params.type && params.seat_name
      ? `${params.type}_${params.seat_name}`
      : "p138-kota-melaka-melaka";

  const SEAT_OPTION = SEAT_OPTIONS.find((e) => e.value === DEFAULT_SEAT);

  const { data, setData } = useData({
    seat_value: null,
    loading: false,
    elections: elections,
  });

  const fetchFullResult = async (
    election: string,
    seat: string,
    date: string,
  ): Promise<Result<BaseResult[]>> => {
    const identifier = `${election}_${seat}`;
    return new Promise(async (resolve) => {
      if (cache.has(identifier)) return resolve(cache.get(identifier));
      try {
        const response = await get(
          `/results/${encodeURIComponent(seat)}/${date}.json`,
        );
        const { ballot, summary } = response.data;
        const summaryStats = summary[0];

        const result: Result<BaseResult[]> = {
          data: ballot,
          votes: [
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
          ],
        };
        cache.set(identifier, result);
        resolve(result);
      } catch (e) {
        toast.error(t("toast.request_failure"), t("toast.try_again"));
        throw new Error("Invalid election or seat. Message: " + e);
      }
    });
  };

  const seat_schema = generateSchema<Seat>([
    {
      key: "election_name",
      id: "election_name",
      header: t("election_name"),
    },
    { key: "seat", id: "seat", header: t("constituency") },
    {
      key: "party",
      id: "party",
      header: t("winning_party"),
    },
    { key: "name", id: "name", header: t("candidate_name") },
    { key: "majority", id: "majority", header: t("majority") },
    {
      key: (item) => item,
      id: "full_result",
      header: "",
      cell: ({ row }) => (
        <FullResults
          options={data.elections}
          currentIndex={row.index}
          onChange={(option: Seat) =>
            fetchFullResult(option.election_name, option.seat, option.date)
          }
          columns={generateSchema<BaseResult>([
            { key: "name", id: "name", header: t("candidate_name") },
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
          ])}
        />
      ),
    },
  ]);

  const { events, push } = useRouter();
  useEffect(() => {
    const finishLoading = () => {
      setData("loading", false);
      setData("seat_value", `${params.type}_${params.seat_name}`);
    };
    events.on("routeChangeComplete", finishLoading);
    return () => events.off("routeChangeComplete", finishLoading);
  }, [params]);

  return (
    <>
      <Toast />
      <Hero
        background="red"
        category={[t("hero.category", { ns: "home" }), "text-txt-danger"]}
        header={[t("hero.header", { ns: "home" })]}
        description={[t("hero.description", { ns: "home" })]}
        pageId="sitewide"
        withPattern={true}
        action={
          <SearchBar size="large" className="w-full py-3 lg:max-w-[628px]">
            <SearchBarInputContainer className="has-[input:focus]:border-otl-danger-300 has-[input:focus]:ring-otl-danger-200">
              <SearchBarInput />
              <SearchBarHint>
                Press <Pill size="small">/</Pill> to search
              </SearchBarHint>
              <SearchBarClearButton />
              <SearchBarSearchButton className="border-otl-danger-300 from-danger-400 to-danger-600 shadow-button focus:ring-fr-danger" />
            </SearchBarInputContainer>
            <SearchBarResults open={false}>
              <SearchBarResultsList>
                <SearchBarResultsItem value="foo">Foo</SearchBarResultsItem>
                <SearchBarResultsItem value="bar">Bar</SearchBarResultsItem>
              </SearchBarResultsList>
            </SearchBarResults>
          </SearchBar>
        }
      />

      <Container>
        <SectionGrid className="space-y-10 py-16">
          <h2 className="max-w-[846px] text-center font-heading text-heading-2xs font-semibold">
            <span className="text-txt-danger">{SEAT_OPTION?.label}</span>
            {
              " is a {small / average-sized / large} {urban/rural} {Parlimen / DUN} in Melaka with 2,547,557 voters as of {election name} "
            }
          </h2>

          <div className="flex h-[328px] w-[628px] items-center justify-center bg-bg-white-disabled text-center font-mono text-heading-xl">
            container for mapbox
          </div>
        </SectionGrid>
        <SectionGrid className="space-y-6 pb-16">
          <div className="w-full space-y-10">
            {/* <div className="mx-auto w-full py-6 sm:w-[500px]">
                <ComboBox<SeatOption>
                  placeholder={t("search_seat", { ns: "home" })}
                  options={SEAT_OPTIONS}
                  config={{
                    baseSort: (a, b) => {
                      if (a.item.type === b.item.type) {
                        return String(a.item.seat).localeCompare(
                          String(b.item.seat)
                        );
                      }
                      return a.item.type === "parlimen" ? -1 : 1;
                    },
                    keys: ["label", "seat", "state", "type"],
                  }}
                  format={(option) => (
                    <>
                      <span>{`${option.seat}, ${option.state} `}</span>
                      <span className="text-zinc-500">
                        {"(" + t(option.type) + ")"}
                      </span>
                    </>
                  )}
                  selected={
                    data.seat_value
                      ? SEAT_OPTIONS.find((e) => e.value === data.seat_value)
                      : null
                  }
                  onChange={(selected) => {
                    if (selected) {
                      setData("loading", true);
                      setData("seat_value", selected.value);
                      const [type, seat] = selected.value.split("_");
                      push(`/${type}/${seat}`, undefined, { scroll: false })
                        .catch((e) => {
                          t("toast.request_failure"),
                            toast.error("toast.try_again");
                        })
                        .finally(() => setData("loading", false));
                    } else setData("seat_value", selected);
                  }}
                />
              </div> */}
            <ElectionTable
              title={
                <h2 className="text-center font-heading text-heading-2xs font-semibold">
                  {t("title", { ns: "home" })}
                  <span className="text-txt-danger">{SEAT_OPTION?.label}</span>
                </h2>
              }
              data={elections}
              columns={seat_schema}
              isLoading={data.loading}
            />
          </div>
        </SectionGrid>

        <SectionGrid className="space-y-10 py-16">
          <h2 className="text-center font-heading text-heading-2xs font-semibold">
            A breakdown of the 2,547,557 voters in{" "}
            <span className="text-txt-danger">{SEAT_OPTION?.label}</span>
          </h2>

          <div className="flex w-full gap-6">
            <div className="flex h-[516px] w-[410px] items-center justify-center rounded-lg border border-otl-gray-200 bg-bg-white-disabled text-center font-mono text-heading-xl">
              PYRAMID Chart here
            </div>
            <div className="flex flex-1 flex-col gap-6">
              <div className="flex h-full w-full gap-6">
                <div className="flex h-[272px] flex-1 items-center justify-center rounded-lg border border-otl-gray-200 bg-bg-white-disabled text-center font-mono text-heading-xl">
                  CHART 1
                </div>
                <div className="flex h-[272px] flex-1 items-center justify-center rounded-lg border border-otl-gray-200 bg-bg-white-disabled text-center font-mono text-heading-xl">
                  CHART 2
                </div>
              </div>
              <div className="flex h-full w-full gap-6">
                <div className="flex h-[220px] flex-1 items-center justify-center rounded-lg border border-otl-gray-200 bg-bg-white-disabled text-center font-mono text-heading-xl">
                  CHART 3
                </div>
                <div className="flex h-[220px] flex-1 items-center justify-center rounded-lg border border-otl-gray-200 bg-bg-white-disabled text-center font-mono text-heading-xl">
                  CHART 4
                </div>
              </div>
            </div>
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

export default ElectionSeatsDashboard;
