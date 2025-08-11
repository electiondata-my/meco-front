import { GetServerSideProps } from "next";
import { routes } from "@lib/routes";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: routes.SEATS,
      permanent: false,
    },
  };
};

export default function Home() {
  return null;
}
