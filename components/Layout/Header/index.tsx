import { Fragment, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Transition } from "@headlessui/react";
import { useRouter } from "next/router";
import { clx } from "@lib/helpers";
import ThemeToggle from "./theme-toggle";
import LocaleSwitch from "./locale-switch";
import { useTranslation } from "@hooks/useTranslation";
import Navbar, { Nav } from "../Navbar";
import {
  ArrowDownTrayIcon,
  BoltIcon,
  CircleStackIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  FlagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { RedelineationIcon, SeatsIcon } from "@icons/index";

type DesktopNavItem = {
  title: string;
  link: string;
  locale?: string;
};

function isNavItemActive(currentPath: string, link: string) {
  const normalizedLink = link.replace(/\/introduction$/u, "");
  return currentPath === link || currentPath.startsWith(`${normalizedLink}/`);
}

function DesktopDropdown({
  label,
  items,
  currentPath,
}: {
  label: string;
  items: DesktopNavItem[];
  currentPath: string;
}) {
  const hasActiveItem = items.some((item) => isNavItemActive(currentPath, item.link));

  return (
    <Menu as="div" className="relative hidden lg:block">
      <Menu.Button
        className={clx(
          "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-body-sm font-medium text-txt-black-700 transition-colors hover:text-txt-black-900",
          hasActiveItem && "bg-bg-washed-active text-txt-black-900",
        )}
      >
        {label}
        <ChevronDownIcon className="h-4 w-4" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition duration-150 ease-out"
        enterFrom="translate-y-1 opacity-0"
        enterTo="translate-y-0 opacity-100"
        leave="transition duration-100 ease-in"
        leaveFrom="translate-y-0 opacity-100"
        leaveTo="translate-y-1 opacity-0"
      >
        <Menu.Items className="absolute left-0 top-full z-50 mt-2 min-w-[13rem] rounded-xl border border-otl-gray-200 bg-bg-white p-2 shadow-button focus:outline-none">
          <div className="flex flex-col gap-1">
            {items.map((item) => {
              const active = isNavItemActive(currentPath, item.link);

              return (
                <Menu.Item key={item.link} as={Fragment}>
                  {({ close }) => (
                    <Link
                      href={item.link}
                      locale={item.locale}
                      scroll={false}
                      onClick={() => close()}
                      className={clx(
                        "rounded-lg px-3 py-2 text-body-sm transition-colors",
                        active
                          ? "bg-bg-danger-50 font-medium text-txt-danger"
                          : "text-txt-black-700 hover:bg-bg-black-50 hover:text-txt-black-900",
                      )}
                    >
                      {item.title}
                    </Link>
                  )}
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

export default function Header() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentPath = router.asPath.split("?")[0].split("#")[0];

  const toolItems: DesktopNavItem[] = [
    { title: "Query Builder", link: "/query-builder", locale: "en-GB" },
    { title: t("common:nav.catalogue"), link: "/data-catalogue" },
    { title: t("common:nav.openapi"), link: "/openapi", locale: "en-GB" },
  ];

  return (
    <Navbar
    >
      <Link
        href={"/"}
        className="flex items-center gap-2.5 no-underline max-sm:gap-1.5"
      >
        <Image
          src="/static/logo/logo-default.png"
          alt="ElectionData.MY Logo"
          width={28}
          height={28}
          className="aspect-auto select-none object-contain"
        />
        <h1 className="font-poppins text-body-lg font-bold no-underline max-sm:text-body-md">
          ElectionData.MY
        </h1>
      </Link>
      <Nav
        action={
          <Nav.Action>
            <Suspense>
              <ThemeToggle />
              <LocaleSwitch />
            </Suspense>
          </Nav.Action>
        }
      >
        {(close) => (
          <>
            <Nav.Item
              key={"/seats"}
              title={t("common:nav.seats")}
              link="/seats"
              onClick={close}
              icon={<SeatsIcon className="hidden size-8 max-lg:block" />}
              className="text-center"
            />
            <Nav.Item
              key={"/candidates"}
              title={t("common:nav.candidates")}
              link="/candidates"
              onClick={close}
              icon={<UserIcon className="hidden size-8 max-lg:block" />}
              className="text-center"
            />
            <Nav.Item
              key={"/parties"}
              title={t("common:nav.parties")}
              link="/parties"
              onClick={close}
              icon={<FlagIcon className="hidden size-8 max-lg:block" />}
              className="text-center"
            />
            <Nav.Item
              key={"/elections"}
              title={t("common:nav.elections")}
              link="/elections"
              onClick={close}
              icon={
                <ClipboardDocumentCheckIcon className="hidden size-8 max-lg:block" />
              }
              className="text-center"
            />
            <Nav.Item
              key={"/byelections"}
              title={t("common:nav.byelections")}
              link="/byelections"
              onClick={close}
              icon={<BoltIcon className="hidden size-8 max-lg:block" />}
              className="text-center"
            />

            <Nav.Item
              key={"/redelineation"}
              title={t("common:nav.redelineation")}
              link="/redelineation"
              onClick={close}
              icon={
                <RedelineationIcon className="hidden size-8 max-lg:block" />
              }
              className="text-center"
            />

            <DesktopDropdown
              label="Tools"
              items={toolItems}
              currentPath={currentPath}
            />

            <Nav.Item
              key={"/query-builder"}
              title="Query Builder"
              link="/query-builder"
              locale="en-GB"
              icon={<CircleStackIcon className="hidden size-8 max-lg:block" />}
              onClick={close}
              className="whitespace-nowrap text-center lg:hidden"
            />
            <Nav.Item
              key={"/data-catalogue"}
              title={t("common:nav.catalogue")}
              link="/data-catalogue"
              icon={
                <ArrowDownTrayIcon className="hidden size-8 max-lg:block" />
              }
              onClick={close}
              className="whitespace-nowrap text-center lg:hidden"
            />
            <Nav.Item
              key={"/openapi"}
              title={t("common:nav.openapi")}
              link="/openapi"
              locale="en-GB"
              icon={
                <CodeBracketIcon className="hidden size-8 max-lg:block" />
              }
              onClick={close}
              className="whitespace-nowrap text-center lg:hidden"
            />
          </>
        )}
      </Nav>
    </Navbar>
  );
}
