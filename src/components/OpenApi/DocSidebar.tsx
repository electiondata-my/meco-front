import { FunctionComponent, useState, useEffect } from "react";
import { Transition } from "@headlessui/react";
import { NAV_SECTIONS } from "@dashboards/openapi/config";
import {
  ChevronDownIcon,
  XMarkIcon,
  ArrowRightEndOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";

function getNavItemIcon(label: string) {
  switch (label) {
    case "Candidates": return UserIcon;
    case "Authentication": return ShieldCheckIcon;
    case "Errors": return ExclamationCircleIcon;
    case "Versioning": return RectangleStackIcon;
    default: return DocumentTextIcon;
  }
}

function clx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface SidebarContentProps {
  currentPath: string;
  onClose?: () => void;
}

const SidebarContent: FunctionComponent<SidebarContentProps> = ({ currentPath, onClose }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_SECTIONS.forEach(section => { initial[section.group] = true; });
    return initial;
  });

  const toggle = (group: string) =>
    setOpenSections(prev => ({ ...prev, [group]: !prev[group] }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <a
          href="/signin"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg border border-otl-danger-200 bg-bg-danger-50 px-3 py-2 text-body-sm font-medium text-txt-danger transition-colors hover:bg-bg-danger-100"
        >
          <ArrowRightEndOnRectangleIcon className="h-4 w-4 shrink-0" />
          API Console
        </a>
        <a
          href="https://t.me/myelectiondata"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="group flex items-center gap-2 rounded-lg border border-otl-gray-200 px-3 py-2 text-body-sm font-medium text-txt-black-700 transition-colors hover:border-otl-danger-200 hover:bg-bg-danger-50 hover:text-txt-danger"
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4 shrink-0 text-txt-black-400 transition-colors group-hover:text-txt-danger" />
          Get help: User group
        </a>
      </div>

      <div className="border-t border-otl-gray-200" />

      <nav className="flex flex-col gap-5">
        {NAV_SECTIONS.map(section => (
          <div key={section.group}>
            <button
              onClick={() => toggle(section.group)}
              className="mb-2 flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-txt-black-400 transition-colors hover:text-txt-black-700"
            >
              {section.group}
              <ChevronDownIcon
                className={clx(
                  "h-4 w-4 transition-transform duration-200",
                  !openSections[section.group] && "-rotate-90",
                )}
              />
            </button>
            {openSections[section.group] && (
              <ul className="space-y-1">
                {section.items.map(item => {
                  const active = currentPath === item.href;
                  const ItemIcon = getNavItemIcon(item.label);
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        onClick={onClose}
                        className={clx(
                          "group flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-body-sm transition-colors",
                          active
                            ? "border-otl-danger-200 bg-bg-danger-50 font-medium text-txt-black-900"
                            : "border-transparent text-txt-black-700 hover:border-otl-gray-200 hover:bg-bg-black-50 hover:text-txt-black-900",
                        )}
                      >
                        <ItemIcon
                          className={clx(
                            "mt-0.5 h-4 w-4 shrink-0 transition-colors",
                            active
                              ? "text-danger-600"
                              : "text-txt-black-300 group-hover:text-txt-black-500",
                          )}
                        />
                        <p className={clx("text-[14px] leading-5", active ? "text-txt-danger" : "text-inherit")}>
                          {item.label}
                        </p>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

interface DocSidebarProps {
  currentPath: string;
}

const DocSidebar: FunctionComponent<DocSidebarProps> = ({ currentPath }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setMobileOpen(true);
    document.addEventListener("open-doc-sidebar", handler);
    return () => document.removeEventListener("open-doc-sidebar", handler);
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 lg:block">
        <div className="sticky top-16 h-[calc(100vh-4rem)] w-60 overflow-y-auto border-r border-otl-gray-200 pb-10 pr-4 pt-6">
          <SidebarContent currentPath={currentPath} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Transition show={mobileOpen} as="div" className="fixed inset-0 z-50 lg:hidden">
        <Transition.Child
          as="div"
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
        <Transition.Child
          as="aside"
          enter="transition-transform duration-300 ease-out"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition-transform duration-300 ease-in"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
          className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-otl-gray-200 bg-bg-white px-3 pb-10 pt-6 shadow-lg sm:px-4"
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-poppins text-body-sm font-semibold text-txt-black-900">ElectionData.MY</span>
              <span className="rounded bg-bg-danger-100 px-1.5 py-0.5 font-mono text-body-2xs font-semibold text-txt-danger">API</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-1 text-txt-black-400 hover:text-txt-black-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <SidebarContent currentPath={currentPath} onClose={() => setMobileOpen(false)} />
        </Transition.Child>
      </Transition>
    </>
  );
};

export default DocSidebar;
