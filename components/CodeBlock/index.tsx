import Dropdown from "@components/Dropdown";
import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import { useCopyToClipboard } from "@hooks/useCopyToClipboard";
import { GithubThemes } from "./theme";
import {
  DocumentDuplicateIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import swift from "highlight.js/lib/languages/swift";
import dart from "highlight.js/lib/languages/dart";
import kotlin from "highlight.js/lib/languages/kotlin";
import java from "highlight.js/lib/languages/java";
import html_xml from "highlight.js/lib/languages/xml";
import r from "highlight.js/lib/languages/r";
import julia from "highlight.js/lib/languages/julia";
import { useTheme } from "next-themes";
import { FunctionComponent, useEffect, useMemo, useState } from "react";

const LANGUAGE_OPTIONS = [
  {
    label: "Python",
    value: "python",
  },
  {
    label: "JavaScript",
    value: "javascript",
  },
  {
    label: "HTML",
    value: "html",
  },
  {
    label: "Swift",
    value: "swift",
  },
  {
    label: "Dart",
    value: "dart",
  },
  {
    label: "Kotlin",
    value: "kotlin",
  },
  {
    label: "Java",
    value: "java",
  },
  {
    label: "R",
    value: "r",
  },
  {
    label: "Julia",
    value: "julia",
  },
] as const;

export type Language = (typeof LANGUAGE_OPTIONS)[number]["value"];

interface CodeBlockProps {
  children: Partial<Record<Language, string>>;
  hidden?: boolean;
  event?: Record<string, any>;
  "data-testid"?: string;
}

const CodeBlock: FunctionComponent<CodeBlockProps> = ({
  children,
  hidden,
  event,
  ...props
}) => {
  const { t } = useTranslation();
  const { theme = "light" } = useTheme();
  hljs.registerLanguage("python", python);
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("swift", swift);
  hljs.registerLanguage("dart", dart);
  hljs.registerLanguage("kotlin", kotlin);
  hljs.registerLanguage("java", java);
  hljs.registerLanguage("html", html_xml);
  hljs.registerLanguage("r", r);
  hljs.registerLanguage("julia", julia);

  const languageOptions = LANGUAGE_OPTIONS.filter(({ value }) => {
    return Object.keys(children).includes(value);
  });

  const [language, setLanguage] = useState<(typeof LANGUAGE_OPTIONS)[number]>(
    languageOptions[0],
  );
  const { copy, isCopied } = useCopyToClipboard(1000);

  useEffect(() => {
    const head = document.head;
    let code_theme = document.getElementById("code-theme");
    if (code_theme === null) {
      code_theme = document.createElement("style");
      code_theme.setAttribute("id", "code-theme");
    }

    code_theme.innerHTML = GithubThemes[theme as "light" | "dark"];
    head.append(code_theme);
  }, [theme]);

  const html = useMemo<string>(
    () =>
      hljs.highlight(children[language.value] ?? "", {
        language: language.value,
      }).value,
    [language, children],
  );

  const handleCopy = () => {
    copy(children[language.value] ?? "");
  };
  return (
    <div className="h-fit rounded-xl border bg-bg-washed">
      <div className="flex justify-between border-b border-otl-gray-300 border-opacity-20 p-1">
        <Dropdown
          className={clx(hidden ? "invisible" : "visible", "w-fit")}
          sublabel={<GlobeAltIcon className="mr-2 h-4 w-4" />}
          options={languageOptions}
          selected={language}
          onChange={(e) => setLanguage(e)}
          width="w-min"
        />
        <button
          className="hover:bg-washed/10 flex items-center gap-1 px-3 py-1.5 text-txt-black-500"
          onClick={handleCopy}
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
          {t(isCopied ? "copied" : "copy", { ns: "common" })}
        </button>
      </div>
      <div className="p-3 text-xs">
        <code
          className="whitespace-pre-wrap break-all"
          dangerouslySetInnerHTML={{
            __html: html,
          }}
          {...props}
        />
      </div>
    </div>
  );
};

export default CodeBlock;
