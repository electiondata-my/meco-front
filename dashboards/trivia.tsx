import { BaseResult, ElectionEnum, Seat } from "./types";
import FullResults, { Result } from "@components/Election/FullResults";
import { FaceFrownIcon } from "@heroicons/react/24/outline";
import { generateSchema } from "@lib/schema/election-explorer";
import { getNew } from "@lib/api";
import {
  Container,
  Dropdown,
  Hero,
  Panel,
  StateDropdown,
  Tabs,
  toast,
} from "@components/index";
import { CountryAndStates } from "@lib/constants";
import { useCache } from "@hooks/useCache";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { VoteIconSolid } from "@icons/index";
import { OptionType } from "@lib/types";
import dynamic from "next/dynamic";
import { FunctionComponent } from "react";

/**
 * Trivia
 * @overview Status: Live
 */

const BarMeter = dynamic(() => import("@charts/bar-meter"), { ssr: false });
const ElectionTable = dynamic(
  () => import("@components/Election/ElectionTable"),
  {
    ssr: false,
  }
);
const Toast = dynamic(() => import("@components/Toast"), { ssr: false });

interface ElectionTriviaProps {
  bar_dun: Array<{ name: string; competed: number; won: number }>;
  last_updated: string;
  params: { state: string };
  bar_parlimen: Array<{ name: string; competed: number; won: number }>;
  table: Array<{ type: string; metric: string }>;
}

