import Container from "@components/Container";
import SectionGrid from "@components/Section/section-grid";
import type { ArticlePrinciple } from "@lib/articles";
import {
  ArrowDownTrayIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { FunctionComponent, ReactNode } from "react";

export const articleSerif = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

interface ArticleLayoutProps {
  title: string;
  children: ReactNode;
}

export const ArticleLayout: FunctionComponent<ArticleLayoutProps> = ({
  title,
  children,
}) => {
  return (
    <Container
      as="article"
      className="bg-bg-white pb-14 pt-16 lg:pb-20 lg:pt-20"
    >
      <SectionGrid>
        <div className="w-full max-w-[640px]">
          <h1
            className="text-center text-[2.25rem] font-normal leading-[1.08] text-txt-black-900 lg:text-[3.125rem]"
            style={articleSerif}
          >
            {title}
          </h1>
        </div>
        {children}
      </SectionGrid>
    </Container>
  );
};

const principleIcons = [ShieldCheckIcon, ArrowDownTrayIcon, ScaleIcon];

interface CorePrinciplesProps {
  principles: ArticlePrinciple[];
  title?: string;
}

export const CorePrinciples: FunctionComponent<CorePrinciplesProps> = ({
  principles,
  title,
}) => {
  if (!principles.length) return null;

  return (
    <div className="mb-8 mt-12 w-full max-w-[860px] lg:mb-10 lg:mt-16">
      {title && (
        <div className="mb-6 max-w-[720px]">
          <h2
            className="text-[2rem] font-normal leading-tight text-txt-black-900"
            style={articleSerif}
          >
            {title}
          </h2>
        </div>
      )}

      <div className="border-y border-otl-gray-300">
        {principles.map((principle, index) => {
          const Icon = principleIcons[index] ?? ShieldCheckIcon;

          return (
            <section
              key={principle.number}
              className="grid gap-4 border-b border-otl-gray-200 py-6 last:border-b-0 md:grid-cols-[112px_1fr]"
            >
              <div className="flex items-center gap-3 md:block">
                <div className="grid size-9 place-items-center rounded-full border border-otl-gray-200 text-txt-danger md:mb-3">
                  <Icon className="size-5" />
                </div>
                <p
                  className="text-txt-black-200 text-[1.75rem] leading-none"
                  style={articleSerif}
                >
                  {principle.number}
                </p>
              </div>
              <div>
                <h3
                  className="text-[1.2rem] font-bold leading-7 text-txt-black-900"
                  style={articleSerif}
                >
                  {principle.title}
                </h3>
                <p
                  className="mt-2 max-w-3xl text-[1.0625rem] leading-8 text-txt-black-700 lg:text-[1.125rem]"
                  style={articleSerif}
                >
                  {principle.description}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

const ArticleBody: FunctionComponent<{ children?: ReactNode }> = ({
  children,
}) => (
  <div
    className="mt-8 w-full max-w-[640px] space-y-5 text-[1.0625rem] leading-8 text-txt-black-700 lg:text-[1.125rem]"
    style={articleSerif}
  >
    {children}
  </div>
);

const P: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <p>{children}</p>
);

const H2: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <h2
    className="pt-7 text-[2rem] font-normal leading-tight text-txt-black-900"
    style={articleSerif}
  >
    {children}
  </h2>
);

const H3: FunctionComponent<{ children?: ReactNode }> = ({ children }) => (
  <h3
    className="pt-4 text-[1.35rem] font-bold leading-8 text-txt-black-900"
    style={articleSerif}
  >
    {children}
  </h3>
);

const A: FunctionComponent<{ href?: string; children?: ReactNode }> = ({
  href = "#",
  children,
}) => {
  const isExternal = href.startsWith("http");
  const className =
    "font-medium text-txt-danger underline decoration-bg-danger-200 underline-offset-4 hover:text-txt-black-900";

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
};

export function getArticleMdxComponents(principles: ArticlePrinciple[] = []) {
  return {
    ArticleBody,
    CorePrinciples: ({ title }: { title?: string }) => (
      <CorePrinciples principles={principles} title={title} />
    ),
    p: P,
    h2: H2,
    h3: H3,
    a: A,
  };
}
