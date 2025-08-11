import Metadata from "@components/Metadata";
import ElectionSeatsDashboard from "@dashboards/my-area/seats";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { MapProvider } from "react-map-gl/mapbox";

/**
 * Seats Dashboard
 * @overview Status: Live
 */

const Home: Page = ({
  params,
  selection,
  seat,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <>
      <Metadata keywords="" />
      <MapProvider>
        <ElectionSeatsDashboard
          elections={seat.data}
          params={params}
          selection={selection}
          desc_en={seat.desc_en}
          desc_ms={seat.desc_ms}
          voters_total={seat.voters_total}
          pyramid={seat.pyramid}
          barmeter={seat.barmeter}
          boundaries={seat.boundaries}
          lineage={{ type: "parlimen", data: seat.lineage }}
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
  ["seats", "election"],
  async ({ params }) => {
    try {
      const [election_type, slug] = params?.seat
        ? (params.seat as string[])
        : ["parlimen", "p138-kota-melaka-melaka"];

      if (!slug || !election_type) return { notFound: true };

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

      return {
        notFound: false,
        props: {
          meta: {
            id: "seats",
            type: "dashboard",
          },
          params: { seat_name: slug, type: election_type },
          selection: dropdown.data,
          seat: seat,
        },
      };
    } catch (error: any) {
      console.error(error.message);
      return { notFound: true };
    }
  },
);

export default Home;
