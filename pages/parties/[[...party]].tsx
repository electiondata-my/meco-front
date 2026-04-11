import Metadata from "@components/Metadata";
import ElectionPartiesDashboard from "@dashboards/parties";
import { useTranslation } from "@hooks/useTranslation";
import { get } from "@lib/api";
import { CountryAndStates } from "@lib/constants";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";
import { SpinnerBox } from "@components/Spinner";

const ElectionParties: Page = ({
  meta,
  params,
  selection,
  elections,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("parties");
  const router = useRouter();

  if (router.isFallback) return <SpinnerBox className="min-h-screen" />;

  return (
    <>
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
    </>
  );
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = withi18n(
  ["election", "parties", "party"],
  async ({ params }) => {
    try {
      const [party = "001-UMNO", state_code = "mys"] =
        (params?.party as string[]) ?? [];
      const state = state_code ? CountryAndStates[state_code] : "Malaysia";

      const dropdown = await get("/parties/dropdown.json").catch((e) => {
        throw new Error("Failed to fetch dropdown. Message: " + e);
      });

      const selection: Array<{
        party_uid: string;
        party: string;
        party_name_en: string;
        party_name_bm: string;
        type: string;
      }> = dropdown.data.data;

      const partyExists = selection.some((e) => e.party_uid === party);
      const currentItem = selection.find((e) => e.party_uid === party);
      const typePrefix =
        currentItem?.type === "coalition" ? "coalitions" : "parties";

      const results = await Promise.allSettled([
        get(`/${typePrefix}/${party}/parlimen/${state ?? "Malaysia"}.json`),
        ...(!["mys", "kul", "pjy", "lbn"].includes(state_code)
          ? [get(`/${typePrefix}/${party}/dun/${state}.json`)]
          : []),
      ]).catch((e) => {
        throw new Error("Invalid party name. Message: " + e);
      });

      const [parlimen, dun] = results.map((e) => {
        if (e.status === "rejected") return { data: [] };
        else return e.value.data;
      });

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
