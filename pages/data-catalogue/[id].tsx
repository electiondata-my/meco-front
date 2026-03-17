import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { DCVariable, Page } from "@lib/types";
import { withi18n } from "@lib/decorators";
import { SHORT_LANG } from "@lib/constants";
import { get } from "@lib/api";
import DataCatalogueShow from "@data-catalogue/show";

const CatalogueShow: Page = ({
  meta,
  params,
  ...variable
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const data = variable as DCVariable;
  return <DataCatalogueShow params={params} data={data} meta={meta} />;
};

export const getStaticPaths: GetStaticPaths = () => ({
  paths: [],
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps = withi18n(
  "catalogue",
  async ({ locale, params }) => {
    try {
      const lang = SHORT_LANG[locale! as keyof typeof SHORT_LANG];

      const response = await get(`/catalogue/${params?.id}-${lang}.json`);

      const data = response.data || {};

      return {
        notFound: false,
        props: {
          meta: {
            id: params?.id,
            type: "data-catalogue",
          },
          params: { ...params },
          id: params?.id,
          translations: {},
          ...data,
        },
      };
    } catch (error) {
      console.error(error);
      return { notFound: true };
    }
  },
);

export default CatalogueShow;
