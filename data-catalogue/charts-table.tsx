import {
  Dispatch,
  FunctionComponent,
  RefObject,
  SetStateAction,
  useContext,
} from "react";
import Dropdown from "@components/Dropdown";
import Search from "@components/Search";
import Section from "@components/Section";
import { interpolate, numFormat } from "@lib/helpers";
import { CatalogueContext } from "@lib/contexts/catalogue";
import { DCDataViz, DCVariable } from "@lib/types";
import dynamic from "next/dynamic";
import { UNIVERSAL_TABLE_SCHEMA } from "@lib/schema/data-catalogue";
import { AnalyticsContext } from "@lib/contexts/analytics";
import { useTranslation } from "@hooks/useTranslation";

const Table = dynamic(() => import("@charts/table"), { ssr: false });

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
}) => {
  const { t } = useTranslation(["catalogue", "common"]);
  const { dataset } = useContext(CatalogueContext);
  const { downloads, views } = useContext(AnalyticsContext);
  const { config } = selectedViz;

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
    // TODO: render map from mapbox
    return null;
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
          {dataset.type === "TABLE" ? (
            <Table
              className="table-stripe table-default table-sticky-header"
              data={dataset.table}
              freeze={config.freeze_columns}
              precision={config.precision}
              search={(onSearch) => (
                <Search
                  className="w-full border-b lg:w-auto"
                  onChange={(query) => onSearch(query ?? "")}
                />
              )}
              config={generateTableSchema()}
              enablePagination={15}
              data-testid="catalogue-table"
            />
          ) : (
            renderChart()
          )}
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
      </Section>
    </>
  );
};

export default DCChartsAndTable;
