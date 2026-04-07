import Metadata from "@components/Metadata";
import { Hero } from "@components/index";
import HomeDashboard from "@dashboards/home";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { useTranslation } from "@hooks/useTranslation";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/20/solid";

/**
 * Homepage
 * @overview Status: Live
 */

const HomePage: Page = ({
  selection,
  candidates,
  parties,
  elections,
  latest,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("home");

  return (
    <>
      <Metadata
        title={t("hero.header")}
        description={t("hero.description")}
        keywords=""
      />
      <Hero
        background="red"
        category={[t("hero.category"), "text-txt-danger"]}
        header={[t("hero.header")]}
        description={[t("hero.description")]}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/openapi"
              className="flex items-center gap-1.5 rounded-md bg-txt-black-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-txt-black-700"
            >
              {t("hero.api_docs")}
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/data-catalogue"
              className="flex items-center gap-1.5 rounded-md border border-otl-gray-300 bg-bg-white px-4 py-2 text-sm font-medium text-txt-black-900 transition hover:border-otl-gray-400 hover:bg-bg-black-50"
            >
              {t("hero.data_catalogue")}
            </Link>
          </div>
        }
      />
      <HomeDashboard
        selection={selection}
        candidates={candidates}
        parties={parties}
        elections={elections}
        latest={latest}
      />
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  ["home", "seats", "candidates", "parties"],
  async () => {
    try {
      const results = await Promise.allSettled([
        get("/seats/current/dropdown.json"),
        get("/candidates/dropdown.json"),
        get("/parties/dropdown.json"),
        get("/dates.json"),
        get("/latest.json"),
      ]);

      const [seats, candidates, parties, elections, latest] = results.map(
        (e) => (e.status === "fulfilled" ? e.value.data.data : []),
      );

      return {
        props: {
          meta: { id: "home", type: "misc" },
          selection: seats,
          candidates,
          parties,
          elections,
          latest,
        },
      };
    } catch (e) {
      return {
        props: {
          meta: { id: "home", type: "misc" },
          selection: [],
          candidates: [],
          parties: [],
          elections: [],
          latest: [],
        },
      };
    }
  },
);

export default HomePage;
