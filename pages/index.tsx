import Metadata from "@components/Metadata";
import ElectionSeatsDashboard from "@dashboards/seats";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps, InferGetStaticPropsType } from "next";

/**
 * Home
 * @overview Status: Live
 */

const Home: Page = ({
  params,
  selection,
  seat,
  boundaries,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <>
      <Metadata keywords="" />
      <ElectionSeatsDashboard
        elections={seat.data}
        params={params}
        selection={selection}
        desc_en={seat.desc_en}
        desc_ms={seat.desc_ms}
        voters_total={seat.voters_total}
        pyramid={seat.pyramid}
        barmeter={seat.barmeter}
        boundaries={boundaries}
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  ["home", "election"],
  async () => {
    try {
      const slug = "p138-kota-melaka-melaka";
      const type = "parlimen";
      const results = await Promise.allSettled([
        get("/seats/dropdown.json"),
        get(`/seats/${slug}.json`),
      ]).catch((e) => {
        throw new Error(e);
      });

      const [dropdown, seat] = results.map((e) => {
        if (e.status === "rejected") return null;
        else return e.value.data;
      });

      const boundaries = {
        bounds: [102.20593, 2.07252, 102.34511, 2.27764],
        center: [102.32552, 2.17508],
        polygons: {
          "2018": ["peninsular_2018_parlimen", ["P.138"]],
          "2003": ["peninsular_2003_parlimen", ["P.138"]],
          "1994": ["peninsular_1994_parlimen", ["P.123"]],
          "1984": ["peninsular_1984_parlimen", ["P.113"]],
          "1974": ["peninsular_1974_parlimen", ["P.098"]],
          "1959": ["peninsular_1959_parlimen", ["P.086"]],
          "1955": ["peninsular_1955_parlimen", ["P.005"]],
        },
      };

      return {
        notFound: false,
        props: {
          meta: {
            id: "home",
            type: "misc",
          },
          params: { seat_name: slug, type: type },
          selection: dropdown.data,
          seat: seat,
          boundaries,
        },
      };
    } catch (error: any) {
      console.error(error.message);
      return { notFound: true };
    }
  },
);

export default Home;
