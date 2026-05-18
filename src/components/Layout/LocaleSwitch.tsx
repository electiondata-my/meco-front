import { GlobeIcon } from "@govtechmy/myds-react/icon";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@govtechmy/myds-react/select";

// Frozen until Malay translations are complete. Flip to false to re-enable switching.
const LANGUAGE_SWITCH_FROZEN = true;

const ENGLISH_ONLY_PATHS = ["/openapi", "/query-builder", "/signin", "/console"];

function isEnglishOnlyPath(path: string) {
  return ENGLISH_ONLY_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

const languages: Record<"ms-MY" | "en-GB", { full: string; short: string }> = {
  "en-GB": { full: "English", short: "EN" },
  "ms-MY": { full: "Malay", short: "BM" },
};

interface LocaleSwitchProps {
  currentLocale: string;
}

export default function LocaleSwitch({ currentLocale }: LocaleSwitchProps) {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const forceEnglish = LANGUAGE_SWITCH_FROZEN || isEnglishOnlyPath(path);

  function onLanguageChange(lang: string) {
    const currentPath = window.location.pathname;
    const isMsRoute = currentPath.startsWith("/ms-MY");

    if (lang === "ms-MY" && !isMsRoute) {
      window.location.href = "/ms-MY" + currentPath;
    } else if (lang === "en-GB" && isMsRoute) {
      window.location.href = currentPath.slice("/ms-MY".length) || "/";
    }
  }

  if (forceEnglish) {
    return (
      <div className="pointer-events-none opacity-40">
        <Select variant={"outline"} size={"small"} multiple={false} value="en-GB">
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

  const displayLocale = (currentLocale as "en-GB" | "ms-MY") in languages
    ? currentLocale
    : "en-GB";

  return (
    <Select
      variant={"outline"}
      size={"small"}
      multiple={false}
      onValueChange={onLanguageChange}
      defaultValue={displayLocale}
      value={displayLocale}
    >
      <SelectTrigger>
        <GlobeIcon className="hidden lg:block" />
        <SelectValue className="text-txt-black-900">
          {(locale) => languages[locale as "ms-MY" | "en-GB"]?.full}
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
