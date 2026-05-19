const I18NextHttpBackend = require("i18next-http-backend/cjs");

const namespaces = [
  "byelections",
  "candidates",
  "catalogue",
  "common",
  "console",
  "election",
  "elections",
  "error",
  "home",
  "parties",
  "party",
  "trivia",
  "redelineation",
  "research",
  "seats",
  "site-metrics",
];

/** @type {import('next-i18next').UserConfig} */
const defineConfig = (namespace, autoloadNs) => {
  return {
    i18n: {
      defaultLocale: "en-GB",
      locales: ["en-GB", "ms-MY"],
    },
    backend: {
      // Resolve at fetch time so NEXT_PUBLIC_I18N_URL from .env is always picked up.
      loadPath: (lng, ns) => {
        const locale = Array.isArray(lng) ? lng[0] : lng;
        const namespace = Array.isArray(ns) ? ns[0] : ns;
        const base = process.env.NEXT_PUBLIC_I18N_URL;
        if (!base) {
          throw new Error(
            "NEXT_PUBLIC_I18N_URL is not set. Add it to .env (see .env.example).",
          );
        }
        return `${base}/${locale}/${namespace}.json`;
      },
      crossDomain: true,
      allowMultiLoading: true,
    },
    use: typeof window === "undefined" ? [I18NextHttpBackend] : [],
    initImmediate: false,
    debug: false,
    ns: namespace,
    autoloadNs: autoloadNs,
    load: "currentOnly",
    preload: ["en-GB", "ms-MY"],
    serializeConfig: false,
    reloadOnPrerender: true,
  };
};

module.exports = defineConfig(namespaces, ["common"]);
