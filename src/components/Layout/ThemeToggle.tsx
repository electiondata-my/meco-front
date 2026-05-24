import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    setTheme(next);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: next } }));
  }

  return (
    <button
      type="button"
      title="theme_toggler"
      className="group flex select-none items-center gap-1.5 rounded-md py-1.5 px-2.5 bg-transparent border border-transparent hover:bg-otl-gray-200 transition outline-none"
      onClick={toggle}
    >
      {/* Moon — visible in light mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        data-state={theme === "light" ? "dark" : "light"}
        className="block shrink-0 group-hover:text-black size-4 text-txt-black-700 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 data-[state=dark]:flex data-[state=light]:hidden"
        aria-hidden="true"
      >
        <path
          d="M17 12.522C16.1125 12.8919 15.1603 13.0817 14.1988 13.0804C10.1784 13.0804 6.91958 9.82157 6.91958 5.80119C6.91958 4.80823 7.11817 3.86231 7.47803 3C6.15169 3.5533 5.01875 4.48672 4.22188 5.68268C3.42502 6.87864 2.99988 8.28366 3 9.72078C3 13.7411 6.25885 17 10.2792 17C11.7163 17.0001 13.1214 16.575 14.3173 15.7781C15.5133 14.9813 16.4467 13.8483 17 12.522Z"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Sun — visible in dark mode */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        data-state={theme === "light" ? "dark" : "light"}
        className="block shrink-0 -m-0.5 size-5 text-txt-black-700 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 group-hover:text-[#FFFFFF] data-[state=light]:flex data-[state=dark]:hidden"
        aria-hidden="true"
      >
        <path
          d="M10 0.75V2.25M16.25 3.75L15.0659 4.93416M19.25 10.0001H17.75M17.25 16.2501L16.0659 15.066M10 17.75V19.25M4.93411 15.0659L3.74997 16.25M2.25 10.0001H0.75M4.93405 4.93423L3.74991 3.75003M15 10C15 12.7614 12.7614 15 10 15C7.23858 15 5 12.7614 5 10C5 7.23858 7.23858 5 10 5C12.7614 5 15 7.23858 15 10Z"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="sr-only">{theme === "light" ? "Dark" : "Light"}</div>
    </button>
  );
}
