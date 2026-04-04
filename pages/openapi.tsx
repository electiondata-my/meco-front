import { useEffect } from "react";
import { useRouter } from "next/router";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps } from "next";

// Redirect /openapi → /openapi/introduction
const OpenAPIPage: Page = () => {
  const router = useRouter();
  useEffect(() => {
    void router.replace("/openapi/introduction");
  }, [router]);
  return null;
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "openapi", type: "misc" as const } },
}));

export default OpenAPIPage;
