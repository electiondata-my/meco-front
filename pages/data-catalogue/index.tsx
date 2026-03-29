import DataCatalogue from "@data-catalogue/index";
import Metadata from "@components/Metadata";
import { withi18n } from "@lib/decorators";
import { useTranslation } from "@hooks/useTranslation";
import { Page } from "@lib/types";
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
        title={t("hero.header")}
        description={t("hero.description")}
        keywords={""}
      />
      <WindowProvider>
        <DataCatalogue collection={collection} />
      </WindowProvider>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  ["catalogue"],
  async ({ locale }) => {
    const lang = SHORT_LANG[locale! as keyof typeof SHORT_LANG];
    try {
      const response = await get(`/catalogue/index-${lang}.json`);
      const collection = response.data || {};

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
