import { FunctionComponent, useEffect, useMemo } from "react";
import { useCopyToClipboard } from "@hooks/useCopyToClipboard";
import { clx } from "@lib/helpers";
import { GithubThemes } from "@components/CodeBlock/theme";
import { useTheme } from "next-themes";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import r from "highlight.js/lib/languages/r";
import go from "highlight.js/lib/languages/go";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("r", r);
hljs.registerLanguage("go", go);

export type DocLang =
  | "bash"
  | "javascript"
  | "json"
  | "python"
  | "typescript"
  | "r"
  | "go";

interface DocCodeBlockProps {
  code: string;
  lang?: DocLang;
  className?: string;
}

const DocCodeBlock: FunctionComponent<DocCodeBlockProps> = ({
  code,
  lang = "bash",
  className,
}) => {
  const { theme = "light" } = useTheme();
  const { copy, isCopied } = useCopyToClipboard(1500);

  useEffect(() => {
    const head = document.head;
    let codeTheme = document.getElementById("code-theme");
    if (!codeTheme) {
      codeTheme = document.createElement("style");
      codeTheme.setAttribute("id", "code-theme");
      head.append(codeTheme);
    }
    codeTheme.innerHTML = GithubThemes[theme as "light" | "dark"];
  }, [theme]);

  const html = useMemo(() => {
    try {
      return hljs.highlight(code.trim(), { language: lang }).value;
    } catch {
      return code.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [code, lang]);

  return (
    <div
      className={clx(
        "group relative overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-washed",
        className,
      )}
    >
      <button
        onClick={() => copy(code.trim())}
        aria-label="Copy code"
        className="text-txt-black-400 absolute right-3 top-3 flex items-center gap-1 rounded-md border border-otl-gray-200 bg-bg-white px-2 py-1 text-body-xs opacity-0 transition-opacity hover:text-txt-black-700 group-hover:opacity-100"
      >
        {isCopied ? (
          <>
            <CheckIcon className="text-green-600 h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <DocumentDuplicateIcon className="h-3.5 w-3.5" />
            Copy
          </>
        )}
      </button>
      <div className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code
          className="whitespace-pre font-mono"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
};

export default DocCodeBlock;
