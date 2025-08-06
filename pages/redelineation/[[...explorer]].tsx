import Metadata from "@components/Metadata";
import RedelineationDashboard from "@dashboards/redelineation";
import { useTranslation } from "@hooks/useTranslation";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

const RedelineationIndex: Page = ({
  meta,
  bar,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation(["redelineation"]);

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={t("hero.header", { ns: "redelineation" })}
        description={t("hero.description", { ns: "redelineation" })}
        keywords=""
      />
      <RedelineationDashboard bar_data={bar} />
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
  ["redelineation", "home"],
  async ({ params }) => {
    try {
      const [type, year, election_type] = params?.explorer
        ? (params.explorer as string[])
        : ["peninsular", "2018", "parlimen"];

      if (!type || !year || !election_type) return { notFound: true };

      const bar = {
        state: [
          "Johor",
          "Perak",
          "Kedah",
          "Kelantan",
          "Pahang",
          "N. Sembilan",
          "Terengganu",
          "Selangor",
          "Penang",
          "Malacca",
          "Perlis",
          "Putrajaya",
          "KL",
        ],
        unchanged: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
        bigger: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        smaller: [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
        new: [1, 4, 6, 1, 3, 2, 7, 4, 2, 1, 2, 4, 4],
      };
      return {
        props: {
          meta: {
            id: "redelineation",
            type: "dashboard",
          },
          bar,
        },
      };
    } catch (error) {
      return { notFound: true };
    }
  },
);

export default RedelineationIndex;
