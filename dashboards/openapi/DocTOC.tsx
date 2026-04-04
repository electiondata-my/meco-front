import { FunctionComponent, useEffect, useState } from "react";
import { clx } from "@lib/helpers";
import { TocItem } from "./config";

interface DocTOCProps {
  toc: TocItem[];
}

const DocTOC: FunctionComponent<DocTOCProps> = ({ toc }) => {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (toc.length === 0) return;

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      // Find the topmost intersecting heading
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length > 0) {
        // Pick the one closest to the top
        visible.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        );
        setActiveId(visible[0].target.id);
      }
    };

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "-80px 0px -60% 0px",
      threshold: 0,
    });

    toc.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) {
    return <div className="hidden w-48 shrink-0 xl:block" />;
  }

  return (
    <aside className="hidden w-48 shrink-0 xl:block">
      <div className="sticky top-16 overflow-y-auto pt-8 pl-6">
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
                  activeId === item.id
                    ? "font-medium text-txt-danger"
                    : "text-txt-black-500",
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
