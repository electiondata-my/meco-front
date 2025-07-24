import {
  FunctionComponent,
  useState,
  createContext,
  ComponentProps,
} from "react";
import { clx } from "@lib/helpers";

interface NavbarProps extends ComponentProps<"header"> {
  innerclassName?: string;
}

interface NavbarContextProps {
  show: boolean;
  setShow: (value: boolean) => void;
}
const NavbarContext = createContext<NavbarContextProps>({
  show: false,
  setShow: () => {},
});

// Extracted from MyDS to do some adjustment not possible from the library
const Navbar: FunctionComponent<NavbarProps> = ({
  children,
  className,
  innerclassName,
  ...props
}) => {
  const [show, setShow] = useState(false);
  return (
    <NavbarContext.Provider value={{ show, setShow }}>
      <header
        id="navbar"
        className={clx(
          "sticky top-0 z-50 h-16 w-full border-b border-otl-gray-200 bg-bg-white shadow-button max-md:h-14 2xl:px-6 print:hidden",
          className,
        )}
        data-nosnippet
        {...props}
      >
        <div
          className={clx(
            "relative mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4.5 max-md:h-14 md:px-6 2xl:px-0",
            innerclassName,
          )}
        >
          {children}
        </div>
      </header>
    </NavbarContext.Provider>
  );
};

Navbar.displayName = "Navbar";

export default Navbar;
