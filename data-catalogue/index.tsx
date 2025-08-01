import { Container, Hero, Sidebar, StateDropdown } from "@components/index";
import SectionGrid from "@components/Section/section-grid";
import { useTranslation } from "@hooks/useTranslation";
import { BREAKPOINTS } from "@lib/constants";
import { WindowContext } from "@lib/contexts/window";
import { routes } from "@lib/routes";
import { Trans } from "next-i18next";
import {
  FunctionComponent,
  useMemo,
  useRef,
  useContext,
  useEffect,
  useCallback,
  useState,
} from "react";
import {
  SearchBar,
  SearchBarInput,
  SearchBarInputContainer,
  SearchBarSearchButton,
  SearchBarClearButton,
  SearchBarHint,
} from "@govtechmy/myds-react/search-bar";
import { Pill } from "@govtechmy/myds-react/pill";
import { useData } from "@hooks/useData";
import useFocus from "@hooks/useFocus";
import { clx, toDate } from "@lib/helpers";
import Link from "next/link";
import { useRouter } from "next/router";
import { debounce } from "lodash";
import { useWatch } from "@hooks/useWatch";
import { Catalogue } from "@lib/types";

/**
 * Catalogue Index
 * @overview Status: Live
 */

interface CatalogueIndexProps {
  collection: Record<string, any>;
}

