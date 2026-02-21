import { BaseResult, Candidate, ElectionResource } from "./types";
import FullResults, { Result } from "@components/Election/FullResults";
import { generateSchema } from "@lib/schema/election-explorer";
import { get } from "@lib/api";
import { ComboBox, Container, Hero, Panel, Tabs } from "@components/index";
import { useCache } from "@hooks/useCache";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { OptionType } from "@lib/types";
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
 * Candidates Dashboard
 * @overview Status: Live
 */

const ElectionTable = dynamic(
  () => import("@components/Election/ElectionTable"),
  {
    ssr: false,
  },
);

interface ElectionCandidatesProps extends ElectionResource<Candidate> {
  selection: Record<"name" | "slug" | "c" | "w" | "l", string>[];
}

const ElectionCandidatesDashboard: FunctionComponent<
  ElectionCandidatesProps
> = ({ elections, params, selection }) => {
  const { t } = useTranslation(["common", "candidates"]);
  const { toast } = useToast();

  const CANDIDATE_OPTIONS: Array<OptionType> = selection.map(
    ({ name, slug, c, w, l }) => ({
      label: `${name} (W${w}, L${l})`,
      value: slug,
      contests: Number(c),
      wins: Number(w),
      losses: Number(l),
    }),
  );

  const DEFAULT_CANDIDATE = "CMVBA";
  const CANDIDATE_OPTION = CANDIDATE_OPTIONS.find(
    (e) => e.value === (params.candidate ?? DEFAULT_CANDIDATE),
  );

  const { cache } = useCache();
  const { data, setData } = useData({
    tab_index: 0, // parlimen = 0; dun = 1
    candidate_value: "",
    loading: false,
    parlimen: elections.parlimen,
    dun: elections.dun,
  });

  const candidate_schema = generateSchema<Candidate>([
    { key: "election_name", id: "election_name", header: t("election_name") },
    { key: "seat", id: "seat", header: t("constituency") },
    { key: "party", id: "party", header: t("party_name") },
    { key: "votes", id: "votes", header: t("votes_won") },
    { key: "result", id: "result", header: t("result") },
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
            onChange={(option: Candidate) =>
              fetchFullResult(option.election_name, option.seat, option.date)
            }
            columns={generateSchema<BaseResult>([
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
            ])}
            highlighted={CANDIDATE_OPTION?.label}
          />
        );
      },
    },
  ]);

  const fetchFullResult = async (
    election: string,
    seat: string,
    date: string,
  ): Promise<Result<BaseResult[]>> => {
    const identifier = `${election}_${seat}_${params.candidate}`;
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
        toast({
          variant: "error",
          title: t("toast.request_failure"),
          description: t("toast.try_again"),
        });
        throw new Error("Invalid election or seat. Message: " + e);
      }
    });
  };

  const { events, push } = useRouter();
  useEffect(() => {
    const finishLoading = () => {
      setData("loading", false);
      setData("candidate_value", params.candidate);
      setData("tab_index", elections.parlimen.length === 0 ? 1 : 0);
    };
    events.on("routeChangeComplete", finishLoading);
    return () => events.off("routeChangeComplete", finishLoading);
  }, [params]);

  return (
    <>
      <Hero
        background="red"
        category={[t("hero.category", { ns: "candidates" }), "text-txt-danger"]}
        header={[t("hero.header", { ns: "candidates" })]}
        description={[t("hero.description", { ns: "candidates" })]}
        pageId={routes.CANDIDATES}
      />
      <Container>
        <SectionGrid className="space-y-6 py-6 lg:space-y-16 lg:pb-16">
          <div className="mt-3 w-full">
            <div className="mx-auto w-full md:w-[727px]">
              <ComboBox
                placeholder={t("search_candidate", { ns: "candidates" })}
                options={CANDIDATE_OPTIONS}
                config={{
                  baseSort: (a: any, b: any) => {
                    a;
                    if ((a.item.contests ?? 0) === (b.item.contests ?? 0)) {
                      return (b.item.wins ?? 0) - (a.item.wins ?? 0);
                    }
                    return (b.item.contests ?? 0) - (a.item.contests ?? 0);
                  },
                  keys: ["label", "name"],
                }}
                selected={
                  data.candidate_value
                    ? CANDIDATE_OPTIONS.find(
                      (e) => e.value === data.candidate_value,
                    )
                    : null
                }
                onChange={(selected) => {
                  if (selected) {
                    setData("loading", true);
                    setData("candidate_value", selected.value);
                    push(routes.CANDIDATES + "/" + selected.value, undefined, {
                      scroll: false,
                    });
                  } else setData("candidate_value", "");
                }}
              />
            </div>
          </div>
          <div className="w-full space-y-6">
            <Tabs
              title={
                <p className="text-heading-2xs font-bold">
                  {t("title", { ns: "candidates" })}
                  <span className="text-txt-danger">
                    {CANDIDATE_OPTION?.label}
                  </span>
                  {/* <Tooltip>
                    <TooltipTrigger className="inline-flex h-6 w-6 items-center justify-center">
                      <QuestionCircleIcon className="h-4 w-4 text-txt-black-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Malay male, born 8 Feb 1903 - died 6 Dec 1990 (age 87)
                    </TooltipContent>
                  </Tooltip> */}
                </p>
              }
              current={data.tab_index}
              onChange={(index) => setData("tab_index", index)}
              className="w-full gap-4"
            >
              <Panel name={t("parlimen")}>
                <ElectionTable
                  data={elections.parlimen}
                  columns={candidate_schema}
                  isLoading={data.loading}
                  empty={t("no_data", {
                    ns: "candidates",
                    name: CANDIDATE_OPTION?.label,
                    context: "parliament",
                  })}
                  hideNameInMobileParty
                />
              </Panel>
              <Panel name={t("dun")}>
                <ElectionTable
                  data={elections.dun}
                  columns={candidate_schema}
                  isLoading={data.loading}
                  empty={t("no_data", {
                    ns: "candidates",
                    name: CANDIDATE_OPTION?.label,
                    context: "dun",
                  })}
                  hideNameInMobileParty
                />
              </Panel>
            </Tabs>
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

export default ElectionCandidatesDashboard;
