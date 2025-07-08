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
  last_updated,
  params,
  selection,
  elections,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <>
      <Metadata keywords="" />
      <ElectionSeatsDashboard
        elections={elections}
        last_updated={last_updated}
        params={params}
        selection={selection}
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

      return {
        notFound: false,
        props: {
          last_updated: "",
          meta: {
            id: "home",
            type: "misc",
          },
          params: { seat_name: slug, type: type },
          selection: dropdown.data,
          elections: seat.data ?? [],
        },
      };
    } catch (error: any) {
      console.error(error.message);
      return { notFound: true };
    }
  },
);

export default Home;
