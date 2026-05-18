import { FunctionComponent } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import r from "highlight.js/lib/languages/r";
import go from "highlight.js/lib/languages/go";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("python", python);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("r", r);
hljs.registerLanguage("go", go);

export type DocLang = "bash" | "javascript" | "json" | "python" | "typescript" | "r" | "go";

interface DocCodeBlockProps {
  code: string;
  lang?: DocLang | string;
  className?: string;
}

const DocCodeBlock: FunctionComponent<DocCodeBlockProps> = ({ code, lang = "bash", className = "" }) => {
  let html = code.trim();
  try {
    html = hljs.highlight(code.trim(), { language: lang, ignoreIllegals: true }).value;
  } catch {
    html = code.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return (
    <div
      className={`doc-code-block group relative overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-washed ${className}`}
      data-copy={code.trim()}
    >
      <div className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code
          className="hljs whitespace-pre font-mono"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
};

export default DocCodeBlock;
