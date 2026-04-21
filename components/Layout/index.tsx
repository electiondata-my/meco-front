import Header from "@components/Layout/Header";
import Footer from "@components/Layout/Footer";
import { FunctionComponent, ReactNode } from "react";
interface LayoutProps {
  children: ReactNode;
}

const Layout: FunctionComponent<LayoutProps> = ({ children }) => {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
};

export default Layout;