const CatalogueIndex: FunctionComponent<CatalogueIndexProps> = ({
  collection,
}) => {
  const { t, i18n } = useTranslation(["catalogue", "common"]);
  const scrollRef = useRef<Record<string, HTMLElement | null>>({});
  const { size } = useContext(WindowContext);
  const { query } = useRouter();
  const [open, setOpen] = useState(false); // for mobile sidebar

  const search = typeof query.search === "string" ? query.search : "";

  const _collection = useMemo<Array<[string, Catalogue[]]>>(() => {
    const resultCollection: Array<[string, Catalogue[]]> = [];

    Object.entries(collection).forEach(([category, subcategories]) => {
      const subResults: Array<[string, Catalogue[]]> = [];

      Object.entries(subcategories).forEach(([subcategoryTitle, datasets]) => {
        const filteredDatasets = (datasets as Catalogue[]).filter((item) =>
          item.title.toLowerCase().includes(search.toLowerCase()),
        );

        if (filteredDatasets.length > 0) {
          subResults.push([
            `${category}: ${subcategoryTitle}`,
            filteredDatasets,
          ]);
        }
      });

      if (subResults.length > 0) {
        resultCollection.push(...subResults);
      }
    });

    return resultCollection;
  }, [collection, search]);

  const groupedSubcategories = useMemo(() => {
    const map = new Map<string, string[]>();

    _collection.forEach(([fullKey]) => {
      const [category, subcategory] = fullKey.split(": ").map((s) => s.trim());

      if (!map.has(category)) {
        map.set(category, []);
      }

      map.get(category)!.push(subcategory);
    });

    return Array.from(map.entries());
  }, [_collection]);

  return (
    <>
      <Hero
        background="red"
        category={[t("category"), "text-txt-danger"]}
        header={[t("header")]}
        description={[<Trans>{t("description")}</Trans>]}
        pageId={routes.DATA_CATALOGUE}
        sectionGridClassName="max-w-screen-2xl"
      />

      <CatalogueFilter
        mobileOpen={open}
        setMobileOpen={(open) => setOpen(open)}
      />
      <Container>
        <SectionGrid className="max-w-screen-2xl justify-start py-6 lg:py-16">
          <Sidebar
            categories={groupedSubcategories}
            onSelect={(selected) =>
              scrollRef.current[selected]?.scrollIntoView({
                behavior: "smooth",
                block: size.width <= BREAKPOINTS.LG ? "start" : "center",
                inline: "end",
              })
            }
            mobileOpen={open}
            setMobileOpen={(open) => setOpen(open)}
          >
            <Container className="grid-cols-1 gap-0 space-y-8 px-0 pt-16 md:grid-cols-1 md:gap-0 md:px-0 lg:grid-cols-1 lg:space-y-16 lg:pt-0">
              {_collection.length > 0 ? (
                _collection.map(([title, datasets]) => {
                  return (
                    <SectionGrid
                      key={title}
                      ref={(ref) => (scrollRef.current[title] = ref)}
                      className="col-span-full items-start justify-start space-y-6"
                    >
                      <h4 className="font-heading text-heading-2xs text-txt-black-900">
                        {title}
                      </h4>
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {datasets.map((item: Catalogue, index: number) => (
                          <Link
                            key={`${item.id}-${index}`}
                            href={`${routes.DATA_CATALOGUE}/${item.id}`}
                            className="flex columns-2 flex-col gap-4.5 rounded-lg border border-otl-gray-200 bg-bg-white p-4"
                          >
                            <p className="text-body-lg font-semibold">
                              {item.title}
                            </p>
                            <p className="line-clamp-2 flex-1 text-body-sm text-txt-black-500">
                              {item.description}
                            </p>
                            <p className="text-body-xs text-txt-black-500">
                              {t("data_of", {
                                date: toDate(
                                  item.data_as_of
                                    ? item.data_as_of
                                    : new Date().toISOString(),
                                  "dd MMM yyyy, HH:mm",
                                  i18n.language,
                                ),
                                ns: "common",
                              })}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </SectionGrid>
                  );
                })
              ) : (
                <p className="text-txt-black-500">{t("common:no_entries")}.</p>
              )}
            </Container>
          </Sidebar>
        </SectionGrid>
      </Container>
    </>
  );
};

/**
 * Catalogue Filter Component
 */
interface CatalogueFilterProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const CatalogueFilter: FunctionComponent<CatalogueFilterProps> = ({
  mobileOpen,
  setMobileOpen,
}) => {
  const { t } = useTranslation(["catalogue", "common"]);
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { focused } = useFocus(searchRef);
  const { query, replace, pathname, isReady } = useRouter();
  const { size } = useContext(WindowContext);

  const search = typeof query.search === "string" ? query.search : "";
  const { data, setData } = useData({
    input: search,
    isStick: false,
  });

  const { isStick, input } = data;
  const currentState = (query?.state as string) || "mys";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      // Check if 'CMD + K' or 'Ctrl + K' key combination is pressed
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        searchRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setData("isStick", !entry.isIntersecting);
      },
      { threshold: [1] },
    );

    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, []);

  useWatch(() => {
    setData("input", search);
  }, [isReady]);

  const updateURL = useCallback(
    debounce((search: string) => {
      const params = new URLSearchParams(query as Record<string, string>);
      if (search) {
        params.set("search", search);
      } else {
        params.delete("search");
      }

      replace(
        `${pathname}${params.toString() ? `?${params.toString()}` : ""}`,
        undefined,
        {
          shallow: true,
          scroll: false,
        },
      );
    }, 400),
    [query, pathname],
  );

  const handleChange = (search: string) => {
    setData("input", search);
    updateURL(search);
  };

  return (
    <>
      <div ref={sentinelRef} className="h-6" />
      <div
        ref={containerRef}
        className={clx(
          "sticky top-[56px] z-20 col-span-full mx-auto w-full border border-transparent transition-all duration-300 md:top-16 md:w-[727px]",
          isStick && "border-otl-gray-200 bg-bg-white md:w-full 2xl:px-6",
        )}
      >
        <div
          className={clx(
            "flex w-full flex-col items-center gap-6 px-4.5 md:px-0",
            isStick &&
              "mx-auto max-w-screen-2xl flex-row justify-between gap-3 px-4.5 py-0 md:px-6 2xl:px-0",
          )}
        >
          <SearchBar
            size="large"
            className={clx(
              "w-full md:max-w-[727px]",
              isStick && "w-full flex-1 md:max-w-none",
            )}
          >
            <SearchBarInputContainer
              className={clx(
                "has-[input:focus]:!border-otl-danger-300 has-[input:focus]:!ring-otl-danger-200",
                isStick &&
                  "rounded-none border-none !pl-0 shadow-inherit has-[input:focus]:ring-0",
              )}
            >
              <SearchBarSearchButton
                className={clx(
                  "hidden border-otl-danger-300 bg-gradient-to-b from-danger-400 to-danger-600",
                  isStick && "block",
                )}
              />
              <SearchBarInput
                ref={searchRef}
                placeholder={t("catalogue:placeholder.search")}
                value={input}
                onValueChange={handleChange}
                className={clx("text-body-md", isStick && "w-full py-3")}
              />
              {input && (
                <SearchBarClearButton
                  onClick={() => {
                    handleChange("");
                  }}
                />
              )}

              <SearchBarHint className={clx("hidden lg:flex")}>
                Press <Pill size="small">/</Pill> to start searching
              </SearchBarHint>

              <SearchBarSearchButton
                className={clx(
                  "border-otl-danger-300 bg-gradient-to-b from-danger-400 to-danger-600",
                  isStick && "hidden",
                )}
              />
            </SearchBarInputContainer>
          </SearchBar>
          <div className="flex w-fit items-center justify-center gap-2">
            {/* <Button
              variant={"default-outline"}
              onClick={() => setMobileOpen(true)}
              className="lg:hidden"
            >
              <ButtonIcon>
                <HamburgerMenuIcon />
              </ButtonIcon>
              {t("category")}
            </Button> */}
            <StateDropdown
              anchor={isStick ? "right" : "right-1/2 translate-x-1/2"}
              width="w-fit self-center"
              currentState={currentState}
              onChange={(selected) => {
                if (selected.value === "mys") {
                  replace(routes.DATA_CATALOGUE, undefined, { scroll: false });
                  return;
                }
                replace(
                  `${routes.DATA_CATALOGUE}/state/${selected.value}`,
                  undefined,
                  {
                    scroll: false,
                  },
                );
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

CatalogueFilter.displayName = "CatalogueFilter";

export default CatalogueIndex;
