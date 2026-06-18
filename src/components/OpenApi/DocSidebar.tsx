import { FunctionComponent, useState, useEffect } from "react";
import { Transition } from "@headlessui/react";
import { NAV_SECTIONS } from "@tools/openapi/config";
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
  BoltIcon,
  ClipboardDocumentCheckIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";

function SeatsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 33" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g clipPath="url(#sidebar-seats-clip)">
        <path d="M1.08445 18.5478C0.846584 18.2591 -0.480895 15.9854 0.185061 15.3028C0.851017 14.6201 3.49969 16.4437 3.95074 16.5633C4.4018 16.6828 4.85286 16.8622 6.21584 17.0894C7.57881 17.3166 10.369 17.8422 11.4309 21.3C11.732 22.2805 11.4446 23.4809 12.343 24.1164C12.6665 24.3452 14.9059 27.1383 14.6001 27.3612C11.9758 29.2738 2.32971 26.3665 1.93795 21.0069C1.8921 20.3797 1.47145 19.0175 1.08445 18.5478Z" fill="currentColor"/>
        <path d="M16.043 27.397C18.4575 29.3838 11.4936 28.1231 11.8795 28.6241C12.2035 29.2204 15.1542 29.8238 16.0916 29.9546C17.0888 30.0937 19.9545 29.1046 20.1099 28.7291C20.5414 27.6867 28.2255 27.9977 26.3953 26.1959C25.8443 25.6535 25.1429 24.3067 25.3886 23.909C25.5989 23.5687 24.2583 22.586 24.0502 22.0963C23.6422 21.136 32.6054 20.7098 31.3183 19.7487C30.8784 19.4202 29.7198 19.4379 29.6375 19.3739C29.0971 18.9539 32.3531 18.4341 31.8001 18.0397C30.4542 17.0798 25.513 17.685 23.0924 16.9759C22.8956 16.9182 21.8308 15.8774 21.5149 16.0874C21.3327 16.2084 19.5243 19.4135 20.261 19.9835C20.5954 20.2423 20.7843 20.5242 20.8292 20.8422C20.8741 21.1603 19.4764 21.8546 19.0569 21.9238C17.3823 22.2002 19.488 24.1826 18.5336 24.847C17.6418 25.4679 14.5004 26.1277 16.043 27.397Z" fill="currentColor"/>
        <path d="M21.2421 7.55641C21.2421 11.2119 15.5304 16.3241 15.5304 16.3241C15.5304 16.3241 9.81873 11.2119 9.81873 7.55641C9.81873 4.35787 12.5021 1.84473 15.5304 1.84473C18.5587 1.84473 21.2421 4.35787 21.2421 7.55641Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <ellipse cx="15.5304" cy="7.54564" rx="1.76146" ry="1.76146" fill="currentColor"/>
      </g>
      <defs><clipPath id="sidebar-seats-clip"><rect width="32" height="32" fill="white" transform="translate(0 0.324097)"/></clipPath></defs>
    </svg>
  );
}

function getNavItemIcon(label: string) {
  switch (label) {
    case "Candidates": return UserIcon;
    case "Results": return DocumentTextIcon;
    case "By-Elections": return BoltIcon;
    case "Elections": return ClipboardDocumentCheckIcon;
    case "Parties": return FlagIcon;
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
                  const active = !item.disabled && currentPath === item.href;
                  const isSeats = item.label.startsWith("Seats");
                  const ItemIcon = isSeats ? null : getNavItemIcon(item.label);
                  const itemKey = item.href + item.label;

                  if (item.disabled) {
                    return (
                      <li key={itemKey}>
                        <span className="flex w-full cursor-not-allowed items-start gap-2 rounded-xl border border-transparent px-3 py-2 text-body-sm opacity-40">
                          {isSeats
                            ? <SeatsIcon className="mt-0.5 h-4 w-4 shrink-0 text-txt-black-300" />
                            : ItemIcon && <ItemIcon className="mt-0.5 h-4 w-4 shrink-0 text-txt-black-300" />
                          }
                          <p className="text-[14px] leading-5 text-txt-black-500">{item.label}</p>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={itemKey}>
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
                        {isSeats
                          ? <SeatsIcon className={clx("mt-0.5 h-4 w-4 shrink-0 transition-colors", active ? "text-danger-600" : "text-txt-black-300 group-hover:text-txt-black-500")} />
                          : ItemIcon && <ItemIcon className={clx("mt-0.5 h-4 w-4 shrink-0 transition-colors", active ? "text-danger-600" : "text-txt-black-300 group-hover:text-txt-black-500")} />
                        }
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