const ElectionTriviaDashboard: FunctionComponent<ElectionTriviaProps> = ({
  bar_dun,
  last_updated,
  params,
  bar_parlimen,
  table,
}) => {
  const { t } = useTranslation(["common", "trivia", "parties"]);
  const { cache } = useCache();
  const { data, setData } = useData({
    filter: "slim",
    loading: false,
    state: params.state,
    tab_index: 0,
  });

  const output = table.reduce(
    (prev, curr) => {
      const type = (prev[curr.type] = prev[curr.type] || {});
      const metric = (type[curr.metric] = type[curr.metric] || []);
      metric.push(curr);
      return prev;
    },
    {} as Record<string, any>
  );

  const FILTER_OPTIONS: Array<OptionType> = ["slim", "big"].map(
    (key: string) => ({
      label: t(`trivia:${key}`),
      value: key,
    })
  );

  const fetchFullResult = async (
    election: string,
    seat: string
  ): Promise<Result<BaseResult[]>> => {
    const identifier = `${election}_${seat}`;
    return new Promise(async (resolve) => {
      if (cache.has(identifier)) return resolve(cache.get(identifier));
      const results = await Promise.allSettled([
        getNew(`/results/${encodeURIComponent(seat)}/${election}.json`),
        getNew(`/results/${encodeURIComponent(seat)}/${election}-summary.json`),
      ]).catch((e) => {
        toast.error(t("toast.request_failure"), t("toast.try_again"));
        throw new Error("Invalid party. Message: " + e);
      });

      const [{ data: ballot }, { data: ballot_summary }] = results.map((e) => {
        if (e.status === "rejected") return {};
        else return e.value.data;
      });
      const summary = ballot_summary[0];

      const result: Result<BaseResult[]> = {
        data: ballot,
        votes: [
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
        ],
      };
      cache.set(identifier, result);
      resolve(result);
    });
  };

  const seat_schema = generateSchema<Seat>([
    {
      key: (_, index) => index + 1,
      id: "index",
      header: "#",
      cell: ({ row }) => {
        row.index + 1;
      },
    },
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
    { key: "majority", id: "vote_majority", header: t("majority") },
    {
      key: (item) => item,
      id: "full_result",
      header: "",
      cell: ({ row, getValue }) => {
        const item = getValue() as Seat;

        return (
          <FullResults
            options={
              output.dun
                ? output[
                    data.tab_index === ElectionEnum.Parlimen
                      ? "parlimen"
                      : "dun"
                  ][data.filter]
                : {}
            }
            currentIndex={row.index}
            onChange={(option: Seat) =>
              fetchFullResult(option.election_name, option.seat)
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
            highlighted={item.name}
          />
        );
      },
    },
  ]);

  return (
    <>
      <Toast />
      <Hero
        background="red"
        category={[t("hero.category", { ns: "trivia" }), "text-danger"]}
        header={[t("hero.header", { ns: "trivia" })]}
        description={[t("hero.description", { ns: "trivia" })]}
        last_updated={last_updated}
      />
      <Container>
        <div className="py-8 lg:py-12 xl:grid xl:grid-cols-12">
          <div className="space-y-12 xl:col-span-10 xl:col-start-2">
            <div className="flex flex-col items-center gap-6">
              <h4 className="text-center">
                {t("header", {
                  ns: "trivia",
                  country: CountryAndStates[params.state],
                })}
              </h4>
              <StateDropdown
                url={"/trivia"}
                anchor="left"
                width="w-fit"
                currentState={params.state}
                exclude={["kul", "lbn", "pjy"]}
              />
            </div>

            <div className="space-y-12 lg:space-y-6">
              <div className="border-slate-200 dark:border-zinc-800 w-full space-y-6 rounded-xl border-0 p-0 lg:border lg:p-8">
                <div className="gap-3">
                  <VoteIconSolid className="text-primary mx-auto h-16 w-16" />
                  <h5 className="text-center">
                    {t("majority", {
                      ns: "trivia",
                      context: data.filter,
                      country: CountryAndStates[params.state],
                    })}
                  </h5>
                </div>
                <Tabs
                  title={
                    <Dropdown
                      anchor="left"
                      width="w-fit"
                      options={FILTER_OPTIONS}
                      selected={FILTER_OPTIONS.find(
                        (e) => e.value === data.filter
                      )}
                      onChange={(e) => setData("filter", e.value)}
                    />
                  }
                  current={data.tab_index}
                  onChange={(index: number) => setData("tab_index", index)}
                >
                  <Panel name={t("parlimen")}>
                    <div className="max-h-[500px] overflow-auto md:max-h-full">
                      <ElectionTable
                        data={output.parlimen[data.filter].sort(
                          (a: Seat, b: Seat) =>
                            data.filter === "big" &&
                            Number(b.majority) - Number(a.majority)
                        )}
                        columns={seat_schema}
                        isLoading={data.loading}
                        highlightedRows={[0, 1, 2]}
                      />
                    </div>
                  </Panel>
                  <Panel name={t("dun")}>
                    <ElectionTable
                      data={
                        output.dun
                          ? output.dun[data.filter].sort(
                              (a: Seat, b: Seat) =>
                                data.filter === "big" &&
                                Number(b.majority) - Number(a.majority)
                            )
                          : {}
                      }
                      columns={seat_schema}
                      isLoading={data.loading}
                      highlightedRows={[1, 2, 3]}
                      empty={t("no_data_dun_wp", {
                        ns: "parties",
                        state: CountryAndStates[params.state],
                      })}
                    />
                  </Panel>
                </Tabs>
              </div>
              <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:gap-6 xl:grid-cols-6">
                <div className="border-slate-200 dark:border-zinc-800 space-y-6 rounded-xl border-0 p-0 lg:border lg:p-8 xl:col-span-2 xl:col-start-2">
                  <h5 className="text-center">
                    {t("ge_veterans", { ns: "trivia" })}
                  </h5>
                  <BarMeter
                    layout="horizontal"
                    data={bar_parlimen.map((e) => ({
                      x: e.name,
                      y: e.competed,
                    }))}
                    relative
                    formatY={(competed, name) => (
                      <p className="whitespace-nowrap">{`${competed} (${t(
                        "won",
                        {
                          ns: "trivia",
                        }
                      )} ${bar_parlimen.find(
                        (e: Record<string, any>) => e.name === name
                      )?.won})`}</p>
                    )}
                  />
                </div>
                <div className="border-slate-200 dark:border-zinc-800 flex h-max flex-col gap-y-6 rounded-xl border-0 p-0 lg:border lg:p-8 xl:col-span-2 xl:col-start-4">
                  <h5 className="text-center">
                    {t("se_veterans", { ns: "trivia" })}
                  </h5>
                  {bar_dun ? (
                    <BarMeter
                      layout="horizontal"
                      data={bar_dun.map((e) => ({
                        x: e.name,
                        y: e.competed,
                      }))}
                      relative
                      formatY={(competed, name) => (
                        <p className="whitespace-nowrap">{`${competed} (${t(
                          "won",
                          {
                            ns: "trivia",
                          }
                        )} ${bar_dun.find(
                          (e: Record<string, any>) => e.name === name
                        )?.won})`}</p>
                      )}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="bg-slate-200 dark:bg-zinc-800 flex h-auto w-[300px] rounded-md px-3 pb-2 pt-1">
                        <p className="text-sm">
                          <span className="inline-flex pr-1">
                            <FaceFrownIcon className="h-5 w-5 translate-y-1" />
                          </span>
                          {t("no_data_dun_wp", {
                            ns: "parties",
                            state: CountryAndStates[params.state],
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default ElectionTriviaDashboard;
