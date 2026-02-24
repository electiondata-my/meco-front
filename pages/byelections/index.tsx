import Metadata from "@components/Metadata";
import ByElectionsDashboard from "@dashboards/byelections";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { Page } from "@lib/types";
import { useTranslation } from "@hooks/useTranslation";
import { GetStaticProps, InferGetStaticPropsType } from "next";

/**
 * By-Elections Page
 * @overview Status: Live
 */

const ByElectionsPage: Page = ({
  meta,
  seats,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("byelections");

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={t("hero.header", { ns: "byelections" })}
        description={t("hero.description", { ns: "byelections", count: seats.length })}
        keywords=""
      />
      <ByElectionsDashboard seats={seats} />
    </AnalyticsProvider>
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  ["byelections"],
  async () => {
    try {
      const response = await get("/elections/byelections.json");
      const seats = (response.data.data as any[]).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      return {
        props: {
          meta: {
            id: "byelections",
            type: "dashboard",
          },
          seats,
        },
      };
    } catch (error: any) {
      console.error(error.message);
      return { notFound: true };
    }
  },
);

export default ByElectionsPage;
