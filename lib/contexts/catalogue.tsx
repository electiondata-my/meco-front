import {
  Dispatch,
  ForwardRefExoticComponent,
  RefObject,
  ReactNode,
  SetStateAction,
  createContext,
  forwardRef,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChartTypeRegistry } from "chart.js";
import { ChartJSOrUndefined } from "react-chartjs-2/dist/types";
import { GeoChoroplethRef } from "@charts/geochoropleth";
import { DCChartKeys } from "@lib/types";
import { useTranslation } from "@hooks/useTranslation";
import { useExport } from "@hooks/useExport";

export type DatasetType = {
  type: DCChartKeys;
  chart: any;
  table: Record<string, any>[];
  meta: { title: string; desc: string; unique_id: string };
};

interface CatalogueContextProps {
  bind: {
    chartjs: Dispatch<
      SetStateAction<ChartJSOrUndefined<
        keyof ChartTypeRegistry,
        any[],
        unknown
      > | null>
    >;
    leaflet: RefObject<GeoChoroplethRef | null>;
  };
  dataset: DatasetType;
}

interface CatalogueProviderProps {
  dataset: DatasetType;
  children: ReactNode;
}

export const CatalogueContext = createContext<CatalogueContextProps>({
  bind: {
    chartjs: () => {},
    leaflet: { current: null },
  },
  dataset: {
    type: "TABLE",
    chart: undefined,
    table: [],
    meta: {
      title: "",
      desc: "",
      unique_id: "",
    },
  },
});

export const CatalogueProvider: ForwardRefExoticComponent<CatalogueProviderProps> =
  forwardRef(({ children, dataset }, ref) => {
    const { t } = useTranslation(["catalogue", "common"]);
    const [chartjs, setChartjs] = useState<ChartJSOrUndefined<
      keyof ChartTypeRegistry,
      any[],
      unknown
    > | null>(null);
    const leaflet = useRef<GeoChoroplethRef | null>(null);
    const _dataset = useMemo(() => {
      if (["TIMESERIES", "STACKED_AREA", "INTRADAY"].includes(dataset.type)) {
        const { x, ...y } = dataset.chart as Record<
          string,
          (number | null)[]
        > & { x: string[] };

        let x_vals = x;
        // trim null values off start and end
        const trimmed_y = Object.fromEntries(
          Object.entries(y).map(([key, y_values], index, ori_arr) => {
            let y_vals = y_values;

            // loop from start
            for (let i = 0; i < y_values.length; i++) {
              // check if y-value for each dataset is not null (y[i], y1[i], ...)
              if (ori_arr.some(([_, y_vals]) => y_vals[i] !== null)) {
                // slice previous null values and break loop
                y_vals = y_vals.slice(i);
                // only slice x-values for first dataset
                if (index === 0) x_vals = x_vals.slice(i);
                break;
              }
            }

            // loop from end
            for (let i = y_values.length - 1; i >= 0; i--) {
              // check if y-value for each dataset is not null (y[i], y1[i], ...)
              if (ori_arr.some(([_, y_vals]) => y_vals[i] !== null)) {
                // slice null values and break loop
                y_vals = y_vals.slice(0, i + 1);
                // only slice x-values for first dataset
                if (index === 0) x_vals = x_vals.slice(0, i + 1);
                break;
              }
            }

            return [key, y_vals];
          }),
        );

        return { ...dataset, chart: { x: x_vals, ...trimmed_y } };
      }
      return dataset;
    }, [dataset]);

    return (
      <CatalogueContext.Provider
        value={{
          bind: {
            chartjs: setChartjs,
            leaflet: leaflet,
          },
          dataset: _dataset,
        }}
      >
        {children}
      </CatalogueContext.Provider>
    );
  });

CatalogueProvider.displayName = "CatalogueProvider";
