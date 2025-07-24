import DataCatalogue from "@data-catalogue/index";
import Metadata from "@components/Metadata";
import { withi18n } from "@lib/decorators";
import { sortAlpha } from "@lib/helpers";
import { useTranslation } from "@hooks/useTranslation";
import { Catalogue, Page } from "@lib/types";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { WindowProvider } from "@lib/contexts/window";
import { SHORT_LANG } from "@lib/constants";
import { get } from "@lib/api";

const CatalogueIndex: Page = ({
  collection,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation(["catalogue", "common"]);

  return (
    <>
      <Metadata
        title={t("header")}
        description={t("description")}
        keywords={""}
      />
      <WindowProvider>
        <DataCatalogue collection={collection} />
      </WindowProvider>
    </>
  );
};

const recurSort = (
  data:
    | Record<string, Record<string, Catalogue[]>>
    | Record<string, Catalogue[]>
    | Catalogue[],
): any => {
  if (Array.isArray(data)) return sortAlpha(data, "title");

  return Object.fromEntries(
    Object.entries(data)
      .sort((a: [string, unknown], b: [string, unknown]) =>
        a[0].localeCompare(b[0]),
      )
      .map((item: [string, Record<string, Catalogue[]> | Catalogue[]]) => [
        item[0],
        recurSort(item[1]),
      ]),
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  ["catalogue"],
  async ({ locale, params }) => {
    const state = "mys";
    const lang = SHORT_LANG[locale! as keyof typeof SHORT_LANG];
    try {
      const response = await get(`/catalogue/index-${state}-${lang}.json`);
      const collection = response.data || {};

      // const collection = recurSort(_collection);

      return {
        notFound: false,
        props: {
          meta: {
            id: "catalogue-index",
            type: "misc",
          },
          collection: collection.data,
        },
      };
    } catch (error) {
      console.error(error);
      return { notFound: true };
    }
  },
);

export default CatalogueIndex;
