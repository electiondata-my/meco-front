import { withi18n } from "@lib/decorators";
import { GetStaticProps } from "next";

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  redirect: {
    destination: "/openapi/introduction",
    permanent: true,
  },
}));

export default function OpenAPIPage() {
  return null;
}
