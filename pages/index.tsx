import Metadata from "@components/Metadata";
import { Hero } from "@components/index";
import HomeDashboard from "@dashboards/home";
import { get } from "@lib/api";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { useTranslation } from "@hooks/useTranslation";
import { GetStaticProps, InferGetStaticPropsType } from "next";

/**
 * Homepage
 * @overview Status: Live
 */

const HomePage: Page = ({
  selection,
  candidates,
  parties,
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
      />
      <HomeDashboard
        selection={selection}
        candidates={candidates}
        parties={parties}
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
      ]);

      const [seats, candidates, parties] = results.map((e) =>
        e.status === "fulfilled" ? e.value.data.data : [],
      );

      return {
        props: {
          meta: { id: "home", type: "misc" },
          selection: seats,
          candidates,
          parties,
        },
      };
    } catch (e) {
      return {
        props: {
          meta: { id: "home", type: "misc" },
          selection: [],
          candidates: [],
          parties: [],
        },
      };
    }
  },
);

export default HomePage;
