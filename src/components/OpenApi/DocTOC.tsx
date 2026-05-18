import { FunctionComponent, useEffect, useState } from "react";
import type { TocItem } from "@src/lib/docs";

function clx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const DocTOC: FunctionComponent<{ toc: TocItem[] }> = ({ toc }) => {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    toc.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return <div className="hidden w-56 shrink-0 xl:block" />;

  return (
    <aside className="hidden w-56 shrink-0 xl:block">
      <div className="sticky top-16 overflow-y-auto pl-6 pt-8">
        <h5 className="mb-3 text-body-xs font-semibold uppercase tracking-widest text-txt-black-400">
          On This Page
        </h5>
        <ul className="space-y-2">
          {toc.map(item => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={clx(
                  "block leading-snug transition-colors hover:text-txt-danger",
                  item.level === 3 ? "pl-3 text-body-xs" : "text-body-sm",
                  activeId === item.id ? "font-medium text-txt-danger" : "text-txt-black-500",
                )}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default DocTOC;
