// import CatalogueCode from "datagovmy-ui/charts/partials/code";
// import { SampleCode } from "datagovmy-ui/charts/partials/code";
import { useRouter } from "next/router";
import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DCMethodology from "./methodology";
import DCMetadata from "./metadata";
import DCChartsAndTable from "./charts-table";
import { DCDataViz, DCVariable } from "@lib/types";
import Metadata from "@components/Metadata";
import Container from "@components/Container";
import Sidebar from "@components/Sidebar";
import Section from "@components/Section";
import SectionGrid from "@components/Section/section-grid";
import At from "@components/At";
import {
  CatalogueProvider,
  DatasetType,
  CatalogueContext,
} from "@lib/contexts/catalogue";
import { useTranslation } from "@hooks/useTranslation";
import { useFilter } from "@hooks/useFilter";
import { useAnalytics } from "@hooks/useAnalytics";
import { AnalyticsProvider, Meta } from "@lib/contexts/analytics";
import { DownloadCard } from "./card";

/**
 * Catalogue Show
 * @overview Status: Live
 */

type CatalogueShowWrapperProps = {
  meta: Meta;
  params: {
    id: string;
  };
  data: DCVariable;
};

const CatalogueShowWrapper: FunctionComponent<CatalogueShowWrapperProps> = ({
  params,
  data,
  meta,
}) => {
  const router = useRouter();
  const [selectedViz, setSelectedViz] = useState<DCDataViz>(
    data.dataviz_set.find((item) => item.chart_type === "TABLE") ??
      data.dataviz_set[0],
  );

  // Sync selectedViz from ?visual= query param after hydration (SSG)
  useEffect(() => {
    if (!router.isReady || !router.query.visual) return;
    const viz = data.dataviz_set.find(
      (item) => item.dataviz_id === router.query.visual,
    );
    if (viz) setSelectedViz(viz);
  }, [router.isReady]);

  const dataset: DatasetType = useMemo(() => {
    return {
      type: selectedViz.chart_type,
      chart: {},
      table: data.data,
      meta: {
        unique_id: data.id,
        title: data.title,
        desc: data.description,
      },
    };
  }, [selectedViz]);

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={
          selectedViz.chart_type !== "TABLE"
            ? selectedViz.title
            : dataset.meta.title
        }
        description={dataset.meta.desc.replace(/^(.*?)]/, "")}
        keywords={""}
      />
      <CatalogueProvider
        dataset={dataset}
        urls={{
          csv: data.link_csv,
          parquet: data.link_parquet,
        }}
      >
        <CatalogueShow
          key={router.asPath}
          params={params}
          data={data}
          selectedViz={selectedViz}
          setSelectedViz={setSelectedViz}
        />
      </CatalogueProvider>
    </AnalyticsProvider>
  );
};

export interface CatalogueShowProps {
  params: {
    id: string;
  };
  data: DCVariable;
  selectedViz: DCDataViz;
  setSelectedViz: Dispatch<SetStateAction<DCDataViz>>;
}

