import Container from "@components/Container";
import ErrorStatus from "@components/ErrorStatus";
import Metadata from "@components/Metadata";
import { withi18n } from "@lib/decorators";
import { useTranslation } from "@hooks/useTranslation";
import { Page } from "@lib/types";
import { GetStaticProps } from "next";
import SectionGrid from "@components/Section/section-grid";

const Error404: Page = () => {
  const { t } = useTranslation("error");
  return (
    <>
      <Metadata title={t("404.title") as string} keywords={""} />

      <Container className="min-h-[76vh] pt-7 text-txt-black-900">
        <SectionGrid className="items-start justify-start">
          <ErrorStatus
            title={t("404.title") as string}
            description={t("404.description")}
            code={404}
            reason={t("404.reason")}
          />
        </SectionGrid>
      </Container>
    </>
  );
};

export default Error404;

export const getStaticProps: GetStaticProps = withi18n("error", async () => {
  return {
    props: {
      meta: {
        id: "error-400",
        type: "misc",
      },
    },
  };
});
