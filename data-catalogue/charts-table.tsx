import {
  Dispatch,
  FunctionComponent,
  RefObject,
  SetStateAction,
  useContext,
} from "react";
import Search from "@components/Search";
import Section from "@components/Section";
import { clx, interpolate, numFormat } from "@lib/helpers";
import { CatalogueContext } from "@lib/contexts/catalogue";
import { DCDataViz, DCVariable } from "@lib/types";
import dynamic from "next/dynamic";
import { UNIVERSAL_TABLE_SCHEMA } from "@lib/schema/data-catalogue";
import { AnalyticsContext } from "@lib/contexts/analytics";
import { useTranslation } from "@hooks/useTranslation";
import Card from "@components/Card";
import { TableCellsIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import CataloguePreview from "./preview";

const Table = dynamic(() => import("@charts/table"), { ssr: false });
const DCMapbox = dynamic(() => import("./mapbox"), { ssr: false });

type ChartTableProps = {
  scrollRef: RefObject<Record<string, HTMLElement | null>>;
  data: DCVariable;
  selectedViz: DCDataViz;
  setSelectedViz: Dispatch<SetStateAction<DCDataViz>>;
};

const DCChartsAndTable: FunctionComponent<ChartTableProps> = ({
  scrollRef,
  data,
  selectedViz,
  setSelectedViz,
}) => {
  const { t } = useTranslation(["catalogue", "common"]);
  const { dataset } = useContext(CatalogueContext);
  const { downloads, views } = useContext(AnalyticsContext);
  const { config } = selectedViz;
  const router = useRouter();

  const generateTableSchema = () => {
    const columns = Array.isArray(dataset.table)
      ? Object.keys(dataset.table[0])
      : [];
    return UNIVERSAL_TABLE_SCHEMA(
      columns,
      data.translations,
      config.freeze_columns,
      (item, key) => item[key],
    );
  };

  const MAPBOX_REGION_CENTER: Record<
    string,
    { mobile: [number, number]; desktop: [number, number]; zoom: number }
  > = {
    peninsular: { mobile: [102.5, 3.8], desktop: [109.5, 4.0], zoom: 5 },
    sabah: { mobile: [117.0, 5.5], desktop: [117.0, 5.5], zoom: 5.5 },
    sarawak: { mobile: [113.5, 2.5], desktop: [113.5, 2.5], zoom: 5 },
  };

  const renderChart = () => {
    switch (dataset.type) {
      case "MAPBOX": {
        if (!config.mapbox_key) return null;
        const region = config.mapbox_key.split("_")[0];
        const { mobile, desktop, zoom } =
          MAPBOX_REGION_CENTER[region] ?? MAPBOX_REGION_CENTER.peninsular;
        return (
          <>
            <div className="block lg:hidden">
              <DCMapbox
                mapboxKey={config.mapbox_key}
                center={mobile}
                zoom={zoom}
              />
            </div>
            <div className="hidden lg:block">
              <DCMapbox
                mapboxKey={config.mapbox_key}
                center={desktop}
                zoom={zoom}
              />
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  const scrollToChart = () => {
    const scrollOptions: ScrollIntoViewOptions = {
      behavior: "smooth",
      block: "start",
    };
    scrollRef.current["charts_table"]?.scrollIntoView(scrollOptions);
  };

  return (
    <>
      <Section
        ref={(ref) => {
          scrollRef.current["charts_table"] = ref;
        }}
        title={<h4 data-testid="catalogue-title">{dataset.meta.title}</h4>}
        description={
          <p
            className="whitespace-pre-line text-base text-txt-black-500"
            data-testid="catalogue-description"
          >
            {interpolate(
              dataset.meta.desc.substring(dataset.meta.desc.indexOf("]") + 1),
            )}
          </p>
        }
        className="max-lg:py-8 lg:pb-16"
        date={data.data_as_of}
      >
        <div className="min-h-[350px] lg:min-h-[450px]">
          {!router.isReady && (
            <div className="flex h-[350px] w-full animate-pulse items-center justify-center rounded-md bg-bg-washed lg:h-[450px]" />
          )}
          <div
            className={clx(
              dataset.type !== "TABLE" && "mx-auto max-h-[500px] overflow-auto",
              dataset.type === "TABLE" ? "block" : "hidden",
              !router.isReady && "hidden",
            )}
          >
            <Table
              className={clx("table-stripe table-default table-sticky-header")}
              responsive={dataset.type === "TABLE"}
              data={dataset.table}
              freeze={config.freeze_columns}
              precision={config.precision}
              search={
                dataset.type === "TABLE"
                  ? (onSearch) => (
                      <Search
                        className="w-full border-b lg:w-auto"
                        onChange={(query) => onSearch(query ?? "")}
                      />
                    )
                  : undefined
              }
              config={generateTableSchema()}
              enablePagination={
                ["TABLE", "GEOPOINT"].includes(dataset.type) ? 15 : false
              }
              data-testid="catalogue-table"
            />
          </div>
          <div
            className={clx(
              "space-y-2",
              dataset.type === "TABLE" || !router.isReady ? "hidden" : "block",
            )}
          >
            {renderChart()}
          </div>
        </div>

        {/* Views / download count*/}
        <p className="flex justify-end gap-2 py-6 text-body-sm text-txt-black-500">
          <span>
            {`${numFormat(views ?? 0, "compact")} ${t("common:views_other", {
              count: views ?? 0,
            })}`}
          </span>
          <span>&middot;</span>
          <span>
            {`${numFormat(
              Object.values(downloads ?? {}).reduce((a, b) => a + b, 0),
              "compact",
            )} ${t("common:downloads_other", {
              count: Object.values(downloads ?? {}).reduce((a, b) => a + b, 0),
            })}`}
          </span>
        </p>

        {data.dataviz_set && data.dataviz_set.length > 1 && (
          <Section>
            <div className="hide-scrollbar relative flex h-full w-full items-stretch gap-[0.5rem] overflow-x-scroll">
              {data.dataviz_set.map((viz) => {
                return (
                  <CataloguePreview
                    key={viz.dataviz_id}
                    dataviz={viz}
                    dataset={dataset}
                    translations={data.translations}
                    selectedViz={selectedViz}
                    setSelectedViz={setSelectedViz}
                    scrollToChart={scrollToChart}
                  />
                );
              })}
            </div>
          </Section>
        )}
      </Section>
    </>
  );
};

export default DCChartsAndTable;
