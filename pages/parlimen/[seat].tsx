import Metadata from "@components/Metadata";
import ElectionSeatsDashboard from "@dashboards/my-area/seats";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

/**
 * Parlimen Seat
 * @overview Status: Live
 */

const ParlimenSeat: Page = ({
  params,
  selection,
  seat,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const currentSeat = selection.find(
    (seats: any) => seats.slug === params.seat_name,
  );
  return (
    <>
      <Metadata
        keywords="parlimen"
        image={`${process.env.NEXT_PUBLIC_API_URL_S3}/og-image/${params.seat_name}.png`}
        title={currentSeat.seat_name}
      />
      <ElectionSeatsDashboard
        key={`${params.type}-${params.seat_name}`}
        boundaries={seat.boundaries}
        elections={seat.data}
        params={params}
        selection={selection}
        desc_en={seat.desc_en}
        desc_ms={seat.desc_ms}
        voters_total={seat.voters_total}
        pyramid={seat.pyramid}
        barmeter={seat.barmeter}
        lineage={{ type: "parlimen", data: seat.lineage }}
      />
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
  ["home", "election"],
  async ({ params }) => {
    if (!params || !params.seat) return { notFound: true };

    try {
      const slug = params.seat.toString();

      const results = await Promise.allSettled([
        get("/seats/dropdown.json"),
        get(`/seats/${slug}.json`),
      ]);

      const [dropdown, seat] = results.map((e) => {
        if (e.status === "rejected") return null;
        else return e.value.data;
      });

      const selection: Array<{ slug: string }> = dropdown.data;
      const slugExists = selection.some((e) => e.slug === slug);

      if (slug && !slugExists) return { notFound: true };

      return {
        props: {
          meta: {
            id: "parlimen-" + params.seat,
            type: "dashboard",
          },
          params: { seat_name: slug, type: "parlimen" },
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

export default ParlimenSeat;
