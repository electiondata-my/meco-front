import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { AxiosResponse } from "axios";
import { DCVariable, Page } from "@lib/types";
import { withi18n } from "@lib/decorators";
import { SHORT_LANG } from "@lib/constants";
import { get } from "@lib/api";
import data from "@lib/mock/dc.json";
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
      // const { data } = (await get(`/data-catalogue/${params?.id}`, {
      //   language: SHORT_LANG[locale as keyof typeof SHORT_LANG],
      // })) as AxiosResponse<DCVariable>;

      return {
        props: {
          meta: {
            id: data.id,
            type: "data-catalogue",
            category: null,
            agency: Array.isArray(data.data_source)
              ? data.data_source.join(",")
              : "",
          },
          params: { ...params },
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
