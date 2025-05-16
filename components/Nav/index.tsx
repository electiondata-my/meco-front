import { useLanguage } from "@hooks/useLanguage";
import { clx } from "@lib/helpers";
import { languages } from "@lib/options";
import At from "../At";
import Dropdown from "../Dropdown";
import ThemeToggle from "./theme";
import { useRouter } from "next/router";
import { FunctionComponent, ReactNode, useState } from "react";
import { MenuIcon } from "@icons/index";
import { Button } from "..";

type NavRootProps = {
  children: (close: () => void) => ReactNode;
  stateSelector?: ReactNode;
};

type NavItemProps = {
  icon?: ReactNode;
  title: string;
  link: string;
  onClick: () => void;
  className?: string;
  external?: boolean;
};

type NavFunctionComponent = FunctionComponent<NavRootProps> & {
  Item: typeof Item;
};

const Item: FunctionComponent<NavItemProps> = ({
  link,
  onClick,
  className,
  icon,
  title,
  external = false,
}) => {
  const { pathname } = useRouter();
  return (
    <At
      href={link}
      scroll={false}
      onClick={onClick}
      className={clx(
        "hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 rounded-none px-2 py-2 text-sm font-medium transition hover:cursor-pointer md:rounded-md md:py-[6px]",
        pathname.startsWith(link) && link !== "/"
          ? "bg-slate-100 dark:bg-zinc-800"
          : "",
        className
      )}
      external={external}
    >
      {icon}
      {title}
    </At>
  );
};

const Nav: NavFunctionComponent = ({ children, stateSelector }) => {
  const [showMobile, setShowMobile] = useState<boolean>(false);
  const { language, onLanguageChange } = useLanguage();

  const close = () => setShowMobile(false);
  const open = () => setShowMobile(true);

  return (
    <div className="flex w-screen items-center justify-end lg:justify-between">
      {/* Desktop */}
      <div className="hidden w-fit gap-1 lg:flex">{children(close)}</div>
      <div className="hidden w-fit gap-4 lg:flex">
        {stateSelector}
        <ThemeToggle />
        <Dropdown
          width="w-fit"
          selected={languages.find((lang) => lang.value === language)}
          onChange={onLanguageChange}
          options={languages}
        />
      </div>

      {/* Mobile - Header*/}
      <div className="flex w-full items-center justify-end gap-3 lg:hidden">
        {stateSelector}
        <Button
          type="button"
          variant="reset"
          aria-label="Menu"
          className="hamburger -mr-1 rounded p-[5px] active:bg-slate-200 active:dark:bg-zinc-800 lg:hidden"
          onClick={() => setShowMobile(!showMobile)}
        >
          <MenuIcon className={clx(showMobile && "open")} />
        </Button>
      </div>
      {/* Mobile - Menu */}
      <div
        className={clx(
          "dark:divide-zinc-800 shadow-floating fixed left-0 top-[56px] flex w-screen flex-col gap-0 divide-y bg-white px-4 py-2 backdrop-blur-md dark:bg-zinc-900 lg:hidden border border-slate-200 dark:border-zinc-800 rounded-lg",
          showMobile ? "flex" : "hidden"
        )}
      >
        {children(close)}
        <div className="flex justify-between py-3 gap-x-3">
          <ThemeToggle />
          <Dropdown
            width="w-fit"
            selected={languages.find((lang) => lang.value === language)}
            onChange={onLanguageChange}
            options={languages}
          />
        </div>
      </div>
    </div>
  );
};

Nav.Item = Item;

export default Nav;
