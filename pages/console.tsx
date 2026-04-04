import Metadata from "@components/Metadata";
import ConsoleDashboard from "@dashboards/console";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps } from "next";

const ConsolePage: Page = () => {
  return (
    <>
      <Metadata
        title="API Console"
        description="Manage your ElectionData.MY API keys and monitor usage."
        keywords=""
      />
      <ConsoleDashboard />
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "console", type: "misc" } },
}));

export default ConsolePage;
