import Metadata from "@components/Metadata";
import ElectionTriviaDashboard from "@dashboards/trivia";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { useTranslation } from "@hooks/useTranslation";
import { get } from "@lib/api";
import { CountryAndStates } from "@lib/constants";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

const ElectionTriviaState: Page = ({
  bar_dun,
  meta,
  params,
  bar_parlimen,
  table,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("trivia");

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={CountryAndStates[params.state].concat(
          ` - ${t("hero.header", { ns: "trivia" })}`,
        )}
        description={t("hero.description", { ns: "trivia" })}
        keywords={""}
      />
      <ElectionTriviaDashboard
        bar_dun={bar_dun}
        params={params}
        bar_parlimen={bar_parlimen}
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
  ["trivia", "parties"],
  async ({ params }) => {
    const state_code = params?.state ? params.state[0] : "mys";
    const state = CountryAndStates[state_code];

    const response = await get(`/trivia/${state}.json`);
    const { slim_big, veterans_dun, veterans_parlimen } = response.data;

    return {
      notFound: false,
      props: {
        meta: {
          id: "trivia",
          type: "dashboard",
        },
        bar_dun: veterans_dun ?? [],
        params: { state: state_code },
        bar_parlimen: veterans_parlimen ?? [],
        table: slim_big ?? [],
      },
    };
  },
);

export default ElectionTriviaState;
