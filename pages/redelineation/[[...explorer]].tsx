import Metadata from "@components/Metadata";
import RedelineationDashboard from "@dashboards/redelineation";
import { useTranslation } from "@hooks/useTranslation";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { seatSlug } from "@lib/helpers";
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
    <>
      <Metadata
        title={t("hero.header", { ns: "redelineation" })}
        description={t("hero.description", { ns: "redelineation" })}
        keywords=""
      />
      <MapProvider>
        <RedelineationDashboard
          params={params}
          yearOptions={yearOptions}
          data={data}
        />
      </MapProvider>
    </>
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
      const explorer = params?.explorer as string[] | undefined;

      let type: string, year: string, election_type: string;
      let toggle_state: string | null = null;
      let seat_slug: string | null = null;

      if (!explorer || explorer.length === 0) {
        type = "peninsular";
        year = "2018";
        election_type = "parlimen";
      } else if (explorer.length === 3) {
        [type, year, election_type] = explorer;
      } else if (explorer.length === 4) {
        // area/year/toggle/seat-slug — infer election_type from slug prefix
        [type, year, toggle_state, seat_slug] = explorer;
        election_type = seat_slug.startsWith("n") ? "dun" : "parlimen";
      } else {
        return { notFound: true };
      }

      if (!type || !year || !election_type) return { notFound: true };
      if (toggle_state && !["new", "old"].includes(toggle_state))
        return { notFound: true };

      const results = await Promise.allSettled([
        get(`/redelineation/${type}_${year}_${election_type}.json`),
        get(`/redelineation/filter.json`),
      ]);

      const [data, yearOptions] = results.map((e) => {
        if (e.status === "rejected") return null;
        else return e.value.data;
      });

      // Validate seat slug exists in data
      if (seat_slug && toggle_state) {
        const found = data[toggle_state]?.find(
          (d: any) => seatSlug(d[`seat_${toggle_state}`]) === seat_slug,
        );
        if (!found) return { notFound: true };
      }

      return {
        props: {
          meta: {
            id: "redelineation",
            type: "dashboard",
          },
          params: { type, year, election_type, toggle_state, seat_slug },
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
