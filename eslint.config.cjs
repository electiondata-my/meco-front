const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "out/**",
      "sw.js",
      "sw.js.map",
      "workbox-*.js",
      "workbox-*.js.map",
      "fallback-*.js",
    ],
  },
  ...compat.config({
    env: { browser: true, es2020: true },
    extends: ["prettier"],
    parser: "@typescript-eslint/parser",
    parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  }),
];
