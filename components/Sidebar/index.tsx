import { FunctionComponent, ReactNode, useState } from "react";
import { Transition } from "@headlessui/react";
import Button from "@components/Button";
import { Bars3BottomLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "@hooks/useTranslation";

interface SidebarProps {
  children: ReactNode;
  categories: Array<[category: string, subcategory: string[]]>;
  onSelect: (index: string) => void;
}

const Sidebar: FunctionComponent<SidebarProps> = ({ children, categories, onSelect }) => {
  const { t } = useTranslation(["catalogue", "common"]);
  const [selected, setSelected] = useState<string>();
  const [show, setShow] = useState<boolean>(false);
  const styles = {
    base: "px-4 lg:px-5 py-1.5 w-full rounded-none text-start leading-tight",
    active:
      "text-sm border-l-2 border-zinc-900 bg-slate-100 text-zinc-900 font-medium dark:bg-zinc-800 dark:text-white dark:border-white",
    default: "text-sm text-zinc-500",
  };

  return (
    <>
      <div className="flex w-full flex-row">
        {/* Desktop */}
        <div className="dark:border-r-slate-800  hidden border-r lg:block lg:w-1/4 xl:w-1/5">
          <ul className="sticky top-14 flex h-[90vh] flex-col gap-2 overflow-auto pt-3">
            <li>
              <h5 className={styles.base}>{t("category")}</h5>
            </li>
            {categories.length > 0 ? (
              categories.map(([category, subcategory]) => (
                <li key={`${category}: ${subcategory[0]}`} title={category}>
                  <Button
                    className={[
                      styles.base,
                      selected === category ? styles.active : styles.default,
                    ].join(" ")}
                    onClick={() => {
                      setSelected(category);
                      onSelect(`${category}: ${subcategory[0]}`);
                    }}
                  >
                    {category}
                  </Button>
                  <ul className="ml-5 space-y-1">
                    {subcategory.length &&
                      subcategory.map(title => (
                        <li key={title} title={title}>
                          <Button
                            className={[
                              styles.base,
                              selected === title ? styles.active : styles.default,
                            ].join(" ")}
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
              <p className={[styles.base, "text-zinc-500 text-sm italic"].join(" ")}>
                {t("common:no_entries")}
              </p>
            )}
          </ul>
        </div>

        {/* Mobile */}
        <div className="relative w-full">
          <>
            <div className="absolute top-[72px] block lg:hidden">
              <Button
                className="btn-default sticky top-36 z-10"
                icon={<Bars3BottomLeftIcon className="h-4 w-4" />}
                onClick={() => setShow(true)}
              >
                {t("category")}
              </Button>
            </div>
            <Transition
              show={show}
              as="div"
              className="dark:border-zinc-800 shadow-floating fixed left-0 top-14 z-30 flex h-screen w-2/3 flex-col border border-r bg-white dark:bg-zinc-900 sm:w-1/3"
              enter="transition-opacity duration-75"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ul className="flex flex-col gap-1 overflow-auto pt-2">
                <li className="flex items-baseline justify-between">
                  <h5 className={styles.base}>{t("category")}</h5>

                  <Button
                    className="hover:bg-slate-100 dark:hover:bg-zinc-800 group absolute right-2 top-2 flex h-8 w-8 items-center rounded-full"
                    onClick={() => setShow(false)}
                  >
                    <XMarkIcon className="text-zinc-500 absolute right-1.5 h-5 w-5 group-hover:text-zinc-900 dark:group-hover:text-white" />
                  </Button>
                </li>

                {categories.length > 0 ? (
                  categories.map(([category, subcategory]) => (
                    <li key={`${category}: ${subcategory[0]}`} title={category}>
                      <Button
                        className={[
                          styles.base,
                          selected === category ? styles.active : styles.default,
                        ].join(" ")}
                        onClick={() => {
                          setSelected(category);
                          onSelect(`${category}: ${subcategory[0]}`);
                        }}
                      >
                        {category}
                      </Button>
                      <ul className="ml-4">
                        {subcategory.length &&
                          subcategory.map(title => (
                            <li key={title}>
                              <Button
                                className={[
                                  styles.base,
                                  selected === title ? styles.active : styles.default,
                                ].join(" ")}
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
                  <p className={[styles.base, "text-zinc-500 text-sm italic"].join(" ")}>
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
