declare namespace NodeJS {
  export interface ProcessEnv {
    APP_URL: string;
    APP_ENV: string;
    PUBLIC_APP_URL: string;
    PUBLIC_APP_ENV: string;
    PUBLIC_API_URL_S3: string;
    PUBLIC_I18N_URL: string;
    PUBLIC_MAPBOX_ACCOUNT: string;
    PUBLIC_MAPBOX_TOKEN: string;
    REVALIDATE_TOKEN: string;
    AUTH_TOKEN: string;
    ANALYZE: boolean;
    PROTECT_DEPLOYMENT: boolean;

    PUBLIC_API_URL_TB: string;
    PUBLIC_TINYBIRD_TOKEN: string;
  }
}

declare module "chartjs-plugin-crosshair" {
  export const CrosshairPlugin: any;
  export const Interpolate: any;

  export interface InteractionModeMap {
    interpolate: Function;
  }
}

// canvas2svg mock typings
declare module "canvas2svg" {
  export default (width: number, height: number) => any;
  getSerializedSvg();
}

declare module "geojson-bbox" {
  export default function (
    geojson: GeoJSONObject,
  ): [number, number, number, number] {}
}

declare module "*.md" {
  const content: string;
  export default content;
}
