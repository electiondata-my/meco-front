import { useEffect } from "react";
import { useRouter } from "next/router";
import { GlobeIcon } from "@govtechmy/myds-react/icon";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@govtechmy/myds-react/select";
import { useLanguage } from "@hooks/useLanguage";
import { languages } from "@lib/options";

// TEMPORARY TRANSLATION FREEZE:
// Set this back to false when Malay translations are ready. That will restore
// the normal site-wide language selector while preserving ENGLISH_ONLY_PATHS
// for pages that should remain English-only.
const LANGUAGE_SWITCH_FROZEN = true;
const ENGLISH_ONLY_PATHS = [
  "/openapi",
  "/query-builder",
  "/signin",
  "/console",
];

function isEnglishOnlyPath(asPath: string) {
  return ENGLISH_ONLY_PATHS.some(
    (p) => asPath === p || asPath.startsWith(p + "/"),
  );
}

export default function LocaleSwitch() {
  const { language, onLanguageChange } = useLanguage();
  const { asPath, locale, push, pathname, query } = useRouter();

  const englishOnly = isEnglishOnlyPath(asPath.split("?")[0]);
  // When LANGUAGE_SWITCH_FROZEN is true, every route behaves like an
  // English-only route: the selector is disabled and ms-MY URLs are redirected
  // to en-GB. To undo the freeze, flip LANGUAGE_SWITCH_FROZEN to false.
  const forceEnglish = LANGUAGE_SWITCH_FROZEN || englishOnly;
  // Stable display value — avoid returning null during locale transitions
  const displayLanguage = language ?? "en-GB";

  // Temporarily keep the site in English until translations are ready.
  useEffect(() => {
    if (forceEnglish && locale === "ms-MY") {
      push({ pathname, query }, asPath, { locale: "en-GB", scroll: false });
    }
  }, [forceEnglish, locale, asPath, pathname, query, push]);

  if (forceEnglish) {
    return (
      <div className="pointer-events-none opacity-40">
        <Select
          variant={"outline"}
          size={"small"}
          multiple={false}
          value="en-GB"
        >
          <SelectTrigger>
            <GlobeIcon className="hidden lg:block" />
            <SelectValue className="text-txt-black-900">
              {() => languages["en-GB"].full}
            </SelectValue>
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <Select
      variant={"outline"}
      size={"small"}
      multiple={false}
      onValueChange={onLanguageChange}
      defaultValue={displayLanguage}
      value={displayLanguage}
    >
      <SelectTrigger>
        <GlobeIcon className="hidden lg:block" />
        <SelectValue className="text-txt-black-900">
          {(locale) => languages?.[locale as "ms-MY" | "en-GB"].full}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {Object.entries(languages).map(([value, label]) => (
            <SelectItem key={value} value={value} className="text-body-sm">
              {label.full}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
