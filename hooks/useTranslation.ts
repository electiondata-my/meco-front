import { useTranslation as _useTranslation } from "next-i18next";
import { interpolate } from "@lib/helpers";

/**
 * Modified translation hook. Supports anchor (<a>) tag generation.
 * @param namespace i18n Translation file
 * @returns t, i18n
 */
export const useTranslation = (namespace?: string[] | string) => {
  // `[]` is truthy, so `?? "common"` would not run; react-i18next then uses
  // namespaces[0] === undefined and breaks keys like "common:nav.*" on the client.
  const ns =
    Array.isArray(namespace) && namespace.length === 0
      ? "common"
      : (namespace ?? "common");
  const { t, i18n } = _useTranslation(ns);
  const _t = (key: string, params?: any): string | any => {
    return interpolate(t<string, any>(key, params));
  };

  return {
    t: _t,
    i18n,
  };
};
