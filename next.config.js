const { i18n } = require("./next-i18next.config");

/**
 * Plugins / Constants
 */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE ?? false,
});
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

/**
 * Next Config
 * @type {import('next').NextConfig}
 * */
const nextConfig = {
  i18n,
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["api.mapbox.com"],
  },
  publicRuntimeConfig: {
    APP_NAME: "ElectionData.MY",
    META_AUTHOR: "electiondata-my",
    META_THEME: "",
    META_KEYWORDS: "open data statistics election malaysia",
    META_DOMAIN: "ElectionData.MY",
    META_URL: process.env.NEXT_PUBLIC_APP_URL,
    META_IMAGE: `${process.env.NEXT_PUBLIC_APP_URL}/static/images/og_{{lang}}.png`,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /components|hooks\/index.ts/i,
      sideEffects: false,
    });
    return config;
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
