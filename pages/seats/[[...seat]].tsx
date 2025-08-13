import Metadata from "@components/Metadata";
import ElectionSeatsDashboard from "@dashboards/my-area/seats";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { useTranslation } from "@hooks/useTranslation";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { MapProvider } from "react-map-gl/mapbox";
import { useRouter } from "next/router";

/**
 * Seats Dashboard
 * @overview Status: Live
 */

const Home: Page = ({
  params,
  meta,
  selection,
  seat,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("seats");
  const router = useRouter();
  const currentSeat = selection.find(
    (seats: any) => seats.slug === params.seat_name,
  );
  const isRootSeatsPath = router.asPath === "/seats";  // Check if path is /seats (root)

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={isRootSeatsPath ? "" : currentSeat.seat_name}
        description={t("hero.description", { ns: "seats" })}
        image={
          isRootSeatsPath
            ? undefined // Sitewide OG for root /seats
            : `${process.env.NEXT_PUBLIC_API_URL_S3}/og-image/${params.seat_name}.png` // Custom OG
        }
        keywords={`Malaysia, election, seats, dashboard, results, ${currentSeat?.seat_name || ""}, ${params.seat_name}, parlimen, DUN`}
      />
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
          lineage={{ type: params.type, data: seat.lineage }}
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
