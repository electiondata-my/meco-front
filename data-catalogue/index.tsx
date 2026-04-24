import { Transition } from "@headlessui/react";
import { EyeIcon } from "@heroicons/react/20/solid";
import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  SearchBar,
  SearchBarClearButton,
  SearchBarHint,
  SearchBarInput,
  SearchBarInputContainer,
  SearchBarSearchButton,
} from "@govtechmy/myds-react/search-bar";
import { Pill } from "@govtechmy/myds-react/pill";
import { useTranslation } from "@hooks/useTranslation";
import { numFormat, toDate } from "@lib/helpers";
import { routes } from "@lib/routes";
import { Catalogue } from "@lib/types";
import { debounce } from "lodash";
import Link from "next/link";
import { Trans } from "next-i18next";
import { useRouter } from "next/router";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";

interface CatalogueIndexProps {
  collection: Record<string, any>;
}

type CatalogueSection = {
  category: string;
  sectionKey: string;
  title: string;
  datasets: Catalogue[];
};

const CatalogueIndex: FunctionComponent<CatalogueIndexProps> = ({
  collection,
}) => {
  const { t, i18n } = useTranslation(["catalogue", "common"]);
  const { query, replace, pathname, isReady } = useRouter();
  const scrollRef = useRef<Record<string, HTMLElement | null>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [views, setViews] = useState<number | null>(null);
  const [viewsLoading, setViewsLoading] = useState(true);

  const search = typeof query.search === "string" ? query.search : "";

  useEffect(() => {
    if (!isReady) return;
    setSearchInput(search);
  }, [isReady, search]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key === "Escape") {
        searchRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchViews = async () => {
      setViewsLoading(true);
      try {
        const token = process.env.NEXT_PUBLIC_TINYBIRD_TOKEN;
        const url = `https://api.us-west-2.aws.tinybird.co/v0/pipes/views_by_page.json?token=${token}&page_id=${routes.DATA_CATALOGUE}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        setViews(data?.data?.[0]?.hits ?? null);
      } catch (_error) {
        setViews(null);
      } finally {
        setViewsLoading(false);
      }
    };

    void fetchViews();
  }, []);

  const updateURL = useMemo(
    () =>
      debounce((nextSearch: string) => {
        const params = new URLSearchParams(query as Record<string, string>);

        if (nextSearch) {
          params.set("search", nextSearch);
        } else {
          params.delete("search");
        }

        void replace(
          `${pathname}${params.toString() ? `?${params.toString()}` : ""}`,
          undefined,
          { shallow: true, scroll: false },
        );
      }, 250),
    [pathname, query, replace],
  );

  useEffect(() => () => updateURL.cancel(), [updateURL]);

  const sections = useMemo<CatalogueSection[]>(() => {
    const result: CatalogueSection[] = [];

    Object.entries(collection).forEach(([category, subcategories]) => {
      Object.entries(subcategories).forEach(([subcategoryTitle, datasets]) => {
        const filteredDatasets = (datasets as Catalogue[]).filter((item) =>
          item.title.toLowerCase().includes(searchInput.toLowerCase()),
        );

        if (filteredDatasets.length > 0) {
          result.push({
            category,
            sectionKey: `${category}: ${subcategoryTitle}`,
            title: `${category}: ${subcategoryTitle}`,
            datasets: filteredDatasets,
          });
        }
      });
    });

    return result;
  }, [collection, searchInput]);

  const groupedSections = useMemo(() => {
    const map = new Map<string, CatalogueSection[]>();

    sections.forEach((section) => {
      if (!map.has(section.category)) {
        map.set(section.category, []);
      }

      map.get(section.category)?.push(section);
    });

    return Array.from(map.entries());
  }, [sections]);

  const scrollToSection = (sectionKey: string) => {
    const element = scrollRef.current[sectionKey];

    if (element) {
      const navbarOffset = 80;
      const top =
        element.getBoundingClientRect().top + window.scrollY - navbarOffset;

      window.scrollTo({
        top: Math.max(top, 0),
        behavior: "smooth",
      });
    }

    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="mb-5 flex flex-col gap-2">
        <Link
          href="https://t.me/myelectiondata"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
          className="group flex items-center gap-2 rounded-lg border border-otl-gray-200 px-3 py-2 text-body-sm font-medium text-txt-black-700 transition-colors hover:border-otl-danger-200 hover:bg-bg-danger-50 hover:text-txt-danger"
        >
          <ChatBubbleLeftRightIcon className="text-txt-black-400 h-4 w-4 shrink-0 transition-colors group-hover:text-txt-danger" />
          Get help: User group
        </Link>
      </div>

      <div className="mb-4 border-t border-otl-gray-200" />

      <div className="space-y-4">
        {groupedSections.map(([category, categorySections]) => (
          <div key={category}>
            <p className="text-txt-black-400 mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              {category}
            </p>
            <ul className="space-y-1">
              {categorySections.map((section) => (
                <li key={section.sectionKey}>
                  <button
                    onClick={() => scrollToSection(section.sectionKey)}
                    className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-[14px] leading-5 text-txt-black-700 transition-colors hover:border-otl-gray-200 hover:bg-bg-black-50 hover:text-txt-black-900"
                  >
                    {section.title.replace(`${category}: `, "")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="px-3 sm:px-4.5 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-screen-xl">
        <aside className="hidden w-60 shrink-0 self-stretch border-r border-otl-gray-200 lg:block">
          <div className="hide-scrollbar sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pb-10 pr-4 pt-8">
            {sidebarContent}
          </div>
        </aside>

        <Transition
          show={mobileOpen}
          as="div"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <Transition.Child
            as="div"
            enter="transition-opacity duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            className="bg-black/40 absolute inset-0"
            onClick={() => setMobileOpen(false)}
          />
          <Transition.Child
            as="aside"
            enter="transition-transform duration-300 ease-out"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-300 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
            className="shadow-lg absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-otl-gray-200 bg-bg-white px-3 pb-10 pt-6 sm:px-4"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="font-poppins text-body-sm font-semibold text-txt-black-900">
                Data Catalogue
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-txt-black-400 rounded-md p-1 hover:text-txt-black-700"
                aria-label="Close catalogue sections"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </Transition.Child>
        </Transition>

        <main className="min-w-0 flex-1 px-2 pb-24 pt-8 sm:px-6 lg:px-10">
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-txt-black-600 flex items-center gap-1.5 text-body-sm hover:text-txt-black-900"
              aria-label="Open catalogue sections"
            >
              <Bars3Icon className="h-5 w-5" />
              Sections
            </button>
          </div>

          <h1 className="mb-3 font-poppins text-[1.875rem] font-semibold leading-tight text-txt-black-900 sm:text-[2rem]">
            {t("hero.header")}
          </h1>
          <p className="mb-3 max-w-2xl text-body-sm text-txt-black-500">
            <Trans>{t("hero.description")}</Trans>
          </p>
          <p className="mb-8 flex items-center gap-0.5 text-body-sm text-txt-black-500">
            <EyeIcon className="h-4.5 w-4.5 shrink-0" />
            {viewsLoading
              ? "..."
              : views !== null
                ? `${numFormat(views, "standard")} ${t("common:views", {
                    count: views,
                  })}`
                : "---"}
          </p>

          <div className="mx-auto mb-10 w-full max-w-3xl lg:max-w-[80%]">
            <SearchBar size="large" className="w-full">
              <SearchBarInputContainer className="gap-2 !pl-2 !pr-3 has-[input:focus]:!border-otl-danger-300 has-[input:focus]:!ring-otl-danger-200 sm:!pr-4">
                <SearchBarSearchButton className="border-otl-danger-300 bg-gradient-to-b from-danger-400 to-danger-600" />
                <SearchBarInput
                  ref={searchRef}
                  placeholder={t("catalogue:placeholder.search")}
                  value={searchInput}
                  onValueChange={(value) => {
                    setSearchInput(value);
                    updateURL(value);
                  }}
                  className="text-body-md"
                />
                {searchInput && (
                  <SearchBarClearButton
                    onClick={() => {
                      setSearchInput("");
                      updateURL("");
                    }}
                  />
                )}
                <SearchBarHint className="hidden lg:flex lg:pr-1">
                  Press <Pill size="small">/</Pill> to start searching
                </SearchBarHint>
              </SearchBarInputContainer>
            </SearchBar>
          </div>

          {sections.length > 0 ? (
            <div className="space-y-12">
              {sections.map((section) => (
                <section
                  key={section.sectionKey}
                  ref={(ref) => (scrollRef.current[section.sectionKey] = ref)}
                >
                  <h2 className="mb-5 font-poppins text-[1.25rem] font-semibold text-txt-black-900">
                    {section.title}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {section.datasets.map((item, index) => (
                      <Link
                        key={`${item.id}-${index}`}
                        href={`${routes.DATA_CATALOGUE}/${item.id}`}
                        className="group rounded-2xl border border-otl-gray-200 bg-bg-white p-5 transition-colors hover:border-otl-danger-200 hover:bg-bg-danger-50"
                      >
                        <p className="text-body-lg font-semibold text-txt-black-900">
                          {item.title}
                        </p>
                        <p className="mt-2 line-clamp-3 text-body-sm text-txt-black-500">
                          {item.description}
                        </p>
                        <p className="mt-4 text-body-xs text-txt-black-500">
                          {t("data_of", {
                            date: toDate(
                              item.data_as_of ?? new Date().toISOString(),
                              "dd MMM yyyy, HH:mm",
                              i18n.language,
                            ),
                            ns: "common",
                          })}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-otl-gray-200 bg-bg-white px-5 py-8 text-body-sm text-txt-black-500">
              {t("common:no_entries")}.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CatalogueIndex;