const CatalogueShow: FunctionComponent<CatalogueShowProps> = ({
  params,
  data,
  selectedViz,
  setSelectedViz,
}) => {
  const { t, i18n } = useTranslation(["catalogue", "common"]);
  const { config, ...viz } = selectedViz;
  const scrollRef = useRef<Record<string, HTMLElement | null>>({});
  const { filter, setFilter } = useFilter(
    Object.fromEntries([
      ...data.dropdown.map((item) => [
        item.name,
        {
          value: item.selected,
          label: data.translations[item.selected] ?? item.selected,
        },
      ]),
      [
        "visual",
        { value: selectedViz.dataviz_id, label: selectedViz.dataviz_id },
      ],
    ]),
    { id: params.id },
    true,
  );
  const { downloads, dataset } = useContext(CatalogueContext);
  const { result } = useAnalytics(dataset);

  const [selectedEdition, setSelectedEdition] = useState<string>(
    data.link_editions && data.link_editions.length > 0
      ? data.link_editions[0]
      : "",
  );

  const getURL = (url: string, edition: string) =>
    edition ? url.replace("YYYY-MM-DD", edition) : url;

  const [urls, setURLs] = useState(
    data.link_editions && data.link_editions.length > 0
      ? {
          csv: getURL(data.link_csv, selectedEdition),
          parquet: getURL(data.link_parquet, selectedEdition),
        }
      : { csv: data.link_csv, parquet: data.link_parquet },
  );

  return (
    <Container className="min-h-screen">
      <SectionGrid className="items-start">
        <Sidebar
          categories={SIDEBAR_CATEGORIES}
          labels={SIDEBAR_LABELS[i18n.language]}
          onSelect={(selected) => {
            scrollRef.current[selected]?.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "end",
            });
          }}
          mobileClassName="top-4"
          initialSelected="charts_table"
          sidebarTitle={
            i18n.language === "en-GB" ? "On this page" : "Kandungan"
          }
        >
          <div className="mx-auto flex-1 p-2 py-6 pt-16 md:max-w-screen-md lg:max-w-screen-lg lg:p-8 lg:pb-6">
            {/* Chart & Table */}
            <DCChartsAndTable
              scrollRef={scrollRef}
              data={{
                ...data,
                link_csv: urls.csv,
                link_parquet: urls.parquet,
              }}
              selectedViz={selectedViz}
              setSelectedViz={setSelectedViz}
              filter={filter}
              setFilter={setFilter}
            />

            {/* Methodology */}
            <DCMethodology
              explanation={{
                methodology: data.methodology,
              }}
              scrollRef={scrollRef}
            />

            {/* Metadata */}
            <DCMetadata
              scrollRef={scrollRef}
              metadata={{
                description: data.description,
                fields: data.fields,
                last_updated: data.last_updated,
                next_update: data.next_update,
                data_source: data.data_source.map((source) =>
                  t(`agencies:${source.toLowerCase()}.full`, {
                    defaultValue: source,
                  }),
                ),
                link_csv: urls.csv,
                link_parquet: urls.parquet,
                link_editions: data.link_editions,
              }}
              selectedEdition={selectedEdition}
              setSelectedEdition={(edition) => {
                setSelectedEdition(edition);
                setURLs({
                  csv: getURL(data.link_csv, edition),
                  parquet: getURL(data.link_parquet, edition),
                });
              }}
            />
            {/* Download */}
            <Section
              title={t("download")}
              ref={(ref) => {
                scrollRef.current["download"] = ref;
              }}
              className="mx-auto max-lg:py-8 lg:pb-16"
            >
              <div className="space-y-5">
                {downloads?.chart.length > 0 && (
                  <>
                    <h5>{t("chart")}</h5>
                    <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
                      {downloads?.chart.map((props) => (
                        <DownloadCard
                          key={`${dataset.meta.unique_id}_${props.id}`}
                          views={
                            result
                              ? result[`download_${props.id as "png" | "svg"}`]
                              : undefined
                          }
                          link_editions={data.link_editions}
                          url={props.id === "csv" ? urls.csv : urls.parquet}
                          {...props}
                        />
                      ))}
                    </div>
                  </>
                )}
                {downloads?.data.length > 0 && (
                  <>
                    <h5>Data</h5>
                    <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
                      {downloads?.data.map((props) => (
                        <DownloadCard
                          key={`${dataset.meta.unique_id}_${props.id}`}
                          views={
                            result
                              ? result[
                                  `download_${props.id as "csv" | "parquet"}`
                                ]
                              : undefined
                          }
                          link_editions={data.link_editions}
                          url={props.id === "csv" ? urls.csv : urls.parquet}
                          {...props}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Section>

            {/* Dataset Source Code */}
            {/* <Section
              title={t("code")}
              ref={(ref) => {
                scrollRef.current["programmatic_access: full_dataset"] = ref;
              }}
              description={t("code_desc")}
              className="mx-auto w-full py-12"
            >
              <CatalogueCode
                type={dataset.type}
                url={
                  urls.parquet ||
                  urls[Object.keys(urls)[0] as "csv" | "parquet"]
                }
              />
            </Section> */}
          </div>
        </Sidebar>
      </SectionGrid>
    </Container>
  );
};

const SIDEBAR_CATEGORIES: Array<[key: string, subcategories: string[]]> = [
  ["charts_table", []],
  ["metadata", ["notes", "variables", "next_update", "license"]],
  ["download", []],
  ["programmatic_access", ["full_dataset"]],
];

const SIDEBAR_LABELS: Record<string, Record<string, string>> = {
  "en-GB": {
    charts_table: "Table & Charts",
    metadata: "Metadata",
    notes: "Notes on this Dataset",
    variables: "Variables",
    next_update: "Next update",
    license: "License",
    download: "Download",
    programmatic_access: "Programmatic Access",
    full_dataset: "Full dataset",
  },
  "ms-MY": {
    charts_table: "Jadual & Carta",
    metadata: "Metadata",
    notes: "Nota untuk Dataset ini",
    variables: "Pembolehubah",
    next_update: "Kemaskini seterusnya",
    license: "Lesen",
    download: "Muat Turun",
    programmatic_access: "Akses Programatif",
    full_dataset: "Dataset penuh",
  },
};

export default CatalogueShowWrapper;
