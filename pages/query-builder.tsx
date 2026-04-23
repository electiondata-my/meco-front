import Metadata from "@components/Metadata";
import QueryBuilderDashboard from "@dashboards/query-builder";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps } from "next";

const QueryBuilderPage: Page = () => {
  return (
    <>
      <Metadata
        title="Query Builder"
        description="Run live SQL queries against ElectionData.MY datasets directly in your browser. Powered by DuckDB WASM — no API keys needed."
        keywords="sql, query, election data, duckdb, data explorer"
      />
      <QueryBuilderDashboard />
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "query-builder", type: "misc" } },
}));

export default QueryBuilderPage;
