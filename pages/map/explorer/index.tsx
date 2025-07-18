/**
 * Full Screen Map
 * Map Explorer by Delimitation Years
 * @overview Status: Development
 */

import Metadata from "@components/Metadata";
import MapExplorerDelimitation from "@dashboards/map-explorer/delimitation-years";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { InferGetStaticPropsType, GetStaticProps } from "next";
import { MapProvider } from "react-map-gl/mapbox";

const DelimiationExplorer: Page = ({
  sidebar,
  dropdown_data,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <>
      <Metadata keywords="" />
      <MapProvider>
        <MapExplorerDelimitation
          sidebar={sidebar}
          dropdown_data={dropdown_data}
        />
      </MapProvider>
    </>
  );
};

DelimiationExplorer.layout = (page) => <>{page}</>;

export const getStaticProps: GetStaticProps = withi18n(
  ["home", "election"],
  async ({ locale }) => {
    try {
      const results = await Promise.allSettled([
        get("/map/map-layers.json"),
        get(`/map/dropdown_peninsular_2018_parlimen.json`),
      ]).catch((e) => {
        throw new Error(e);
      });

      const [mapLayers, dropdown] = results.map((e) => {
        if (e.status === "rejected") return null;
        else return e.value.data;
      });

      return {
        notFound: false,
        props: {
          meta: {
            id: "map",
            type: "dashboard",
          },
          sidebar: locale ? mapLayers[locale] : [],
          dropdown_data: dropdown.data,
        },
      };
    } catch (error: any) {
      console.error(error.message);
      return { notFound: true };
    }
  },
);

export default DelimiationExplorer;
