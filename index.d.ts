declare namespace NodeJS {
  export interface ProcessEnv {
    APP_URL: string;
    APP_ENV: string;
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_APP_ENV: string;
    NEXT_PUBLIC_API_URL_S3: string;
    NEXT_PUBLIC_I18N_URL: string;
    NEXT_PUBLIC_AUTHORIZATION_TOKEN: string;

    REVALIDATE_TOKEN: string;
    AUTH_TOKEN: string;
    ANALYZE: boolean;

    NEXT_PUBLIC_API_URL_TB: string;
    NEXT_PUBLIC_API_TOKEN_TB: string;
    NEXT_PUBLIC_TINYBIRD_TOKEN: string;
    NEXT_PUBLIC_TINYBIRD_TOKEN_READ: string;
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
