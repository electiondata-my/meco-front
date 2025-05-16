import Container from "@components/Container";
import ErrorStatus from "@components/ErrorStatus";
import Metadata from "@components/Metadata";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps } from "next";
import { useTranslation } from "next-i18next";

const Error500: Page = () => {
  const { t } = useTranslation("error");
  return (
    <>
      <Metadata title={t("500.title")} keywords={""} />
      <Container className="min-h-[76vh] pt-7 text-zinc-900">
        <ErrorStatus
          title={t("500.title")}
          description={t("500.description")}
          code={500}
          reason={t("500.reason")}
        />
      </Container>
    </>
  );
};

export default Error500;

export const getStaticProps: GetStaticProps = withi18n("error", async () => {
  return {
    props: {
      meta: {
        id: "error-500",
        type: "misc",
      },
    },
  };
});
