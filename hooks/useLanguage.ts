import { useRouter } from "next/router";
import { useTransition } from "react";
/**
 * Language switcher hook.
 * @returns Page with current language
 */
export const useLanguage = () => {
  const { pathname, asPath, query, locale, push } = useRouter();

  const [_, startTransition] = useTransition();

  const onLanguageChange = (lang: string) => {
    startTransition(() => {
      push({ pathname, query }, asPath, {
        locale: lang,
        scroll: false,
      });
    });
  };

  return {
    language: locale,
    onLanguageChange,
  };
};
