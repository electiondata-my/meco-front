/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_APP_URL: string;
  readonly PUBLIC_APP_ENV: string;
  readonly PUBLIC_API_URL_TB: string;
  readonly PUBLIC_API_TOKEN_TB: string;
  readonly PUBLIC_API_URL_S3: string;
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
