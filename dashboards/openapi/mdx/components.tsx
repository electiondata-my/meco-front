import React, { FunctionComponent, ReactNode } from "react";
import Link from "next/link";
import DocCodeBlock from "@dashboards/openapi/DocCodeBlock";
import type { DocLang } from "@dashboards/openapi/DocCodeBlock";
import { slugify, textContent } from "@lib/docs-utils";
import Callout from "./Callout";
import EndpointBadge from "./EndpointBadge";
import EndpointCard from "./EndpointCard";
import FieldTable from "./FieldTable";
import GrayList from "./GrayList";
import ParamTable from "./ParamTable";
import StatusTable from "./StatusTable";
import TabCode from "./TabCode";
import TokenInput from "./TokenInput";
import DocApiTester from "@dashboards/openapi/DocApiTester";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract children content from a native <li> React element. */
function liContent(child: ReactNode): ReactNode {
  if (React.isValidElement(child) && child.type === "li") {
    return (child as React.ReactElement<{ children?: ReactNode }>).props
      .children;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Heading overrides — IDs auto-derived from text so TOC anchors always match
// ---------------------------------------------------------------------------

const H2: FunctionComponent<{ children?: ReactNode }> = ({ children }) => {
  const id = slugify(textContent(children));
  return (
    <h2
      id={id}
      className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900 first:mt-0"
    >
      {children}
    </h2>
  );
};

const H3: FunctionComponent<{ children?: ReactNode }> = ({ children }) => {
  const id = slugify(textContent(children));
  return (
    <h3
      id={id}
      className="mb-3 mt-8 font-poppins text-base font-semibold text-txt-black-900"
    >
      {children}
    </h3>
  );
};

// ---------------------------------------------------------------------------
// Prose overrides
// ---------------------------------------------------------------------------

const P: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
    {children}
  </p>
);

const Strong: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <strong className="font-semibold text-txt-black-900">{children}</strong>
);

const Em: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <em className="italic">{children}</em>
);

/** Inline code — backtick spans in prose. */
const InlineCode: FunctionComponent<{ children?: ReactNode }> = ({
  children,
}) => (
  <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
    {children}
  </code>
);

/** Code fence — rendered via DocCodeBlock (syntax highlighted + copyable). */
const Pre: FunctionComponent<{ children?: React.ReactElement }> = ({
  children,
}) => {
  const lang =
    (children?.props?.className as string | undefined)?.replace(
      "language-",
      "",
    ) || "bash";
  const code = String(children?.props?.children ?? "").trimEnd();
  return <DocCodeBlock code={code} lang={lang as DocLang} className="my-4" />;
};

/** Links — internal paths use Next.js Link; external open in new tab. */
const A: FunctionComponent<{ href?: string; children?: ReactNode }> = ({
  href = "#",
  children,
}) => {
  const isExternal = href.startsWith("http");
  const cls =
    "text-txt-danger underline underline-offset-2 hover:opacity-80 transition-opacity";

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
};

// ---------------------------------------------------------------------------
// List overrides
// `li` is intentionally NOT in the component map so `ul`/`ol` can receive
// native <li> elements and wrap them with their own bullet/number markers.
// ---------------------------------------------------------------------------

/** Unordered list — red/danger bullet dots (use for requirements, warnings). */
const Ul: FunctionComponent<{ children?: ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children)
    .map(liContent)
    .filter(Boolean);

  return (
    <ul className="my-4 space-y-2 text-body-sm text-txt-black-700">
      {items.map((content, i) => (
        <li key={i} className="flex items-start gap-3 leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-txt-danger" />
          <span>{content}</span>
        </li>
      ))}
    </ul>
  );
};

/** Ordered list — numbered circles with danger accent colour. */
const Ol: FunctionComponent<{ children?: ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children)
    .map(liContent)
    .filter(Boolean);

  return (
    <ol className="my-4 space-y-3 text-body-sm text-txt-black-700">
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

// ---------------------------------------------------------------------------
// Export component map
// ---------------------------------------------------------------------------

export const mdxComponents = {
  // HTML element overrides
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

  // Custom MDX components — available globally in all doc pages
  Callout,
  EndpointBadge,
  EndpointCard,
  FieldTable,
  GrayList,
  ParamTable,
  StatusTable,
  TabCode,
  TokenInput,
  ApiTester: DocApiTester,
};
