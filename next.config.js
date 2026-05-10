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
  transpilePackages: ["chartjs-adapter-luxon"],
  async redirects() {
    return [
      {
        source: "/openapi/introduction",
        destination: "/openapi",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "https://auth.electiondata.my/:path*",
      },
    ];
  },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["api.mapbox.com", "static.electiondata.my"],
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };
    config.module.rules.push(
      { test: /components|hooks\/index.ts/i, sideEffects: false },
      { test: /\.md$/, type: "asset/source" },
      { test: /\.wasm$/, type: "webassembly/async" }
    );
    return config;
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
