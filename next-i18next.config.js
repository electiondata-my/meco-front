const I18NextHttpBackend = require("i18next-http-backend/cjs");

const namespaces = [
  "byelections",
  "candidates",
  "catalogue",
  "common",
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
];

/** @type {import('next-i18next').UserConfig} */
const defineConfig = (namespace, autoloadNs) => {
  return {
    i18n: {
      defaultLocale: "en-GB",
      locales: ["en-GB", "ms-MY"],
    },
    backend: {
      loadPath: `${process.env.NEXT_PUBLIC_I18N_URL}/${process.env.NEXT_PUBLIC_APP_ENV}/{{lng}}/{{ns}}.json`,
      crossDomain: true,
      allowMultiLoading: true,
    },
    use: [I18NextHttpBackend],
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
