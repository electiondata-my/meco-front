import Metadata from "@components/Metadata";
import SiteMetricsDashboard from "@dashboards/site-metrics";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps } from "next";
import { useTranslation } from "@hooks/useTranslation";

const SiteMetricsPage: Page = () => {
  const { t } = useTranslation("site-metrics");

  return (
    <>
      <Metadata
        title={t("meta.title")}
        description={t("meta.description")}
        keywords="ElectionData.MY, site metrics, analytics"
      />
      <SiteMetricsDashboard />
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  "site-metrics",
  async () => ({
    props: { meta: { id: "site-metrics", type: "misc" } },
  }),
);

export default SiteMetricsPage;
