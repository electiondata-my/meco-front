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

  const displayLocale =
    (currentLocale as "en-GB" | "ms-MY") in languages ? currentLocale : "en-GB";

  return (
    <div
      className={`relative inline-flex select-none items-center gap-1.5 rounded-md border border-otl-gray-200 bg-bg-white shadow-button py-1.5 px-2.5 text-body-sm text-txt-black-900${forceEnglish ? " pointer-events-none opacity-40" : " hover:bg-bg-white-hover hover:border-otl-gray-300"}`}
    >
      {/* Globe icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        className="hidden lg:block h-4 w-4 shrink-0 pointer-events-none"
        aria-hidden="true"
      >
        <path
          d="M10 17.25C14.0041 17.25 17.25 14.0041 17.25 10C17.25 5.99594 14.0041 2.75 10 2.75M10 17.25C5.99594 17.25 2.75 14.0041 2.75 10C2.75 5.99594 5.99594 2.75 10 2.75M10 17.25C11.2426 17.25 13.25 14.5 13.25 10C13.25 5.5 11.2426 2.75 10 2.75M10 17.25C8.7574 17.25 6.75 14.5 6.75 10C6.75 5.5 8.7574 2.75 10 2.75M2.8 10H17.2"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <select
        value={forceEnglish ? "en-GB" : displayLocale}
        onChange={e => onLanguageChange(e.target.value)}
        disabled={forceEnglish}
        className="appearance-none bg-transparent outline-none cursor-pointer text-txt-black-900"
      >
        {Object.entries(languages).map(([value, label]) => (
          <option key={value} value={value}>
            {label.full}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none h-4 w-4 shrink-0 text-txt-black-500"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
