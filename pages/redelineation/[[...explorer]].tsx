import Metadata from "@components/Metadata";
import RedelineationDashboard from "@dashboards/redelineation";
import { useTranslation } from "@hooks/useTranslation";
import { get } from "@lib/api";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { MapProvider } from "react-map-gl/mapbox";

const RedelineationIndex: Page = ({
  meta,
  params,
  yearOptions,
  data,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation(["redelineation"]);

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={t("hero.header", { ns: "redelineation" })}
        description={t("hero.description", { ns: "redelineation" })}
        keywords=""
      />
      <MapProvider>
        <RedelineationDashboard
          params={{
            type: params.explorer?.[0] || "peninsular",
            year: params.explorer?.[1] || "2018",
            election_type: params.explorer?.[2] || "parlimen",
          }}
          yearOptions={yearOptions}
          data={data}
        />
      </MapProvider>
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

      const results = await Promise.allSettled([
        get(`/redelineation/${type}_${year}_${election_type}.json`),
        get(`/redelineation/filter.json`),
      ]);

      const [data, yearOptions] = results.map((e) => {
        if (e.status === "rejected") return null;
        else return e.value.data;
      });

      return {
        props: {
          meta: {
            id: "redelineation",
            type: "dashboard",
          },
          params,
          yearOptions,
          data,
        },
      };
    } catch (error) {
      return { notFound: true };
    }
  },
);

export default RedelineationIndex;
