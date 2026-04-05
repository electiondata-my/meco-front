"use client";
import { FunctionComponent, useState } from "react";
import DocCodeBlock from "@dashboards/openapi/DocCodeBlock";
import { clx } from "@lib/helpers";

type Tab = "curl" | "javascript";

interface TabCodeProps {
  curl: string;
  javascript: string;
}

/**
 * Tabbed code block for showing the same request in multiple languages.
 *
 * Usage in MDX:
 * <TabCode
 *   curl={`curl -X GET "https://api.electiondata.my/candidates?id=YQJ5S" \
 *   -H "Authorization: Bearer <your-api-key>"`}
 *   javascript={`const res = await fetch(...);`}
 * />
 */
const TabCode: FunctionComponent<TabCodeProps> = ({ curl, javascript }) => {
  const [active, setActive] = useState<Tab>("curl");

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-otl-gray-200">
      <div className="flex border-b border-otl-gray-200 bg-bg-washed">
        {(["curl", "javascript"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={clx(
              "px-4 py-2.5 text-body-xs font-medium transition-colors",
              active === tab
                ? "border-b-2 border-txt-danger text-txt-danger"
                : "text-txt-black-500 hover:text-txt-black-700",
            )}
          >
            {tab === "curl" ? "cURL" : "JavaScript"}
          </button>
        ))}
      </div>
      {active === "curl" ? (
        <DocCodeBlock
          code={curl}
          lang="bash"
          className="rounded-none border-0"
        />
      ) : (
        <DocCodeBlock
          code={javascript}
          lang="javascript"
          className="rounded-none border-0"
        />
      )}
    </div>
  );
};

export default TabCode;
