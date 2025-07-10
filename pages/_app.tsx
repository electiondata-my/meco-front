import Nexti18NextConfig from "../next-i18next.config";
import "../styles/globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Layout from "@components/Layout";
import Progress from "@components/Progress";
import { clx } from "@lib/helpers";
import { AppPropsLayout } from "@lib/types";
import { appWithTranslation } from "next-i18next";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { Inter, Poppins } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

// App instance
function App({ Component, pageProps }: AppPropsLayout) {
  const layout =
    Component.layout || ((page: ReactNode) => <Layout>{page}</Layout>);

  return (
    <main
      className={clx(
        inter.className,
        poppins.variable,
        "box-border flex h-full min-h-screen flex-col bg-bg-white font-body text-body-sm text-txt-black-900",
      )}
    >
      <ThemeProvider attribute="class">
        {layout(<Component {...pageProps} />, pageProps)}
        <Progress />
      </ThemeProvider>
    </main>
  );
}

export default appWithTranslation(App, Nexti18NextConfig);
