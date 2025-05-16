import Metadata from "@components/Metadata";
import ElectionCandidatesDashboard from "@dashboards/candidates";
import { useTranslation } from "@hooks/useTranslation";
import { getNew } from "@lib/api";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import groupBy from "lodash/groupBy";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

const ElectionCandidates: Page = ({
  elections,
  last_updated,
  meta,
  params,
  selection,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("common");

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={t("header")}
        description={t("description")}
        keywords=""
      />
      <ElectionCandidatesDashboard
        elections={elections}
        last_updated={last_updated}
        params={params}
        selection={selection}
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
  ["candidates", "election"],
  async ({ params }) => {
    try {
      const slug = params && params.slug ? params.slug.toString() : null;

      const results = await Promise.allSettled([
        getNew("/candidates/dropdown.json"),
        getNew(`/candidates/${slug ?? "00103"}.json`),
      ]);

      const [dropdown, candidate] = results.map((e) => {
        if (e.status === "rejected") return null;
        else return e.value.data;
      });

      const selection: Array<{ slug: string }> = dropdown.data;
      const slugExists = selection.some((e) => e.slug === slug);

      if (slug && !slugExists) return { notFound: true };

      const elections = groupBy(candidate.data, "type");

      return {
        props: {
          // last_updated: candidate.data_last_updated,
          meta: {
            id: "candidates",
            type: "dashboard",
          },
          params: { candidate: slug },
          selection,
          elections: {
            parlimen: elections.parlimen ?? [],
            dun: elections.dun ?? [],
          },
        },
      };
    } catch (e: any) {
      console.error(e.message);
      return { notFound: true };
    }
  }
);

export default ElectionCandidates;
