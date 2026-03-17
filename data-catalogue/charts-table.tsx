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

  const renderChart = () => {
    switch (dataset.type) {
      case "MAPBOX":
        return config.mapbox_key ? (
          <DCMapbox mapboxKey={config.mapbox_key} />
        ) : // <DCMapbox mapboxKey={"peninsular_1955_parlimen"} />
        null;

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
          <div
            className={clx(
              dataset.type !== "TABLE" && "mx-auto max-h-[500px] overflow-auto",
              dataset.type === "TABLE" ? "block" : "hidden",
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
              dataset.type === "TABLE" ? "hidden" : "block",
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
              <div className="sticky left-0 top-0 flex h-full w-[200px] max-w-[200px] flex-1 flex-col justify-start gap-2 lg:sticky lg:w-[calc(100%_/_5.5)] lg:flex-initial">
                <Card
                  className={clx(
                    "hover:bg-background h-[110px] min-h-[110px] w-full max-w-[200px] border-otl-gray-300 p-2 transition-colors hover:border-otl-gray-200 lg:min-w-[calc(100%_/_5.5)]",
                    selectedViz.chart_type === "TABLE" &&
                      "border-otl-danger-300",
                  )}
                  onClick={() => {
                    setSelectedViz(
                      data.dataviz_set.find(
                        (item) => item.chart_type === "TABLE",
                      ) ?? data.dataviz_set[0],
                    );
                    router.replace(
                      {
                        query: { ...router.query, visual: "table" },
                      },
                      undefined,
                      { shallow: true },
                    );
                    scrollToChart();
                  }}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <TableCellsIcon className="text-outlineHover-dark h-24 w-24 stroke-[0.5px]" />
                  </div>
                </Card>
                <p className="h-full text-center text-xs">Table</p>
              </div>
              <div className="flex flex-1 gap-[0.5rem] overflow-x-auto pb-4">
                {data.dataviz_set
                  .filter((viz) => viz.chart_type !== "TABLE")
                  .map((viz) => {
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
            </div>
          </Section>
        )}
      </Section>
    </>
  );
};

export default DCChartsAndTable;
