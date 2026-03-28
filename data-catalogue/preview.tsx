import { Dispatch, FunctionComponent, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { CatalogueProvider, DatasetType } from "@lib/contexts/catalogue";
import Card from "@components/Card";
import { DCDataViz } from "@lib/types";
import { clx, recurDataMapping } from "@lib/helpers";
import { MapIcon, TableCellsIcon } from "@heroicons/react/24/outline";

/**
 * Catalogue Preview
 * For showing dataset preview
 * @overview Status: In-Development
 */

const Table = dynamic(() => import("@charts/table"), { ssr: false });

interface CataloguePreviewProps {
  dataviz: undefined | DCDataViz;
  dataset: DatasetType;
  translations: Record<string, string>;
  selectedViz: DCDataViz;
  setSelectedViz: Dispatch<SetStateAction<DCDataViz>>;
  scrollToChart: () => void;
}

const CataloguePreview: FunctionComponent<CataloguePreviewProps> = ({
  dataviz,
  dataset,
  selectedViz,
  setSelectedViz,
  translations,
  scrollToChart,
}) => {
  if (!dataviz) {
    return null;
  }

  const router = useRouter();

  const renderChart = () => {
    switch (dataviz.chart_type) {
      case "MAPBOX":
        return <MapIcon className="size-24 stroke-[0.5px]" />;

      case "TABLE":
        return (
          <TableCellsIcon className="text-outlineHover-dark h-24 w-24 stroke-[0.5px]" />
        );

      default:
        return null;
    }
  };

  const extractChartDataset = (
    table_data: Record<string, any>[],
    currentViz: DCDataViz,
  ) => {
    const set = Object.entries({
      x: "date",
      y: "value",
    }).map(([key, value]) => recurDataMapping(key, value, table_data));
    return {
      ...Object.fromEntries(set.map((array) => [array[0][0], array[0][1]])),
    };
  };

  const _dataset = {
    type: dataviz.chart_type,
    chart: extractChartDataset(dataset.table, dataviz),
    table: dataset.table,
    meta: dataset.meta,
  };

  return (
    <CatalogueProvider dataset={_dataset}>
      <div className="flex w-[200px] max-w-[200px] flex-col justify-start gap-2 lg:w-[calc(100%_/_4.5)]">
        <Card
          key={`${dataviz.dataviz_id}`}
          className={clx(
            "hover:bg-background flex h-[110px] min-h-[110px] w-full max-w-[200px] items-center justify-center border-otl-gray-300 p-2 transition-colors hover:border-bg-black-400 lg:min-w-[calc(100%_/_5.5)]",
            selectedViz?.dataviz_id === dataviz.dataviz_id &&
              "border-otl-danger-300",
          )}
          onClick={() => {
            setSelectedViz(dataviz);
            router.replace(
              {
                query: { ...router.query, visual: dataviz.dataviz_id },
              },
              undefined,
              { shallow: true },
            );
            scrollToChart();
          }}
        >
          {renderChart()}
        </Card>
        <p className="text-center text-xs">{dataviz.title}</p>
      </div>
    </CatalogueProvider>
  );
};

export default CataloguePreview;
