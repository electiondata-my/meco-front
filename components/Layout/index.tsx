import Header from "@components/Layout/Header";
import Footer from "@components/Layout/Footer";
import { FunctionComponent, ReactNode } from "react";

interface LayoutProps {
  className?: string;
  stateSelector?: ReactNode;
  children: ReactNode;
}

const Layout: FunctionComponent<LayoutProps> = ({ className, children, stateSelector }) => {
  return (
    <div vaul-drawer-wrapper="" className={className}>
      <Header stateSelector={stateSelector} />
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-grow flex-col pt-14">{children}</div>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
