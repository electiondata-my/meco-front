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
        description="Run customised queries directly in your browser. No Excel files, coding, or data skills needed. All you need is a question you want answered. "
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
