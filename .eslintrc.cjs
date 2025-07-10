module.exports = {
  env: { browser: true, es2020: true },
  extends: ["prettier", "plugin:@next/next/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "import/no-anonymous-default-export": "off",
  },
};
