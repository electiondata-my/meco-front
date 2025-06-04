import {
  At,
  Button,
  Container,
  Hero,
  Search,
  Section,
  Sidebar,
} from "@components/index";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useFilter } from "@hooks/useFilter";
import { useTranslation } from "@hooks/useTranslation";
import { BREAKPOINTS } from "@lib/constants";
import { WindowContext } from "@lib/contexts/window";
import { routes } from "@lib/routes";
import { OptionType } from "@lib/types";
import { Trans } from "next-i18next";
import {
  FunctionComponent,
  useMemo,
  useRef,
  ForwardRefExoticComponent,
  forwardRef,
  useImperativeHandle,
  ForwardedRef,
  useContext,
} from "react";

/**
 * Catalogue Index
 * @overview Status: Live
 */

export type Catalogue = {
  id: string;
  catalog_name: string;
};

interface CatalogueIndexProps {
  query: Record<string, string>;
  collection: Record<string, any>;
  sources: string[];
}

const CatalogueIndex: FunctionComponent<CatalogueIndexProps> = ({
  query,
  collection,
  sources,
}) => {
  const { t } = useTranslation(["catalogue", "common"]);
  const scrollRef = useRef<Record<string, HTMLElement | null>>({});
  const filterRef = useRef<CatalogueFilterRef>(null);
  const { size } = useContext(WindowContext);
  const sourceOptions = sources.map((source) => ({
    label: source,
    value: source,
  }));

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
        background="blue"
        category={[t("category"), "text-primary dark:text-primary-dark"]}
        header={[t("header")]}
        description={[<Trans>{t("description")}</Trans>]}
        pageId="/data-catalogue"
        // action={
        //   <div className="flex flex-wrap items-center gap-6">
        //     <At
        //       href={routes.DATA_GPT}
        //       className="text-primary group flex items-center gap-2 text-sm font-medium"
        //     >
        //       <SparklesIcon className="h-5 w-5" />
        //       <span className="group-hover:underline">{t("try_datagpt")}</span>
        //     </At>
        //   </div>
        // }
      />

      <Container className="min-h-screen">
        <Sidebar
          categories={Object.entries(collection).map(
            ([category, subcategory]) => [category, Object.keys(subcategory)]
          )}
          onSelect={(selected) =>
            scrollRef.current[selected]?.scrollIntoView({
              behavior: "smooth",
              block: size.width <= BREAKPOINTS.LG ? "start" : "center",
              inline: "end",
            })
          }
        >
          <CatalogueFilter
            ref={filterRef}
            query={query}
            sources={sourceOptions}
          />

          {_collection.length > 0 ? (
            _collection.map(([title, datasets]) => {
              return (
                <Section
                  title={title}
                  key={title}
                  ref={(ref) => (scrollRef.current[title] = ref)}
                  className="p-2 max-lg:first-of-type:pb-8 max-lg:first-of-type:pt-14 py-6 lg:p-8"
                >
                  <ul className="columns-1 space-y-3 sm:columns-3">
                    {datasets.map((item: Catalogue, index: number) => (
                      <li key={index}>
                        <At
                          href={`/data-catalogue/${item.id}`}
                          className="text-primary dark:text-primary-dark no-underline [text-underline-position:from-font] hover:underline"
                          prefetch={false}
                        >
                          {item.catalog_name}
                        </At>
                      </li>
                    ))}
                  </ul>
                </Section>
              );
            })
          ) : (
            <p className="text-zinc-500 p-2 pt-16 lg:p-8">
              {t("common:no_entries")}.
            </p>
          )}
        </Sidebar>
      </Container>
    </>
  );
};

/**
 * Catalogue Filter Component
 */
interface CatalogueFilterProps {
  query: Record<string, any>;
  sources: OptionType[];
  ref?: ForwardedRef<CatalogueFilterRef>;
}

interface CatalogueFilterRef {
  setFilter: (key: string, value: any) => void;
}

const CatalogueFilter: ForwardRefExoticComponent<CatalogueFilterProps> =
  forwardRef(({ query }, ref) => {
    const { t } = useTranslation(["catalogue", "common"]);

    const { filter, setFilter, actives } = useFilter({
      search: query.search ?? "",
    });

    const reset = () => {
      setFilter("search", "");
    };

    useImperativeHandle(ref, () => {
      return { setFilter };
    });

    return (
      <div className="dark:border-zinc-800 sticky top-14 z-10 flex items-center justify-between gap-2 border-b bg-white py-3 dark:bg-zinc-900 lg:pl-2">
        <div className="flex-1">
          <Search
            className="border-none py-1.5"
            placeholder={t("common:placeholder.search")}
            query={filter.search}
            onChange={(e) => setFilter("search", e)}
          />
        </div>
        {actives.length > 0 &&
          actives.findIndex((active) => active[0] !== "source") !== -1 && (
            <Button
              variant="reset"
              className="hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500 group block rounded-full p-1 hover:text-zinc-900 dark:hover:text-white xl:hidden"
              disabled={!actives.length}
              onClick={reset}
            >
              <XMarkIcon className="text-zinc-500 h-5 w-5 group-hover:text-zinc-900 dark:group-hover:text-white" />
            </Button>
          )}
        <div className="hidden gap-2 pr-6 xl:flex">
          {actives.length > 0 &&
            actives.findIndex((active) => active[0] !== "source") !== -1 && (
              <Button
                className="btn-ghost text-zinc-500 group hover:text-zinc-900 dark:hover:text-white"
                disabled={!actives.length}
                onClick={reset}
              >
                <XMarkIcon className="text-zinc-500 h-5 w-5 group-hover:text-zinc-900 dark:group-hover:text-white" />
                {t("common:clear_all")}
              </Button>
            )}
        </div>
      </div>
    );
  });

CatalogueFilter.displayName = "CatalogueFilter";

export default CatalogueIndex;
