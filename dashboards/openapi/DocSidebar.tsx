import { FunctionComponent, useState } from "react";
import Link from "next/link";
import { Transition } from "@headlessui/react";
import { clx } from "@lib/helpers";
import { NAV_SECTIONS } from "./config";
import {
  ChevronDownIcon,
  XMarkIcon,
  ArrowRightEndOnRectangleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

interface SidebarContentProps {
  currentPath: string;
  onClose?: () => void;
}

const SidebarContent: FunctionComponent<SidebarContentProps> = ({
  currentPath,
  onClose,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      NAV_SECTIONS.forEach(section => {
        // Default open if the section contains the current path, otherwise open all
        initial[section.group] = true;
      });
      return initial;
    },
  );

  const toggle = (group: string) =>
    setOpenSections(prev => ({ ...prev, [group]: !prev[group] }));

  return (
    <div className="flex flex-col gap-5">
      {/* ── Action buttons ── */}
      <div className="flex flex-col gap-2">
        <Link
          href="/console"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg border border-otl-gray-200 px-3 py-2 text-body-sm font-medium text-txt-black-700 transition-colors hover:bg-bg-black-50"
        >
          <ArrowRightEndOnRectangleIcon className="h-4 w-4 shrink-0 text-txt-black-400" />
          API Console
        </Link>
        <Link
          href="/signin"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg border border-otl-danger-200 bg-bg-danger-50 px-3 py-2 text-body-sm font-medium text-txt-danger transition-colors hover:bg-bg-danger-100"
        >
          <KeyIcon className="h-4 w-4 shrink-0" />
          Get a Token
        </Link>
      </div>

      <div className="border-t border-otl-gray-200" />

      {/* ── Nav sections as dropdowns ── */}
      <nav className="flex flex-col gap-6">
        {NAV_SECTIONS.map(section => (
          <div key={section.group}>
            {/* Section toggle */}
            <button
              onClick={() => toggle(section.group)}
              className="mb-1.5 flex w-full items-center justify-between py-1 text-body-sm font-semibold text-txt-black-700 transition-colors hover:text-txt-black-900"
            >
              {section.group}
              <ChevronDownIcon
                className={clx(
                  "h-4 w-4 transition-transform duration-200",
                  openSections[section.group] ? "" : "-rotate-90",
                )}
              />
            </button>

            {/* Items */}
            {openSections[section.group] && (
              <ul className="space-y-0.5">
                {section.items.map(item => {
                  const active = currentPath === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={clx(
                          "flex w-full items-center border-l-2 py-1.5 pr-3 text-body-sm transition-colors",
                          active
                            ? "border-txt-danger bg-bg-danger-50 pl-2 font-medium text-txt-danger"
                            : "border-transparent pl-2 text-txt-black-600 hover:bg-bg-black-50 hover:text-txt-black-900",
                        )}
                      >
                        {item.label}
                      </Link>
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
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const DocSidebar: FunctionComponent<DocSidebarProps> = ({
  currentPath,
  mobileOpen,
  onMobileClose,
}) => {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-16 h-[calc(100vh-4rem)] w-60 overflow-y-auto border-r border-otl-gray-200 pb-10 pr-4 pt-6">
          <SidebarContent currentPath={currentPath} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Transition show={mobileOpen} as="div" className="fixed inset-0 z-50 lg:hidden">
        {/* Backdrop */}
        <Transition.Child
          as="div"
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="absolute inset-0 bg-black/40"
          onClick={onMobileClose}
        />
        {/* Drawer panel */}
        <Transition.Child
          as="aside"
          enter="transition-transform duration-300 ease-out"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition-transform duration-300 ease-in"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
          className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-otl-gray-200 bg-bg-white px-4 pb-10 pt-6 shadow-lg"
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-poppins text-body-sm font-semibold text-txt-black-900">
                ElectionData.MY
              </span>
              <span className="rounded bg-bg-danger-100 px-1.5 py-0.5 font-mono text-body-2xs font-semibold text-txt-danger">
                API
              </span>
            </div>
            <button
              onClick={onMobileClose}
              className="rounded-md p-1 text-txt-black-400 hover:text-txt-black-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <SidebarContent currentPath={currentPath} onClose={onMobileClose} />
        </Transition.Child>
      </Transition>
    </>
  );
};

export default DocSidebar;
