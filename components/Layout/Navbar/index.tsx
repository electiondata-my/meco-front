import {
  FunctionComponent,
  useState,
  createContext,
  ComponentProps,
  ReactNode,
  useContext,
} from "react";
import { clx } from "@lib/helpers";
import { useRouter } from "next/router";
import { Link as BaseLink } from "@govtechmy/myds-react/link";
import Link from "next/link";
import { CrossIcon, HamburgerMenuIcon } from "@govtechmy/myds-react/icon";

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
          "sticky top-0 z-50 h-16 w-full border-b border-otl-gray-200 bg-bg-white px-4.5 shadow-button max-md:h-14 md:px-6 print:hidden",
          className,
        )}
        data-nosnippet
        {...props}
      >
        <div
          className={clx(
            "relative mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 max-md:h-14",
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

type NavRootProps = {
  children: (close: () => void) => ReactNode;
  action: ReactNode;
};

type NavItemProps = {
  icon?: ReactNode;
  title: string;
  link: string;
  onClick: () => void;
  className?: string;
};

type NavFunctionComponent = FunctionComponent<NavRootProps> & {
  Item: typeof Item;
  Action: typeof Action;
};

const Item: FunctionComponent<NavItemProps> = ({
  link,
  onClick,
  className,
  icon,
  title,
}) => {
  const { pathname } = useRouter();
  return (
    <BaseLink
      underline={"none"}
      asChild
      className={clx(
        "flex flex-col items-center gap-1 px-2.5 py-1.5 text-body-sm font-semibold text-txt-black-500 max-lg:px-2 max-lg:py-2 max-lg:font-medium lg:justify-center lg:text-txt-black-700",
        pathname.startsWith(link) && link !== "/"
          ? "text-txt-danger lg:rounded-md lg:bg-bg-washed-active"
          : "",
        className,
      )}
    >
      <Link href={link} scroll={false} onClick={onClick}>
        <span className="nav-mobile-icon lg:hidden">{icon}</span>
        {title}
      </Link>
    </BaseLink>
  );
};

type NavActionProps = {
  children: ReactNode;
  className?: string;
};

const Action: FunctionComponent<NavActionProps> = ({ children, className }) => {
  const { show, setShow } = useContext(NavbarContext);

  const close = () => setShow(false);
  const open = () => setShow(true);

  return (
    <>
      {/* Desktop */}
      <div className="hidden w-fit gap-4 lg:flex">{children}</div>
      <div className="flex w-full items-center justify-end gap-3 lg:hidden">
        {children}
        {show ? (
          <CrossIcon
            className="box-content block h-5 w-5 text-txt-black-900 lg:hidden"
            onClick={close}
          />
        ) : (
          <HamburgerMenuIcon
            className="box-content block h-5 w-5 text-txt-black-900 lg:hidden"
            onClick={open}
          />
        )}
      </div>
    </>
  );
};

const Nav: NavFunctionComponent = ({ children, action }) => {
  const { show, setShow } = useContext(NavbarContext);
  const close = () => setShow(false);

  return (
    <div className="flex w-full flex-1 items-center justify-end lg:justify-between">
      <div className="hidden w-fit items-center lg:flex">{children(close)}</div>
      {action}
      <div
        className={clx(
          "nav-mobile-menu fixed left-0 top-16 w-full grid-cols-3 gap-0 border-b border-otl-gray-200 bg-bg-white px-3 py-6 shadow-button max-md:top-14 lg:hidden",
          show ? "grid" : "hidden",
        )}
      >
        {children(close)}
      </div>
    </div>
  );
};

Nav.Item = Item;
Nav.Action = Action;

export { Navbar as default, Nav };
