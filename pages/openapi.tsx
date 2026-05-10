import { GetStaticProps } from "next";

export const getStaticProps: GetStaticProps = async () => ({
  redirect: { destination: "/openapi/introduction", permanent: true },
});

export default function OpenAPIPage() {
  return null;
}
