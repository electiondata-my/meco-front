import Metadata from "@components/Metadata";
import ElectionPartiesDashboard from "@dashboards/parties";
import { useTranslation } from "@hooks/useTranslation";
import { get } from "@lib/api";
import { CountryAndStates } from "@lib/constants";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

const ElectionParties: Page = ({
  meta,
  params,
  selection,
  elections,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("parties");

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={t("hero.header", { ns: "parties" })}
        description={t("hero.description", { ns: "parties" })}
        keywords=""
      />
      <ElectionPartiesDashboard
        elections={elections}
        params={params}
        selection={selection}
      />
    </AnalyticsProvider>
  );
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = withi18n(
  ["election", "parties", "party"],
  async ({ params }) => {
    try {
      const [party = "PERIKATAN", state_code = "mys"] =
        (params?.party as string[]) ?? [];
      const state = state_code ? CountryAndStates[state_code] : "Malaysia";

      const results = await Promise.allSettled([
        get("/parties/dropdown.json"),
        get(
          `/parties/${party ?? "PERIKATAN"}/parlimen/${state ?? "Malaysia"}.json`,
        ),
        ...(!["mys", "kul", "pjy", "lbn"].includes(state_code)
          ? [get(`/parties/${party ?? "PERIKATAN"}/dun/${state}.json`)]
          : []),
      ]).catch((e) => {
        throw new Error("Invalid party name. Message: " + e);
      });

      const [dropdown, parlimen, dun] = results.map((e) => {
        if (e.status === "rejected") return { data: [] };
        else return e.value.data;
      });
      const selection: Array<{ party: string }> = dropdown.data;
      const partyExists = selection.some((e) => e.party === party);

      if (party && !partyExists) return { notFound: true };

      return {
        props: {
          meta: {
            id: "parties",
            type: "dashboard",
          },
          params: {
            party,
            state: state_code,
          },
          selection,
          elections: {
            parlimen: parlimen.data ?? [],
            dun: !["mys", "kul", "pjy", "lbn"].includes(state_code)
              ? dun.data
              : [],
          },
        },
      };
    } catch (e: any) {
      console.error(e.message);
      return { notFound: true };
    }
  },
);

export default ElectionParties;
