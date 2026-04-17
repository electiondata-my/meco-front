import Metadata from "@components/Metadata";
import { useTranslation } from "@hooks/useTranslation";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps } from "next";
import Link from "next/link";

const Error404: Page = () => {
  const { t } = useTranslation("error");

  return (
    <>
      <Metadata title={t("404.title")} keywords={""} />

      <div className="flex min-h-[76vh] flex-col items-center justify-center gap-6 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-24 w-24 text-txt-black-300"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          <path d="M11 8v3M11 14h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        </svg>

        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-txt-black-900">404</h1>
          <h2 className="text-xl font-semibold text-txt-black-900">{t("404.header")}</h2>
          <p className="max-w-sm text-txt-black-500">{t("404.description")}</p>
        </div>

        <Link
          href="/"
          className="rounded-md bg-gradient-to-t from-bg-danger-600 to-bg-danger-700 px-5 py-2.5 text-sm font-medium text-white shadow-button hover:to-bg-danger-600"
        >
          {t("404.cta")}
        </Link>
      </div>
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
