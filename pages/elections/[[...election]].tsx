import Metadata from "@components/Metadata";
import ElectionExplorerDashboard from "@dashboards/elections";
import { useTranslation } from "@hooks/useTranslation";
import { get } from "@lib/api";
import { CountryAndStates } from "@lib/constants";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import groupBy from "lodash/groupBy";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

const ElectionExplorerIndex: Page = ({
  choropleth,
  last_updated,
  meta,
  params,
  seats,
  selection,
  table,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("common");

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={t("header")}
        description={t("description")}
        keywords=""
      />
      <ElectionExplorerDashboard
        choropleth={choropleth}
        last_updated={last_updated}
        params={params}
        seats={seats}
        selection={selection}
        table={table}
      />
    </AnalyticsProvider>
  );
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = withi18n(
  ["election", "elections", "home", "party"],
  async ({ params }) => {
    try {
      const [state_code, election_name] = params?.election
        ? (params.election as string[])
        : ["mys", "GE-15"];
      const state = CountryAndStates[state_code];

      const election_type = election_name?.startsWith("S") ? "dun" : "parlimen";

      const results = await Promise.allSettled([
        get("/dates.json"),
        get(`/elections/${state}/${election_type}-${election_name}.json`),
      ]);

      const [dropdown, electionData] = results.map((e) => {
        if (e.status === "rejected") return null;
        else return e.value.data;
      });

      const selection: Array<{ state: string, election: string }> = dropdown.data;
      const stateExists = selection.some((e) => e.state === state);
      const electionExists = selection.some((e) => e.election === election_name);

      if (!stateExists || !electionExists) return { notFound: true };

      return {
        props: {
          meta: {
            id: "elections",
            type: "dashboard",
          },
          params: { election: election_name, state: state_code },
          seats: electionData.stats,
          selection: groupBy(selection, "state"),
          table: electionData.ballot,
          choropleth: {},
        },
      };
    } catch (error: any) {
      console.error(error.message);
      return { notFound: true };
    }
  }
);

export default ElectionExplorerIndex;
