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
import { clx } from "@lib/helpers";
import Link from "next/link";

/**
 * Catalogue Index
 * @overview Status: Live
 */

export type Catalogue = {
  id: string;
  title: string;
  description?: string;
};

interface CatalogueIndexProps {
  collection: Record<string, any>;
}

const CatalogueIndex: FunctionComponent<CatalogueIndexProps> = ({
  collection,
}) => {
  const { t } = useTranslation(["catalogue", "common"]);
  const scrollRef = useRef<Record<string, HTMLElement | null>>({});
  const { size } = useContext(WindowContext);

  const _collection = useMemo<Array<[string, any]>>(() => {
    const resultCollection: Array<[string, Catalogue[]]> = [];
    Object.entries(collection).forEach(([category, subcategory]) => {
      Object.entries(subcategory).forEach(([subcategory_title, datasets]) => {
        resultCollection.push([
          `${category}: ${subcategory_title}`,
          datasets as Catalogue[],
        ]);
      });
    });

    return resultCollection;
  }, [collection]);

  return (
    <>
      <Hero
        background="red"
        category={[t("category"), "text-txt-danger"]}
        header={[t("header")]}
        description={[<Trans>{t("description")}</Trans>]}
        pageId={routes.DATA_CATALOGUE}
        withPattern={true}
      />

      <CatalogueFilter />
      <Container className="min-h-screen">
        <SectionGrid className="py-6 lg:py-16">
          <Sidebar
            categories={Object.entries(collection).map(
              ([category, subcategory]) => [category, Object.keys(subcategory)],
            )}
            onSelect={(selected) =>
              scrollRef.current[selected]?.scrollIntoView({
                behavior: "smooth",
                block: size.width <= BREAKPOINTS.LG ? "start" : "center",
                inline: "end",
              })
            }
          >
            <Container className="grid-cols-1 gap-0 space-y-8 px-0 md:grid-cols-1 md:gap-0 md:px-0 lg:grid-cols-1 lg:space-y-16">
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
                            <p className="line-clamp-2 text-body-sm text-txt-black-500">
                              {item.description}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </SectionGrid>
                  );
                })
              ) : (
                <p className="p-2 pt-16 text-txt-black-500 lg:p-8">
                  {t("common:no_entries")}.
                </p>
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
interface CatalogueFilterProps {}

const CatalogueFilter: FunctionComponent<CatalogueFilterProps> = ({}) => {
  const { t } = useTranslation(["catalogue", "common"]);
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { focused } = useFocus(searchRef);
  const { data, setData } = useData({
    query: "",
    isStick: false,
  });

  const { query, isStick } = data;

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

  return (
    <>
      <div ref={sentinelRef} className="h-6" />
      <div
        ref={containerRef}
        className={clx(
          "sticky top-[56px] z-20 col-span-full mx-auto w-full border border-transparent px-4.5 transition-all md:top-16 md:w-[727px] lg:px-0",
          isStick && "border-otl-gray-200 bg-bg-white md:w-full",
        )}
      >
        <div
          className={clx(
            "flex w-full flex-col gap-6",
            isStick &&
              "mx-auto max-w-screen-xl justify-between py-3 sm:flex-row md:px-6 xl:px-0",
          )}
        >
          <SearchBar size="large" className="w-full md:w-[727px]">
            <SearchBarInputContainer className="has-[input:focus]:border-otl-danger-300 has-[input:focus]:ring-otl-danger-200">
              <SearchBarInput
                ref={searchRef}
                placeholder={t("catalogue:placeholder.search")}
                value={query}
                onValueChange={(search) => setData("query", search)}
              />
              {query && (
                <SearchBarClearButton onClick={() => setData("query", "")} />
              )}

              {!(query && focused) && (
                <SearchBarHint className="hidden lg:flex">
                  Press <Pill size="small">/</Pill> to start searching
                </SearchBarHint>
              )}
              <SearchBarSearchButton className="border-otl-danger-300 bg-gradient-to-b from-danger-400 to-danger-600" />
            </SearchBarInputContainer>
          </SearchBar>
          <StateDropdown
            url={routes.DATA_CATALOGUE}
            anchor="right"
            width="w-fit self-center"
            currentState={"mys"}
          />
        </div>
      </div>
    </>
  );
};

CatalogueFilter.displayName = "CatalogueFilter";

export default CatalogueIndex;
