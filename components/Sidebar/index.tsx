import { FunctionComponent, ReactNode, useState } from "react";
import { Transition } from "@headlessui/react";
import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import { Button, ButtonIcon } from "@govtechmy/myds-react/button";
import { CrossIcon } from "@govtechmy/myds-react/icon";

interface SidebarProps {
  children: ReactNode;
  categories: Array<[category: string, subcategory: string[]]>;
  onSelect: (index: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const Sidebar: FunctionComponent<SidebarProps> = ({
  children,
  categories,
  onSelect,
  mobileOpen,
  setMobileOpen,
}) => {
  const { t } = useTranslation(["catalogue", "common"]);
  const [selected, setSelected] = useState<string>(categories[0]?.[0] || "");

  return (
    <>
      <div className="flex w-full flex-row gap-8">
        {/* Desktop */}
        <div className="hidden lg:block lg:w-1/4 xl:w-1/5">
          <ul className="hide-scrollbar sticky top-36 flex h-[90vh] w-full flex-col gap-6 overflow-x-visible overflow-y-scroll">
            <li className="px-1">
              <h5
                className={clx(
                  "w-full rounded-none text-start text-body-lg font-semibold leading-tight",
                )}
              >
                {t("category")}
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
                        "bg-[#FEF2F2] bg-opacity-100 focus:ring-0",
                    )}
                    onClick={() => {
                      setSelected(category);
                      onSelect(`${category}: ${subcategory[0]}`);
                    }}
                  >
                    {category}
                  </Button>
                  <ul className="space-y-1 px-1 pl-6">
                    {subcategory.length &&
                      subcategory.map((title) => (
                        <li key={title} title={title}>
                          <Button
                            variant={
                              selected === title
                                ? "danger-ghost"
                                : "default-ghost"
                            }
                            className={clx(
                              "w-full text-start",
                              selected === title &&
                                "bg-[#FEF2F2] bg-opacity-100 focus:ring-0",
                            )}
                            onClick={() => {
                              setSelected(title);
                              onSelect(`${category}: ${title}`);
                            }}
                          >
                            {title}
                          </Button>
                        </li>
                      ))}
                  </ul>
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
        <div className="relative w-full">
          <>
            <Transition
              show={mobileOpen}
              as="div"
              className="shadow-floating fixed left-0 top-14 z-30 flex h-screen w-2/3 flex-col border border-r border-otl-gray-200 bg-bg-white p-4 shadow-context-menu sm:w-1/3"
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
                    {t("category")}
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
                            "bg-[#FEF2F2] bg-opacity-100 focus:ring-0",
                        )}
                        onClick={() => {
                          setSelected(category);
                          onSelect(`${category}: ${subcategory[0]}`);
                          setMobileOpen(false);
                        }}
                      >
                        {category}
                      </Button>
                      <ul className="space-y-1 px-1 pl-6">
                        {subcategory.length &&
                          subcategory.map((title) => (
                            <li key={title} title={title}>
                              <Button
                                variant={
                                  selected === title
                                    ? "danger-ghost"
                                    : "default-ghost"
                                }
                                className={clx(
                                  "w-full text-start",
                                  selected === title &&
                                    "bg-[#FEF2F2] bg-opacity-100 focus:ring-0",
                                )}
                                onClick={() => {
                                  setSelected(title);
                                  onSelect(`${category}: ${title}`);
                                  setMobileOpen(false);
                                }}
                              >
                                {title}
                              </Button>
                            </li>
                          ))}
                      </ul>
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
