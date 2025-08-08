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
  bar,
  dropdown,
  params,
  yearOptions,
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
          bar_data={bar}
          dropdown_data={dropdown}
          params={{
            type: params.explorer?.[0] || "peninsular",
            year: params.explorer?.[1] || "2018",
            election_type: params.explorer?.[2] || "parlimen",
          }}
          yearOptions={yearOptions}
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
        get(`/map/dropdown_${type}_${year}_${election_type}.json`),
        get(`/redelineation/filter.json`),
      ]);

      const [dropdown, yearOptions] = results.map((e) => {
        if (e.status === "rejected") return null;
        else return e.value.data;
      });

      const bar_peninsular = {
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

      const bar_sabah = {
        state: ["Sabah"],
        unchanged: [10],
        bigger: [1],
        smaller: [5],
        new: [1],
      };

      const bar_sarawak = {
        state: ["Sarawak"],
        unchanged: [1],
        bigger: [3],
        smaller: [5],
        new: [3],
      };
      return {
        props: {
          meta: {
            id: "redelineation",
            type: "dashboard",
          },
          params,
          bar:
            type === "peninsular"
              ? bar_peninsular
              : type === "sabah"
                ? bar_sabah
                : bar_sarawak,
          dropdown: dropdown.data,
          yearOptions,
        },
      };
    } catch (error) {
      return { notFound: true };
    }
  },
);

export default RedelineationIndex;
