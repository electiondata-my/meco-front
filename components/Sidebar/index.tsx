import { FunctionComponent, ReactNode, useState } from "react";
import { Transition } from "@headlessui/react";
import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import { Button, ButtonIcon } from "@govtechmy/myds-react/button";
import { CrossIcon, HamburgerMenuIcon } from "@govtechmy/myds-react/icon";

interface SidebarProps {
  children: ReactNode;
  categories: Array<[category: string, subcategory: string[]]>;
  labels?: Record<string, string>;
  onSelect: (index: string) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  mobileClassName?: string;
  stickyClassName?: string;
  initialSelected?: string;
  sidebarTitle?: string;
}

const Sidebar: FunctionComponent<SidebarProps> = ({
  children,
  categories,
  labels,
  onSelect,
  mobileOpen: mobileOpenProp,
  setMobileOpen: setMobileOpenProp,
  mobileClassName,
  stickyClassName,
  initialSelected,
  sidebarTitle,
}) => {
  const { t } = useTranslation(["catalogue", "common"]);
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const mobileOpen = mobileOpenProp ?? internalOpen;
  const setMobileOpen = setMobileOpenProp ?? setInternalOpen;
  const [selected, setSelected] = useState<string>(
    initialSelected ?? categories[0]?.[0] ?? "",
  );
  const label = (key: string) => labels?.[key] ?? key;

  return (
    <>
      <div className="flex w-full flex-row gap-8">
        {/* Desktop */}
        <div className="xl:1/5 hidden lg:block lg:w-1/5">
          <ul
            className={clx(
              "hide-scrollbar sticky top-36 flex h-[calc(100dvh-64px)] w-full flex-col gap-2 overflow-x-visible overflow-y-scroll",
              stickyClassName,
            )}
          >
            <li className="px-1">
              <h5
                className={clx(
                  "w-full rounded-none text-start text-body-lg font-semibold leading-tight",
                )}
              >
                {sidebarTitle ?? t("category")}
              </h5>
            </li>
            {categories.length > 0 ? (
              categories.map(([category, subcategory]) => (
                <li
                  key={`${category}: ${subcategory[0]}`}
                  title={category}
                  className="space-y-1 px-1"
                >
                  <Button
                    variant={
                      selected === category ? "danger-ghost" : "default-ghost"
                    }
                    className={clx(
                      "w-full",
                      selected === category &&
                        "bg-bg-danger-50 bg-opacity-100 focus:ring-0",
                    )}
                    onClick={() => {
                      setSelected(category);
                      onSelect(
                        subcategory.length > 0
                          ? `${category}: ${subcategory[0]}`
                          : category,
                      );
                    }}
                  >
                    {label(category)}
                  </Button>
                  {subcategory.length > 0 && (
                    <ul className="space-y-1 px-1 pl-6">
                      {subcategory.map((title) => (
                        <li key={title} title={label(title)}>
                          <Button
                            variant={
                              selected === title
                                ? "danger-ghost"
                                : "default-ghost"
                            }
                            className={clx(
                              "w-full text-start",
                              selected === title &&
                                "bg-bg-danger-50 bg-opacity-100 focus:ring-0",
                            )}
                            onClick={() => {
                              setSelected(title);
                              onSelect(`${category}: ${title}`);
                            }}
                          >
                            {label(title)}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))
            ) : (
              <p
                className={
                  "w-full rounded-none text-start text-sm italic leading-tight text-txt-black-500"
                }
              >
                {t("common:no_entries")}
              </p>
            )}
          </ul>
        </div>

        {/* Mobile */}
        <div className="relative h-full w-full lg:w-4/5 xl:w-4/5">
          <>
            <div className={clx("absolute top-4 block lg:hidden")}>
              <Button
                variant={"default-outline"}
                onClick={() => setMobileOpen(true)}
                className="lg:hidden"
              >
                <ButtonIcon>
                  <HamburgerMenuIcon />
                </ButtonIcon>
                {sidebarTitle ?? t("category")}
              </Button>
            </div>
            <Transition
              show={mobileOpen}
              as="div"
              className={clx(
                "shadow-floating fixed left-0 top-14 z-30 flex h-screen w-2/3 flex-col border border-r bg-bg-white px-4 shadow-context-menu sm:w-1/3",
                mobileClassName,
              )}
              enter="transition-opacity duration-75"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ul className="flex flex-col gap-1 overflow-auto pt-2">
                <li className="flex items-center justify-between">
                  <h5
                    className={clx(
                      "w-full rounded-none text-start text-body-lg font-semibold leading-tight",
                    )}
                  >
                    {sidebarTitle ?? t("category")}
                  </h5>

                  <Button
                    variant={"default-ghost"}
                    onClick={() => setMobileOpen(false)}
                  >
                    <ButtonIcon>
                      <CrossIcon />
                    </ButtonIcon>
                  </Button>
                </li>

                {categories.length > 0 ? (
                  categories.map(([category, subcategory]) => (
                    <li
                      key={`${category}: ${subcategory[0]}`}
                      title={category}
                      className="space-y-1 px-1"
                    >
                      <Button
                        variant={
                          selected === category
                            ? "danger-ghost"
                            : "default-ghost"
                        }
                        className={clx(
                          "w-full",
                          selected === category &&
                            "bg-bg-danger-50 bg-opacity-100 focus:ring-0",
                        )}
                        onClick={() => {
                          setSelected(category);
                          onSelect(
                            subcategory.length > 0
                              ? `${category}: ${subcategory[0]}`
                              : category,
                          );
                          setMobileOpen(false);
                        }}
                      >
                        {label(category)}
                      </Button>
                      {subcategory.length > 0 && (
                        <ul className="space-y-1 px-1 pl-6">
                          {subcategory.map((title) => (
                            <li key={title} title={label(title)}>
                              <Button
                                variant={
                                  selected === title
                                    ? "danger-ghost"
                                    : "default-ghost"
                                }
                                className={clx(
                                  "w-full text-start",
                                  selected === title &&
                                    "bg-bg-danger-50 bg-opacity-100 focus:ring-0",
                                )}
                                onClick={() => {
                                  setSelected(title);
                                  onSelect(`${category}: ${title}`);
                                  setMobileOpen(false);
                                }}
                              >
                                {label(title)}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))
                ) : (
                  <p
                    className={
                      "w-full rounded-none text-start text-sm italic leading-tight text-txt-black-500"
                    }
                  >
                    {t("common:no_entries")}
                  </p>
                )}
              </ul>
            </Transition>
          </>
          {/* Content */}
          {children}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
