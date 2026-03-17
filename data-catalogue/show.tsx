// import CatalogueCode from "datagovmy-ui/charts/partials/code";
// import { SampleCode } from "datagovmy-ui/charts/partials/code";
import { useRouter } from "next/router";
import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
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
import { CatalogueProvider, DatasetType } from "@lib/contexts/catalogue";
import { useTranslation } from "@hooks/useTranslation";
import { useFilter } from "@hooks/useFilter";
import { AnalyticsProvider, Meta } from "@lib/contexts/analytics";
import DCDownload from "./download";

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
      <CatalogueProvider dataset={dataset}>
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
  const { i18n } = useTranslation(["catalogue", "common"]);
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
              data={data}
              selectedViz={selectedViz}
              setSelectedViz={setSelectedViz}
            />

            {/* Methodology */}
            <DCMethodology
              explanation={{
                notes: data.notes,
              }}
              scrollRef={scrollRef}
            />

            {/* Metadata */}
            <DCMetadata
              scrollRef={scrollRef}
              metadata={{
                description: data.description,
                notes: data.notes,
                fields: data.fields,
                last_updated: data.last_updated,
                next_update: data.next_update,
                link_csv: data.download?.csv?.link,
                link_parquet: data.download?.parquet?.link,
              }}
            />
            {/* Download */}
            <DCDownload scrollRef={scrollRef} download={data.download} />

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
  // ["programmatic_access", ["full_dataset"]],
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
    // programmatic_access: "Programmatic Access",
    // full_dataset: "Full dataset",
  },
  "ms-MY": {
    charts_table: "Jadual & Carta",
    metadata: "Metadata",
    notes: "Nota untuk Dataset ini",
    variables: "Pembolehubah",
    next_update: "Kemaskini seterusnya",
    license: "Lesen",
    download: "Muat Turun",
    // programmatic_access: "Akses Programatif",
    // full_dataset: "Dataset penuh",
  },
};

export default CatalogueShowWrapper;
