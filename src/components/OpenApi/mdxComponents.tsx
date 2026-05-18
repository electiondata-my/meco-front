import { FunctionComponent, ReactNode } from "react";
import { slugify } from "@src/lib/docs";
import DocCodeBlock from "./mdx/DocCodeBlock";
import Callout from "./mdx/Callout";
import EndpointBadge from "./mdx/EndpointBadge";
import EndpointCard from "./mdx/EndpointCard";
import FieldTable from "./mdx/FieldTable";
import GrayList from "./mdx/GrayList";
import ParamTable from "./mdx/ParamTable";
import StatusTable from "./mdx/StatusTable";
// TabCode, TokenInput, CandidatesApiTester are client:only islands —
// overridden per page with Astro wrapper components; not in this map.

function extractText(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object") {
    const n = node as Record<string, unknown>;
    const props = n.props as Record<string, unknown> | undefined;
    // Astro JSX text nodes: { type: {}, props: { value: "text", hydrate: bool } }
    if (typeof props?.value === "string") return props.value;
    // Standard React elements
    if (props?.children !== undefined) return extractText(props.children);
  }
  return "";
}

const H2: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <h2
    id={slugify(extractText(children))}
    className="scroll-mt-24 mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900 first:mt-0"
  >
    {children}
  </h2>
);

const H3: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <h3
    id={slugify(extractText(children))}
    className="scroll-mt-24 mb-3 mt-8 font-poppins text-base font-semibold text-txt-black-900"
  >
    {children}
  </h3>
);

const P: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">{children}</p>
);

const Strong: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <strong className="font-semibold text-txt-black-900">{children}</strong>
);

const Em: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <em className="italic">{children}</em>
);

const InlineCode: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
    {children}
  </code>
);

// Code fences — syntax-highlighted at build time with hljs
const Pre: FunctionComponent<{
  children?: React.ReactElement<{ className?: string; children?: string }>;
}> = ({ children }) => {
  const lang = (children?.props?.className as string | undefined)?.replace("language-", "") || "bash";
  const code = String(children?.props?.children ?? "").trimEnd();
  return <DocCodeBlock code={code} lang={lang} className="my-4" />;
};

const A: FunctionComponent<{ href?: string; children?: ReactNode }> = ({ href = "#", children }) => {
  const cls = "text-txt-danger underline underline-offset-2 hover:opacity-80 transition-opacity";
  const isExternal = href.startsWith("http");
  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
  ) : (
    <a href={href} className={cls}>{children}</a>
  );
};

function liContent(child: ReactNode): ReactNode {
  if (React.isValidElement(child) && child.type === "li") {
    return (child as React.ReactElement<{ children?: ReactNode }>).props.children;
  }
  return null;
}

import React from "react";

const Ul: FunctionComponent<{ children?: ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children).map(liContent).filter(Boolean);
  return (
    <ul className="my-4 space-y-2 pl-4 text-body-sm text-txt-black-700">
      {items.map((content, i) => (
        <li key={i} className="flex items-start gap-3 leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-txt-danger" />
          <span>{content}</span>
        </li>
      ))}
    </ul>
  );
};

const Ol: FunctionComponent<{ children?: ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children).map(liContent).filter(Boolean);
  return (
    <ol className="my-4 space-y-3 pl-4 text-body-sm text-txt-black-700">
      {items.map((content, i) => (
        <li key={i} className="flex items-start gap-3 leading-relaxed">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-danger-100 font-mono text-body-2xs font-semibold text-txt-danger">
            {i + 1}
          </span>
          <span>{content}</span>
        </li>
      ))}
    </ol>
  );
};

export const mdxComponents = {
  h2: H2,
  h3: H3,
  p: P,
  strong: Strong,
  em: Em,
  code: InlineCode,
  pre: Pre,
  a: A,
  ul: Ul,
  ol: Ol,
  Callout,
  EndpointBadge,
  EndpointCard,
  FieldTable,
  GrayList,
  ParamTable,
  StatusTable,
  // TabCode, TokenInput, CandidatesApiTester/ApiTester — injected as islands by each page
};
