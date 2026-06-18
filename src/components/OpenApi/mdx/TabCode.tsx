import { FunctionComponent, useCallback, useRef, useState } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import DocCodeBlock, { type DocLang } from "./DocCodeBlock";
import { useApiKey } from "@hooks/useApiKey";

type Tab = "curl" | "javascript" | "typescript" | "python" | "r" | "go";

interface TabCodeProps {
  curl?: string;
  javascript?: string;
  typescript?: string;
  python?: string;
  r?: string;
  go?: string;
}

const TAB_CONFIG: { key: Tab; label: string; lang: DocLang }[] = [
  { key: "curl", label: "cURL", lang: "bash" },
  { key: "javascript", label: "JavaScript", lang: "javascript" },
  { key: "typescript", label: "TypeScript", lang: "typescript" },
  { key: "python", label: "Python", lang: "python" },
  { key: "r", label: "R", lang: "r" },
  { key: "go", label: "Go", lang: "go" },
];

function useCopyToClipboard(delay = 1500) {
  const [isCopied, setIsCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setIsCopied(false), delay);
    } catch {
      // clipboard not available
    }
  }, [delay]);

  return { copy, isCopied };
}

const TabCode: FunctionComponent<TabCodeProps> = (props) => {
  const availableTabs = TAB_CONFIG.filter(({ key }) => props[key] !== undefined);
  const [active, setActive] = useState<Tab>(availableTabs[0]?.key ?? "curl");
  const { apiKey } = useApiKey();
  const { copy, isCopied } = useCopyToClipboard();

  const substitute = (code: string) =>
    apiKey ? code.replace(/<your-api-key>/g, apiKey) : code;

  const activeConfig = TAB_CONFIG.find(t => t.key === active);
  const activeCode = substitute(props[active] ?? "");

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-otl-gray-200">
      <div className="flex items-center border-b border-otl-gray-200 bg-bg-washed">
        <div className="flex flex-1">
          {availableTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={[
                "px-4 py-2.5 text-body-xs font-medium transition-colors",
                active === key
                  ? "border-b-2 border-txt-danger text-txt-danger"
                  : "text-txt-black-500 hover:text-txt-black-700",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => void copy(activeCode)}
          className="mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-body-xs text-txt-black-400 hover:text-txt-black-700 transition-colors"
        >
          {isCopied
            ? <CheckIcon className="h-3.5 w-3.5 text-green-600" />
            : <DocumentDuplicateIcon className="h-3.5 w-3.5" />}
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
      <DocCodeBlock
        code={activeCode}
        lang={activeConfig?.lang ?? "bash"}
        className="rounded-none border-0"
      />
    </div>
  );
};

export default TabCode;
