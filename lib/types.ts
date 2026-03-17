import type { Color } from "@hooks/useColor";
import type { ChartOptions, ChartTypeRegistry } from "chart.js";
import type { AnnotationPluginOptions } from "chartjs-plugin-annotation";
import type { NextPage } from "next";
import { UserConfig } from "next-i18next";
import type { AppProps } from "next/app";
import type { ReactElement, ReactNode } from "react";
import { Periods } from "@charts/timeseries";

export type AppPropsLayout = AppProps & {
  Component: Page;
};

export type Theme = "light" | "dark";

export type Page = NextPage & {
  layout?: (page: ReactNode, props: Record<string, any>) => ReactElement;
  theme?: Theme;
};

export type I18nConfig = UserConfig & { autoloadNs: string[] };

export type defineConfig = (
  namespace: string[],
  autoloadNs: string[],
) => I18nConfig;

// CHART INTERFACE
export type ChartCrosshairOption<T extends keyof ChartTypeRegistry> =
  ChartOptions<T> & {
    plugins: {
      crosshair?:
        | {
            line: {
              width?: number;
              color?: string;
              dashPattern?: [number, number];
            };
            zoom: {
              enabled: boolean;
            };
            sync: {
              enabled: boolean;
            };
          }
        | false;
      annotation?: AnnotationPluginOptions | false;
      datalabels?: any | false;
    };
  };

export type TimeseriesOption = {
  period: "auto" | "month" | "year";
  periodly: "daily_7d" | "daily" | "monthly" | "yearly";
};

export type DashboardPeriod = "daily_7d" | "daily" | "monthly" | "yearly";

export type OptionType = {
  label: string;
  value: string;
  contests?: number;
  wins?: number;
  losses?: number;
};

export type Geotype = "state" | "parlimen" | "dun" | "district";

/************************ DATA CATALOGUE ************************** */
export type DCChartKeys =
  | "TABLE"
  | "TIMESERIES"
  | "CHOROPLETH"
  | "GEOCHOROPLETH"
  | "GEOPOINT"
  | "GEOJSON"
  | "BAR"
  | "HBAR"
  | "LINE"
  | "PYRAMID"
  | "HEATTABLE"
  | "SCATTER"
  | "STACKED_AREA"
  | "STACKED_BAR"
  | "INTRADAY";
export type DCPeriod = "YEARLY" | "QUARTERLY" | "MONTHLY" | "WEEKLY" | "DAILY";

type BaseFilter = {
  name: string;
  selected: string;
  options: string[];
};
export type FilterDefault = BaseFilter & {
  interval: never;
};

export type FilterDate = BaseFilter & {
  interval: DCPeriod;
};

export type DCFilter = FilterDefault | FilterDate;

export type Precision = {
  default: number;
  columns?: Record<string, number>;
};

export type DCConfig = {
  context: {
    [key: string]: OptionType;
  };
  dates: FilterDate | null;
  options: FilterDefault[] | null;
  precision: number | Precision;
  freeze?: string[];
  color?: Color;
  geojson?: Geotype | null;
  line_variables?: Record<string, any>;
  exclude_openapi: boolean;
};

export type Catalogue = {
  id: string;
  title: string;
  description?: string;
  data_as_of?: string;
};

export type DCVariable = {
  id: string;
  title: string;
  description: string;
  notes: string;
  download: DCDownload;
  link_editions?: string[];
  fields: Array<DCField>;
  data_as_of: string;
  last_updated: string;
  next_update: string;
  methodology: string;
  caveat: string;
  publication?: string;
  translations: Record<string, string>;
  dataviz_set: Array<DCDataViz>;
  dropdown: Array<DCFilter>;
  data: Array<Record<string, unknown>>;
};

export type DCField = {
  name: string;
  title: string;
  description: string;
};

export type DCDataViz = {
  dataviz_id: string;
  chart_type: DCChartKeys;
  title: string;
  config: {
    mapbox_key?: string;
    format: Record<"x" | "y", string | Array<string>>;
    precision: number;
    filter_columns?: Array<string>;
    freeze_columns?: Array<string>;
    operation?: string;
    colors?: string;
    geojson?: string;
    slider?: {
      key: string;
      interval: Exclude<
        Periods,
        false | "millisecond" | "second" | "minute" | "week"
      >;
    };
  };
};

export type DCDownloadType =
  | "parquet"
  | "csv"
  | "geojson"
  | "topojson"
  | "geoparquet"
  | "flatgeobuf"
  | "kml";

export type DCDownload = Record<
  DCDownloadType,
  {
    link: string;
    n_objects: number;
    n_attributes: number;
    size_bytes: number;
    n_rows: number;
    n_cols: number;
  }
>;

export interface IDataViz {
  translation_key: string;
  chart_type: DCChartKeys;
  chart_filters: {
    SLICE_BY: Array<string>;
    precision: number;
  };
  chart_variables: {
    parents: Array<string>;
    operation: string;
    format: { x: string; y: Array<string> | string };
    config?: Record<string, unknown>;
  };
}

/*************************** MIXPANEL ***************************** */

export type EventType =
  | "image_download"
  | "file_download"
  | "page_view"
  | "change_language"
  | "select_dropdown"
  | "code_copy";

export type MixpanelBase = {
  project_id: string | number;
  event: EventType;
};

/**************************MISCELLANEOUS ******************************/
export type MetaPage = Record<string, any> & {
  meta: {
    id: string;
    type: "dashboard" | "data-catalogue" | "misc";
  };
};

export type WithData<T> = { data_as_of: string; data: T };
