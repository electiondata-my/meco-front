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

const ENGLISH_ONLY_PATHS = ["/openapi", "/signin", "/console"];

function isEnglishOnlyPath(asPath: string) {
  return ENGLISH_ONLY_PATHS.some(
    p => asPath === p || asPath.startsWith(p + "/"),
  );
}

export default function LocaleSwitch() {
  const { language, onLanguageChange } = useLanguage();
  const { asPath, locale, push, pathname, query } = useRouter();

  const englishOnly = isEnglishOnlyPath(asPath.split("?")[0]);
  // Stable display value — avoid returning null during locale transitions
  const displayLanguage = language ?? "en-GB";

  // Redirect ms-MY visitors to en-GB on English-only pages
  useEffect(() => {
    if (englishOnly && locale === "ms-MY") {
      push({ pathname, query }, asPath, { locale: "en-GB", scroll: false });
    }
  }, [englishOnly, locale, asPath, pathname, query, push]);

  if (englishOnly) {
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
