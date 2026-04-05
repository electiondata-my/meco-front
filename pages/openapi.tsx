import { GetServerSideProps } from "next";

// Redirect /openapi → /openapi/introduction
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: "/openapi/introduction", permanent: true },
});

export default function OpenAPIPage() {
  return null;
}
