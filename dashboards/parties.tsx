import { ElectionResource, Party, PartyResult, PartySummary } from "./types";
import FullResults, { Result } from "@components/Election/FullResults";
import { generateSchema } from "@lib/schema/election-explorer";
import { get } from "@lib/api";
import {
  ComboBox,
  Container,
  Hero,
  ImageWithFallback,
  Panel,
  Section,
  StateDropdown,
  Tabs,
  toast,
} from "@components/index";
import { CountryAndStates } from "@lib/constants";
import { useCache } from "@hooks/useCache";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { OptionType } from "@lib/types";
import { Trans } from "next-i18next";
import dynamic from "next/dynamic";
import { FunctionComponent, useEffect } from "react";
import { useRouter } from "next/router";
import { routes } from "@lib/routes";

/**
 * Parties
 * @overview Status: Live
 */

const ElectionTable = dynamic(
  () => import("@components/Election/ElectionTable"),
  {
    ssr: false,
  }
);
const Toast = dynamic(() => import("@components/Toast"), { ssr: false });

interface ElectionPartiesProps extends ElectionResource<Party> {
  selection: { party: string }[];
}

const ElectionPartiesDashboard: FunctionComponent<ElectionPartiesProps> = ({
  elections,
  last_updated,
  params,
  selection,
}) => {
  const { t } = useTranslation(["common", "parties"]);
  const { cache } = useCache();

  const PARTY_OPTIONS: Array<OptionType> = selection.map((option) => ({
    label: t(option.party, { ns: "party" }),
    value: option.party,
  }));

  const DEFAULT_PARTY = "PERIKATAN";
  const PARTY_OPTION = PARTY_OPTIONS.find(
    (e) => e.value === (params.party ?? DEFAULT_PARTY)
  );
  const CURRENT_STATE = params.state ?? "mys";

  const { data, setData } = useData({
    tab_index: 0, // parlimen = 0; dun = 1
    party_value: null,
    loading: false,
    state: CURRENT_STATE,
    parlimen: elections.parlimen,
    dun: elections.dun,
  });

  const party_schema = generateSchema<Party>([
    {
      key: "election_name",
      id: "election_name",
      header: t("election_name"),
    },
    {
      key: "seats",
      id: "seats",
      header: t("seats_won"),
    },
    {
      key: "votes",
      id: "votes",
      header: t("votes_won"),
    },
    {
      key: (item) => item,
      id: "full_result",
      header: "",
      cell: ({ row }) => {
        const selection =
          data.tab_index === 0 ? elections.parlimen : elections.dun;

        return (
          <FullResults
            options={selection}
            currentIndex={row.index}
            onChange={(option: Party) =>
              fetchFullResult(option.election_name, option.state)
            }
            columns={generateSchema<PartyResult[number]>([
              {
                key: "party",
                id: "party",
                header: t("party_name"),
              },
              {
                key: "seats",
                id: "seats",
                header: t("seats_won"),
              },
              {
                key: "votes",
                id: "votes",
                header: t("votes_won"),
              },
            ])}
            highlighted={data.party_value ?? DEFAULT_PARTY}
          />
        );
      },
    },
  ]);

  const fetchFullResult = async (
    election: string,
    state: string
  ): Promise<Result<PartyResult>> => {
    const identifier = `${election}_${state}`;
    return new Promise(async (resolve) => {
      if (cache.has(identifier)) return resolve(cache.get(identifier));
      const queries = await Promise.allSettled([
        get("/result_election.json", {
          election_name: election ?? "GE-15",
          state: state ?? "Malaysia",
          election_type: data.tab_index ? "dun" : "parlimen",
        }),
        get("/result_election_summary.json", {
          election_name: election ?? "GE-15",
          state: state === "Malaysia" ? undefined : state,
          election_type: data.tab_index ? "dun" : "parlimen",
        }),
      ]).catch((e) => {
        toast.error(t("toast.request_failure"), t("toast.try_again"));
        throw new Error("Invalid party. Message: " + e);
      });

      const [{ data: ballot }, { data: ballot_summary }] = queries.map((e) => {
        if (e.status === "rejected") return {};
        else return e.value.data;
      });

      const summary = (ballot_summary as PartySummary[]).reduce(
        (acc, curr) => ({
          voter_turnout: acc.voter_turnout + curr.voter_turnout,
          voter_turnout_perc:
            acc.voter_turnout_perc +
            Math.round(curr.voter_turnout / curr.voter_turnout_perc * 100),
          votes_rejected: acc.votes_rejected + curr.votes_rejected,
          votes_rejected_perc:
            acc.votes_rejected_perc +
            Math.round(curr.votes_rejected / curr.votes_rejected_perc * 100),
        }),
        {
          voter_turnout: 0,
          voter_turnout_perc: 0,
          votes_rejected: 0,
          votes_rejected_perc: 0,
        }
      );

      const result: Result<PartyResult> = {
        data: ballot,
        votes: [
          {
            x: "voter_turnout",
            abs: summary.voter_turnout,
            perc: summary.voter_turnout / summary.voter_turnout_perc * 100,
          },
          {
            x: "rejected_votes",
            abs: summary.votes_rejected,
            perc: summary.votes_rejected / summary.votes_rejected_perc * 100,
          },
        ],
      };
      cache.set(identifier, result);
      resolve(result);
    });
  };

  const { events, push } = useRouter();
  useEffect(() => {
    const finishLoading = () => {
      setData("loading", false);
      setData("state", params.state);
      setData("party_value", params.party);
    };
    events.on("routeChangeComplete", finishLoading);
    return () => events.off("routeChangeComplete", finishLoading);
  }, [params]);

  return (
    <>
      <Toast />
      <Hero
        background="red"
        category={[t("hero.category", { ns: "parties" }), "text-danger"]}
        header={[t("hero.header", { ns: "parties" })]}
        description={[t("hero.description", { ns: "parties" })]}
        last_updated={last_updated}
      />
      <Container>
        <Section>
          <div className="xl:grid xl:grid-cols-12">
            <div className="xl:col-span-10 xl:col-start-2">
              {/* Explore any party's entire electoral history */}
              <h4 className="text-center">{t("header", { ns: "parties" })}</h4>
              <div className="mx-auto w-full py-6 sm:w-[500px]">
                <ComboBox
                  placeholder={t("search_party", { ns: "parties" })}
                  image={(value) => (
                    <div className="flex h-auto max-h-8 w-8 justify-center self-center">
                      <ImageWithFallback
                        className="border-slate-200 dark:border-zinc-700 rounded border"
                        src={`/static/images/parties/${value}.png`}
                        width={28}
                        height={18}
                        alt={value}
                        style={{
                          width: "auto",
                          maxWidth: "28px",
                          height: "auto",
                          maxHeight: "28px",
                        }}
                      />
                    </div>
                  )}
                  options={PARTY_OPTIONS}
                  selected={
                    data.party_value
                      ? PARTY_OPTIONS.find((e) => e.value === data.party_value)
                      : null
                  }
                  onChange={(selected) => {
                    if (selected) {
                      setData("loading", true);
                      setData("party_value", selected.value);
                      push(
                        `${routes.PARTIES}/${selected.value}/${
                          data.state ?? CURRENT_STATE
                        }`,
                        undefined,
                        { scroll: false }
                      );
                    } else setData("party_value", selected);
                  }}
                />
              </div>
              <Tabs
                title={
                  <span className="text-lg leading-9">
                    <ImageWithFallback
                      className="border-slate-200 dark:border-zinc-800 mr-2 inline-block rounded border"
                      src={`/static/images/parties/${
                        PARTY_OPTION?.value ?? DEFAULT_PARTY
                      }.png`}
                      width={32}
                      height={18}
                      alt={t(PARTY_OPTION?.value ?? DEFAULT_PARTY)}
                      inline
                    />
                    <Trans>
                      {t("title", {
                        ns: "parties",
                        party: `$t(party:${
                          PARTY_OPTION?.value ?? DEFAULT_PARTY
                        })`,
                      })}
                    </Trans>
                    <StateDropdown
                      currentState={data.state ?? "mys"}
                      onChange={(selected) => {
                        setData("loading", true);
                        setData("state", selected.value);
                        push(
                          `${routes.PARTIES}/${
                            data.party_value ? data.party_value : DEFAULT_PARTY
                          }/${selected.value}`,
                          undefined,
                          { scroll: false }
                        );
                      }}
                      width="inline-flex ml-0.5"
                      anchor="left"
                    />
                  </span>
                }
                current={data.tab_index}
                onChange={(index: number) => setData("tab_index", index)}
                className="py-6"
              >
                <Panel name={t("parlimen")}>
                  <ElectionTable
                    data={elections.parlimen}
                    columns={party_schema}
                    isLoading={data.loading}
                    empty={
                      <Trans>
                        {t("no_data", {
                          ns: "parties",
                          party: `$t(party:${params.party ?? DEFAULT_PARTY})`,
                          state: CountryAndStates[params.state],
                          context: "parlimen",
                        })}
                      </Trans>
                    }
                  />
                </Panel>
                <Panel name={t("dun")}>
                  <ElectionTable
                    data={
                      ["mys", null].includes(params.state) ? [] : elections.dun
                    }
                    columns={party_schema}
                    isLoading={data.loading}
                    empty={
                      <Trans>
                        {t("no_data", {
                          ns: "parties",
                          party: `$t(party:${params.party ?? DEFAULT_PARTY})`,
                          state: CountryAndStates[params.state],
                          context: ["kul", "lbn", "pjy"].includes(params.state)
                            ? "dun_wp"
                            : ["mys", null].includes(params.state)
                            ? "dun_mys"
                            : "dun",
                        })}
                      </Trans>
                    }
                  />
                </Panel>
              </Tabs>
            </div>
          </div>
        </Section>
      </Container>
    </>
  );
};

export default ElectionPartiesDashboard;
