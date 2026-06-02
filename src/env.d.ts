/// <reference types="astro/client" />

declare module "canvas2svg" {
  function canvas2svg(width: number, height: number): any;
  export default canvas2svg;
}

declare module "*.md" {
  const content: string;
  export default content;
}

declare module "chartjs-adapter-luxon";

interface TurnstileWidget {
  render(
    container: string | HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      size?: "normal" | "compact" | "invisible";
      execution?: "render" | "execute";
      [key: string]: unknown;
    },
  ): string;
  reset(widgetId: string): void;
  execute(widgetId: string): void;
}

interface Window {
  turnstile?: TurnstileWidget;
}

interface ImportMetaEnv {
  readonly PUBLIC_APP_URL: string;
  readonly PUBLIC_APP_ENV: string;
  readonly PUBLIC_API_URL_TB: string;
  readonly PUBLIC_API_TOKEN_TB: string;
  readonly PUBLIC_API_URL_R2: string;
  readonly PUBLIC_I18N_URL: string;
  readonly PUBLIC_TINYBIRD_TOKEN: string;
  readonly PUBLIC_TINYBIRD_TOKEN_READ: string;
  readonly PUBLIC_MAPBOX_ACCOUNT: string;
  readonly PUBLIC_MAPBOX_TOKEN: string;
  readonly PUBLIC_AUTH_URL: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY: string;
  readonly APP_URL: string;
  readonly APP_ENV: string;
  readonly AUTH_TOKEN: string;
  readonly PROTECT_DEPLOYMENT: string;
  readonly POST_TO_BUILD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
