import DataCatalogue from "@data-catalogue/index";
import Metadata from "@components/Metadata";
import { withi18n } from "@lib/decorators";
import { sortAlpha } from "@lib/helpers";
import { useTranslation } from "@hooks/useTranslation";
import { Catalogue, Page } from "@lib/types";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { WindowProvider } from "@lib/contexts/window";

const CatalogueIndex: Page = ({
  collection,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation(["catalogue", "common"]);

  return (
    <>
      <Metadata
        title={t("header")}
        description={t("description")}
        keywords={""}
      />
      <WindowProvider>
        <DataCatalogue collection={collection} />
      </WindowProvider>
    </>
  );
};

const recurSort = (
  data:
    | Record<string, Record<string, Catalogue[]>>
    | Record<string, Catalogue[]>
    | Catalogue[],
): any => {
  if (Array.isArray(data)) return sortAlpha(data, "title");

  return Object.fromEntries(
    Object.entries(data)
      .sort((a: [string, unknown], b: [string, unknown]) =>
        a[0].localeCompare(b[0]),
      )
      .map((item: [string, Record<string, Catalogue[]> | Catalogue[]]) => [
        item[0],
        recurSort(item[1]),
      ]),
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  ["catalogue"],
  async ({ locale, params }) => {
    const state = "mys";
    try {
      const _collection = {
        Demography: {
          Population: [
            {
              id: "population_malaysia",
              title: "Population Table: Malaysia",
              description:
                "Population at national level from 1970 to 2024, by sex, age group and ethnicity. The preview table shows data for the latest year only, but you may download the data in full.",
              data_as_of: "2023",
            },
            {
              id: "population_state",
              title: "Population Table: States",
              description:
                "Population at state level from 1970 to 2024, by sex, age group and ethnicity. The preview table shows data for the latest year only, but you may download the data in full.",
              data_as_of: "2023",
            },
            {
              id: "population_district",
              title: "Population Table: Administrative Districts",
              description:
                "Population at district level from 2020 to 2024, by sex, age group and ethnicity. The preview table shows data for the latest year only, but you may download the data in full.",
              data_as_of: "2023",
            },
            {
              id: "population_parlimen",
              title: "Population Table: Parliamentary Constituencies",
              description:
                "Population at parliamentary constituency level from 2020 to 2022, with breakdowns by sex and nationality. The preview table shows data for the latest year only, but you may download the data in full.",
              data_as_of: "2023",
            },
            {
              id: "population_dun",
              title: "Population Table: State Legislative Assemblies (DUNs)",
              description:
                "Population at state legislative assembly (DUN) level from 2020 to 2022, with breakdowns by sex and nationality. The preview table shows data for the latest year only, but you may download the data in full.",
              data_as_of: "2023",
            },
          ],
          Births: [
            {
              id: "births",
              title: "Daily Live Births",
              description:
                "Number of people born daily in Malaysia, based on registrations with JPN from 1920 to the present.",
              data_as_of: "2023",
            },
            {
              id: "births_annual",
              title: "Annual Live Births",
              description:
                "Annual number of births with signs of life upon delivery.",
              data_as_of: "2023",
            },
            {
              id: "births_annual_state",
              title: "Annual Live Births by State",
              description:
                "Annual number of births with signs of life upon delivery, by state.",
              data_as_of: "2023",
            },
            {
              id: "births_annual_sex_ethnic",
              title: "Annual Live Births by Sex & Ethnicity",
              description:
                "Annual number of births with signs of life upon delivery, with breakdowns by sex and ethnic group.",
              data_as_of: "2023",
            },
            {
              id: "births_annual_sex_ethnic_state",
              title: "Annual Live Births by State, Sex, & Ethnicity",
              description:
                "Annual number of births with signs of life upon delivery, with breakdowns by sex, ethnic group and state.",
              data_as_of: "2023",
            },
            {
              id: "births_district_sex",
              title: "Annual Live Births by District & Sex",
              description:
                "Annual number of births with signs of life upon delivery, by district and sex.",
              data_as_of: "2023",
            },
            {
              id: "stillbirths",
              title: "Annual Stillbirths",
              description:
                "Annual number of stillbirths recorded by the Ministry of Health.",
              data_as_of: "2023",
            },
            {
              id: "stillbirths_state",
              title: "Annual Stillbirths by State",
              description:
                "Annual number of stillbirths recorded by the Ministry of Health, by state.",
              data_as_of: "2023",
            },
          ],
          Fertility: [
            {
              id: "fertility",
              title: "TFR and ASFR",
              description:
                "Total fertility rate (TFR) and age-specific fertility rates (ASFR) from 1958 to the present at national level.",
              data_as_of: "2022-12-31 23:59",
            },
            {
              id: "fertility_state",
              title: "TFR and ASFR by State",
              description:
                "Total fertility rate (TFR) and age-specific fertility rates (ASFR) by state.",
              data_as_of: "2022-12-31 23:59",
            },
          ],
          Migration: [
            {
              id: "arrivals",
              title: "Monthly Arrivals by Nationality & Sex",
              description:
                "Monthly foreign arrivals in Malaysia by nationality and sex.",
              data_as_of: "2022-12-31 23:59",
            },
            {
              id: "arrivals_soe",
              title: "Monthly Arrivals by State of Entry, Nationality & Sex",
              description:
                "Monthly foreign arrivals in Malaysia by state of entry, nationality and sex. The table shows a preview of the full dataset using the latest month of data only.",
              data_as_of: "2022-12-31 23:59",
            },
            {
              id: "passports",
              title: "Monthly Passport Issuances by State and Branch",
              description:
                "Monthly issuances of Malaysian passports by state and office.",
              data_as_of: "2022-12-31 23:59",
            },
          ],
        },

        Education: {
          "Education Infrastructure": [
            {
              id: "schools_district",
              title: "Public Education Institutions by District",
              description:
                "Number of primary, secondary, and tertiary public education institutions at national, state, and district level.",
              data_as_of: "2022-12-31 23:59",
            },
          ],
        },
      };

      // const collection = recurSort(_collection);
      const collection = _collection;

      return {
        notFound: process.env.APP_ENV === "production" ? true : false,
        props: {
          meta: {
            id: "catalogue-index",
            type: "misc",
          },
          collection,
        },
      };
    } catch (error) {
      console.error(error);
      return { notFound: true };
    }
  },
);

export default CatalogueIndex;
