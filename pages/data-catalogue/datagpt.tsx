import Metadata from "@components/Metadata";
import Progress from "@components/Progress";
import CatalogueDataGPT from "@data-catalogue/datagpt";
import { useTranslation } from "@hooks/useTranslation";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps } from "next";

const AIChat: Page = () => {
  const { t } = useTranslation(["catalogue-datagpt", "common"]);

  return (
    <>
      <Metadata
        title={"DataGPT"}
        description={t("description")}
        keywords={""}
      />
      <Progress />
      <CatalogueDataGPT />
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  "catalogue-datagpt",
  async () => {
    return {
      props: {
        meta: {
          id: "catalogue-datagpt",
          type: "misc",
        },
      },
    };
  }
);

export default AIChat;
