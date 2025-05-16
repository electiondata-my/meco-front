module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    "prettier",
    // "eslint:recommended",
    // "plugin:@typescript-eslint/recommended",
    'plugin:@next/next/recommended'
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["react-refresh"],
  rules: {
    "react-refresh/only-export-components": "warn",
    "@next/next/no-html-link-for-pages": "off",
    "import/no-anonymous-default-export": "off",
  },
};
