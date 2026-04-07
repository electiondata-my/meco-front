"use client";
import { FunctionComponent, useState } from "react";
import DocCodeBlock, { type DocLang } from "@dashboards/openapi/DocCodeBlock";
import { clx } from "@lib/helpers";
import { useApiKey } from "@dashboards/openapi/ApiKeyContext";

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

/**
 * Tabbed code block for showing the same request in multiple languages.
 *
 * Usage in MDX:
 * <TabCode
 *   curl={`curl -X GET "https://api.electiondata.my/candidates?id=CMVBA" \
 *   -H "Authorization: Bearer <your-api-key>"`}
 *   javascript={`const res = await fetch(...);`}
 *   python={`import requests\n...`}
 *   typescript={`const res = await fetch(...);`}
 *   r={`library(httr2)\n...`}
 *   go={`package main\n...`}
 * />
 */
const TabCode: FunctionComponent<TabCodeProps> = (props) => {
  const availableTabs = TAB_CONFIG.filter(({ key }) => props[key] !== undefined);
  const [active, setActive] = useState<Tab>(availableTabs[0]?.key ?? "curl");
  const { apiKey } = useApiKey();

  const substitute = (code: string) =>
    apiKey ? code.replace(/<your-api-key>/g, apiKey) : code;

  const activeConfig = TAB_CONFIG.find(t => t.key === active);
  const activeCode = props[active] ?? "";

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-otl-gray-200">
      <div className="flex border-b border-otl-gray-200 bg-bg-washed">
        {availableTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={clx(
              "px-4 py-2.5 text-body-xs font-medium transition-colors",
              active === key
                ? "border-b-2 border-txt-danger text-txt-danger"
                : "text-txt-black-500 hover:text-txt-black-700",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <DocCodeBlock
        code={substitute(activeCode)}
        lang={activeConfig?.lang ?? "bash"}
        className="rounded-none border-0"
      />
    </div>
  );
};

export default TabCode;
