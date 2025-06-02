import Metadata from "@components/Metadata";
import ElectionSeatsDashboard from "@dashboards/seats";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

/**
 * DUN Seat
 * @overview Status: Live
 */

const DUNSeat: Page = ({
  last_updated,
  params,
  selection,
  elections,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <>
      <Metadata keywords="dun" />
      <ElectionSeatsDashboard
        elections={elections}
        last_updated={last_updated}
        params={params}
        selection={selection}
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
        get("/seats/dropdown_new.json"),
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
            id: "dun-" + params.seat,
            type: "dashboard",
          },
          last_updated: "",
          params: { seat_name: slug, type: "dun" },
          selection,
          elections: seat.data,
        },
      };
    } catch (error: any) {
      console.error(error.message);
      return { notFound: true };
    }
  }
);

export default DUNSeat;
