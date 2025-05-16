import Layout from "@components/Layout";
import Metadata from "@components/Metadata";
import StateDropdown from "@components/Dropdown/StateDropdown";
import StateModal from "@components/Modal/StateModal";
import ElectionTriviaDashboard from "@dashboards/trivia";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { useTranslation } from "@hooks/useTranslation";
import { WindowProvider } from "@lib/contexts/window";
import { get } from "@lib/api";
import { CountryAndStates } from "@lib/constants";
import { withi18n } from "@lib/decorators";
import { clx } from "@lib/helpers";
import { Page } from "@lib/types";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

const ElectionTriviaState: Page = ({
  bar_dun,
  last_updated,
  meta,
  params,
  bar_parlimen,
  table,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("common");

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={CountryAndStates[params.state].concat(" - Trivia")}
        description={t("description")}
        keywords={""}
      />
      <ElectionTriviaDashboard
        bar_dun={bar_dun}
        last_updated={last_updated}
        params={params}
        bar_parlimen={bar_parlimen}
        table={table}
      />
    </AnalyticsProvider>
  );
};

ElectionTriviaState.layout = (page, props) => (
  <WindowProvider>
    <Layout
      stateSelector={
        <StateDropdown
          width="w-max xl:w-64"
          url="/trivia"
          exclude={["kul", "lbn", "pjy"]}
          currentState={props.params.state}
          hideOnScroll
        />
      }
    >
      <StateModal
        state={props.params.state}
        url="/trivia"
        exclude={["kul", "lbn", "pjy"]}
      />
      {page}
    </Layout>
  </WindowProvider>
);

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

    const results = await Promise.allSettled([
      get("/trivia_slim_big.json", {
        state,
      }),
      get("/trivia_veterans.json", {
        state,
        area_type: "parlimen",
      }),
      get("/trivia_veterans.json", {
        state,
        area_type: "dun",
      }),
    ]).catch((e) => {
      throw new Error("Invalid party name. Message: " + e);
    });

    const [{ data: table }, { data: parlimen }, { data: dun }] = results.map(
      (e) => {
        if (e.status === "rejected") return {};
        else return e.value.data;
      }
    );

    return {
      notFound: false,
      props: {
        // last_updated: data.data_last_updated,
        meta: {
          id: "trivia",
          type: "dashboard",
        },
        bar_dun: dun ?? [],
        params: { state: state_code },
        bar_parlimen: parlimen,
        table: table,
      },
    };
  }
);

export default ElectionTriviaState;
