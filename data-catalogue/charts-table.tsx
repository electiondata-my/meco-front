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
import { interpolate } from "@lib/helpers";
import { CatalogueContext } from "@lib/contexts/catalogue";
import { DCDataViz, DCVariable } from "@lib/types";
import dynamic from "next/dynamic";
import { UNIVERSAL_TABLE_SCHEMA } from "@lib/schema/data-catalogue";

const Table = dynamic(() => import("@charts/table"), { ssr: false });

type ChartTableProps = {
  scrollRef: RefObject<Record<string, HTMLElement | null>>;
  data: DCVariable;
  selectedViz: DCDataViz;
  setSelectedViz: Dispatch<SetStateAction<DCDataViz>>;
  filter: any;
  setFilter: (key: string, value: any) => void;
};

const DCChartsAndTable: FunctionComponent<ChartTableProps> = ({
  scrollRef,
  data,
  selectedViz,
  filter,
  setFilter,
}) => {
  const { dataset } = useContext(CatalogueContext);
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
        {data.dropdown.length > 0 && (
          <div className="flex gap-2 pb-3">
            {data.dropdown.map((item, index) => (
              <Dropdown
                key={item.name}
                width="w-full md:w-fit min-w-[120px]"
                anchor={index > 0 ? "right" : "left"}
                options={item.options.map((option) => ({
                  label: data.translations[option] ?? option,
                  value: option,
                }))}
                selected={filter[item.name]}
                onChange={(e) => setFilter(item.name, e)}
                enableSearch={item.options.length > 20}
              />
            ))}
          </div>
        )}

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
      </Section>
    </>
  );
};

export default DCChartsAndTable;
