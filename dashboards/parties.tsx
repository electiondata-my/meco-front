import { ElectionResource, Party, PartyResult } from "./types";
import FullResults, { Result } from "@components/Election/FullResults";
import { generateSchema } from "@lib/schema/election-explorer";
import { get } from "@lib/api";
import {
  ComboBox,
  Container,
  Hero,
  ImageWithFallback,
  Panel,
  StateDropdown,
  Tabs,
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
import SectionGrid from "@components/Section/section-grid";
import { useToast } from "@govtechmy/myds-react/hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@govtechmy/myds-react/tooltip";
import { QuestionCircleIcon } from "@govtechmy/myds-react/icon";

/**
 * Parties
 * @overview Status: Live
 */

const ElectionTable = dynamic(
  () => import("@components/Election/ElectionTable"),
  {
    ssr: false,
  },
);

interface ElectionPartiesProps extends ElectionResource<Party> {
  selection: { party: string }[];
}

const ElectionPartiesDashboard: FunctionComponent<ElectionPartiesProps> = ({
  elections,
  params,
  selection,
}) => {
  const { t } = useTranslation(["common", "parties"]);
  const { cache } = useCache();
  const { toast } = useToast();

  const PARTY_OPTIONS: Array<OptionType> = selection.map((option) => ({
    label: t(option.party, { ns: "party" }),
    value: option.party,
  }));

  const DEFAULT_PARTY = "PERIKATAN";
  const PARTY_OPTION = PARTY_OPTIONS.find(
    (e) => e.value === (params.party ?? DEFAULT_PARTY),
  );
  const CURRENT_STATE = params.state ?? "mys";

  const { data, setData } = useData({
    tab_index: 0, // parlimen = 0; dun = 1
    party_value: DEFAULT_PARTY,
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
    state: string,
  ): Promise<Result<PartyResult>> => {
    const identifier = `${election}_${state}`;
    return new Promise(async (resolve) => {
      if (cache.has(identifier)) return resolve(cache.get(identifier));
      const election_type = data.tab_index ? "dun" : "parlimen";
      const election_name = election ?? "GE-15";
      const url = `/elections/${state}/${election_type}-${election_name}.json`;
      try {
        const { data: response } = await get(url);
        const ballot = response.ballot;
        const stats = response.summary[0];
        const result: Result<PartyResult> = {
          data: ballot,
          votes: [
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
        cache.set(identifier, result);
        resolve(result);
      } catch (e) {
        toast({
          variant: "error",
          title: t("toast.request_failure"),
          description: t("toast.try_again"),
        });
        throw new Error("Invalid party. Message: " + e);
      }
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
      <Hero
        background="red"
        category={[t("hero.category", { ns: "parties" }), "text-txt-danger"]}
        header={[t("hero.header", { ns: "parties" })]}
        description={[t("hero.description", { ns: "parties" })]}
        pageId="/parties"
      />
      <Container>
        <SectionGrid className="space-y-6 py-6 lg:space-y-16 lg:pb-16">
          <div className="mt-3">
            <div className="mx-auto w-full md:w-[727px]">
              <ComboBox
                placeholder={t("search_party", { ns: "parties" })}
                image={(value: string) => (
                  <div className="flex h-auto max-h-8 w-8 justify-center self-center">
                    <ImageWithFallback
                      className="rounded border border-otl-gray-200"
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
                      { scroll: false },
                    );
                  } else setData("party_value", "");
                }}
              />
            </div>
          </div>
          <div className="w-full space-y-6">
            <Tabs
              title={
                <div className="flex items-center gap-1.5">
                  <span className="text-body-md lg:text-heading-2xs">
                    <ImageWithFallback
                      className="mr-2 inline-block rounded border border-otl-gray-200"
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
                        party: `$t(party:${PARTY_OPTION?.value ?? DEFAULT_PARTY})`,
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
                          { scroll: false },
                        );
                      }}
                      width="inline-flex"
                      anchor="left"
                    />
                  </span>
                  {/* <Tooltip>
                    <TooltipTrigger className="h-6 w-6">
                      <QuestionCircleIcon className="h-4 w-4 text-txt-black-500" />
                    </TooltipTrigger>
                
                    <TooltipContent>
                      Founded in 1952 by Tunku Abdul Rahman Putra al-Haj, Tan
                      Cheng Lock, V. T. Sambanthan and still active until today
                    </TooltipContent>
                  </Tooltip> */}
                </div>
              }
              current={data.tab_index}
              onChange={(index: number) => setData("tab_index", index)}
              className="w-full gap-4"
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
        </SectionGrid>
      </Container>
    </>
  );
};

export default ElectionPartiesDashboard;
