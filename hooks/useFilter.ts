import { OptionType } from "@lib/types";
import debounce from "lodash/debounce";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useData } from "./useData";
import { useWatch } from "./useWatch";

/**
 * Reconstruct a filter value from its URL string representation.
 * The expected shape is inferred from the initial state value for that key.
 *   - Array (of OptionType) → split comma-separated string back into OptionType[]
 *   - OptionType object       → wrap string in { value, label }
 *   - Primitive               → raw string as-is
 */
function parseQueryValue(raw: string | string[], initial: unknown): unknown {
  const str = Array.isArray(raw) ? raw[0] : raw;
  if (Array.isArray(initial)) {
    return str
      .split(",")
      .filter(Boolean)
      .map((v) => ({ value: v, label: v }) as OptionType);
  }
  if (
    initial !== null &&
    typeof initial === "object" &&
    "value" in (initial as object)
  ) {
    return { value: str, label: str } as OptionType;
  }
  return str;
}

/**
 * Filter hook. Contains logic for backend-driven query / filtering.
 * Works with both getServerSideProps and getStaticProps (client-side query params).
 * For SSG pages, filter state is initialized from URL once router.isReady, and
 * re-synced on external navigations (e.g. browser back/forward).
 * @param state Filter queries
 * @param params Required for URL with dynamic params.
 * @param sequential Only for DC pages
 * @returns filter, setFilter, queries, actives
 */
export const useFilter = (
  state: Record<string, any> = {},
  params = {},
  sequential: boolean = false,
) => {
  const { data, setData, reset } = useData(state);
  const router = useRouter();
  // Prevents the URL-sync effect from re-firing after our own router.replace
  const ownNavigation = useRef(false);
  // Prevents useWatch → search from running during a URL-driven state reset
  const skipSearch = useRef(false);
  // Tracks whether the initial URL sync has happened
  const hasInitialized = useRef(false);

  // Sync filter from URL after hydration (SSG support) and on external navigation
  // (browser back/forward). router.query is empty on SSG first render.
  useEffect(() => {
    if (!router.isReady) return;
    // Skip if this URL change was triggered by our own router.replace
    if (ownNavigation.current) {
      ownNavigation.current = false;
      return;
    }

    const urlOverrides: Record<string, any> = {};
    Object.entries(router.query).forEach(([key, value]) => {
      if (!(key in state) || value === undefined) return;
      urlOverrides[key] = parseQueryValue(
        value as string | string[],
        state[key],
      );
    });

    if (Object.keys(urlOverrides).length > 0) {
      skipSearch.current = true;
      reset({ ...state, ...urlOverrides });
    } else if (hasInitialized.current) {
      // Only reset to defaults on subsequent navigations (e.g. browser back to
      // a clean URL). Skip on initial mount — state already matches defaults.
      skipSearch.current = true;
      reset(state as any);
    }

    hasInitialized.current = true;
  }, [router.isReady, router.asPath]);

  const actives: Array<[string, unknown]> = useMemo(
    () =>
      Object.entries(data).filter(
        ([_, value]) =>
          value !== undefined &&
          value !== null &&
          (value as Array<any>).length !== 0 &&
          value !== "",
      ),
    [data],
  );

  const queries: string = useMemo<string>(() => {
    const query = actives
      .map(([key, value]) => {
        if (!value) return "";
        if (Array.isArray(value))
          return `${key}=${value.map((item: OptionType) => item.value).join(",")}`;
        else return `${key}=${(value as OptionType).value ?? value}`;
      })
      .join("&");
    return `?${query}`;
  }, [actives]);

  const search: Function = useCallback(
    debounce((actives) => {
      const query = actives.map(([key, value]: [string, unknown]) => [
        key,
        Array.isArray(value)
          ? value.map((item: OptionType) => item.value).join(",")
          : typeof value === "string"
            ? value
            : (value as OptionType).value,
      ]);

      ownNavigation.current = true;
      router.replace(
        {
          pathname: router.pathname,
          query: {
            ...params,
            ...Object.fromEntries(query),
          },
        },
        undefined,
        { scroll: false },
      );
    }, 500),
    [],
  );

  const _setData = (key: string, value: any) => {
    if (sequential) {
      let flag = false;
      for (const _key in data) {
        if (flag && _key !== "range") setData(_key, undefined);
        if (key === _key) {
          setData(key, value);
          flag = true;
        }
      }
    } else {
      setData(key, value);
    }
  };

  useWatch(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    search(actives);
  }, [data]);

  return {
    filter: data,
    setFilter: _setData,
    queries,
    actives,
  };
};
