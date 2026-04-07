import { FunctionComponent, ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { clx } from "@lib/helpers";
import { ALL_PAGES, TocItem } from "./config";
import DocSidebar from "./DocSidebar";
import DocTOC from "./DocTOC";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { ApiKeyProvider } from "./ApiKeyContext";

interface DocLayoutProps {
  breadcrumb: string;
  title: string;
  toc: TocItem[];
  children: ReactNode;
}

const DocLayout: FunctionComponent<DocLayoutProps> = ({
  breadcrumb,
  title,
  toc,
  children,
}) => {
  const router = useRouter();
  const currentPath = router.asPath.split("?")[0];

  const [mobileOpen, setMobileOpen] = useState(false);

  const currentIndex = ALL_PAGES.findIndex(p => p.href === currentPath);
  const prev = currentIndex > 0 ? ALL_PAGES[currentIndex - 1] : null;
  const next =
    currentIndex < ALL_PAGES.length - 1 ? ALL_PAGES[currentIndex + 1] : null;

  return (
    <div className="px-4.5 md:px-6">
    <div className="mx-auto flex w-full max-w-screen-xl min-h-[calc(100vh-4rem)]">
      {/* ── Left sidebar (desktop sticky + mobile drawer) ── */}
      <DocSidebar
        currentPath={currentPath}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1">
        {/* Content column */}
        <main className="min-w-0 flex-1 px-6 pb-24 pt-6 sm:px-8 lg:px-10 xl:px-12">
          {/* Mobile top bar: hamburger + breadcrumb */}
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex items-center gap-1.5 text-body-sm text-txt-black-600 hover:text-txt-black-900"
              aria-label="Open navigation"
            >
              <Bars3Icon className="h-5 w-5" />
              Menu
            </button>
            <span className="text-txt-black-300">/</span>
            <span className="text-body-xs text-txt-black-500">{breadcrumb}</span>
          </div>

          {/* Desktop breadcrumb */}
          <p className="mb-3 hidden text-body-xs font-semibold uppercase tracking-widest text-txt-black-400 lg:block">
            {breadcrumb}
          </p>

          {/* H1 */}
          <h1 className="mb-8 font-poppins text-[1.875rem] font-semibold leading-tight text-txt-black-900 sm:text-[2rem]">
            {title}
          </h1>

          {/* Page body */}
          <ApiKeyProvider>{children}</ApiKeyProvider>

          {/* ── Prev / Next ── */}
          <div
            className={clx(
              "mt-16 flex gap-4 border-t border-otl-gray-200 pt-8",
              prev && next
                ? "justify-between"
                : prev
                  ? "justify-start"
                  : "justify-end",
            )}
          >
            {prev && (
              <Link href={prev.href} className="group flex flex-col gap-0.5">
                <span className="text-body-xs text-txt-black-400">Previous</span>
                <span className="flex items-center gap-1.5 text-body-sm font-medium text-txt-black-700 transition-colors group-hover:text-txt-danger">
                  ← {prev.label}
                </span>
              </Link>
            )}
            {next && (
              <Link
                href={next.href}
                className="group flex flex-col items-end gap-0.5"
              >
                <span className="text-body-xs text-txt-black-400">Next</span>
                <span className="flex items-center gap-1.5 text-body-sm font-medium text-txt-black-700 transition-colors group-hover:text-txt-danger">
                  {next.label} →
                </span>
              </Link>
            )}
          </div>
        </main>

        {/* Right TOC (xl+) */}
        <DocTOC toc={toc} />
      </div>
    </div>
    </div>
  );
};

export default DocLayout;
