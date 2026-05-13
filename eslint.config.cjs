const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      ".next/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
      "sw.js",
      "sw.js.map",
      "workbox-*.js",
      "workbox-*.js.map",
      "fallback-*.js",
    ],
  },
  ...compat.config({
    env: { browser: true, es2020: true },
    extends: ["prettier", "plugin:@next/next/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "import/no-anonymous-default-export": "off",
    },
  }),
];
