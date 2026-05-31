import { ArrowDownTrayIcon, ScaleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { createElement, type ReactElement, type ReactNode, type SVGProps } from 'react';

export type Principle = {
  number: string;
  icon: string;
  title: string;
  description: string;
};

const articleSerif = { fontFamily: 'Georgia, "Times New Roman", serif' };

type IconComp = (props: SVGProps<SVGSVGElement>) => ReactElement;

const principleIcons: Record<string, IconComp> = {
  'arrow-down-tray': ArrowDownTrayIcon as IconComp,
  scale: ScaleIcon as IconComp,
  'shield-check': ShieldCheckIcon as IconComp,
};

export function CorePrinciples({ principles, title }: { principles: Principle[]; title?: string }) {
  if (!principles.length) return null;
  return (
    <div className="mb-8 mt-12 w-full max-w-[860px] lg:mb-10 lg:mt-16">
      {title && (
        <div className="mb-6 max-w-[720px]">
          <h2 className="text-[2rem] font-normal leading-tight text-txt-black-900" style={articleSerif}>
            {title}
          </h2>
        </div>
      )}
      <div className="border-y border-otl-gray-300">
        {principles.map((p) => {
          const Icon = principleIcons[p.icon];
          return (
            <section
              key={p.number}
              className="grid gap-4 border-b border-otl-gray-200 py-6 last:border-b-0 md:grid-cols-[112px_1fr]"
            >
              <div className="flex items-center gap-3 md:block">
                <div className="grid size-9 place-items-center rounded-full border border-otl-gray-200 text-txt-danger md:mb-3">
                  {Icon && <Icon className="size-5" />}
                </div>
                <p className="text-[1.75rem] leading-none text-txt-black-200" style={articleSerif}>
                  {p.number}
                </p>
              </div>
              <div>
                <h3 className="text-[1.2rem] font-bold leading-7 text-txt-black-900" style={articleSerif}>
                  {p.title}
                </h3>
                <p
                  className="mt-2 max-w-3xl text-[1.0625rem] leading-8 text-txt-black-700 lg:text-[1.125rem]"
                  style={articleSerif}
                >
                  {p.description}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function ArticleBody({ children }: { children?: ReactNode }) {
  return (
    <div
      className="mt-8 w-full max-w-[640px] space-y-5 text-[1.0625rem] leading-8 text-txt-black-700 lg:text-[1.125rem]"
      style={articleSerif}
    >
      {children}
    </div>
  );
}

function P({ children }: { children?: ReactNode }) {
  return <p>{children}</p>;
}

function H2({ children }: { children?: ReactNode }) {
  return (
    <h2
      className="pt-7 text-[2rem] font-normal leading-tight text-txt-black-900 first:pt-0"
      style={articleSerif}
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children?: ReactNode }) {
  return (
    <h3 className="pt-4 text-[1.35rem] font-bold leading-8 text-txt-black-900" style={articleSerif}>
      {children}
    </h3>
  );
}

function A({ href = '#', children }: { href?: string; children?: ReactNode }) {
  const cls =
    'font-medium text-txt-danger underline decoration-bg-danger-200 underline-offset-4 hover:text-txt-black-900';
  if (href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}

export function makeArticleComponents(principles: Principle[] = []) {
  return {
    ArticleBody,
    CorePrinciples: ({ title }: { title?: string }) =>
      createElement(CorePrinciples, { principles, title }),
    p: P,
    h2: H2,
    h3: H3,
    a: A,
  };
}
