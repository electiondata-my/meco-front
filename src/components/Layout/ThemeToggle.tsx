import { Button, ButtonIcon } from "@govtechmy/myds-react/button";
import { MoonIcon, SunIcon } from "@govtechmy/myds-react/icon";
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
    <Button
      variant={"primary-ghost"}
      size={"small"}
      title={"theme_toggler"}
      className="group hover:bg-otl-gray-200"
      onClick={toggle}
    >
      <ButtonIcon>
        <MoonIcon
          data-state={theme === "light" ? "dark" : "light"}
          className="group-hover:text-black size-4 text-txt-black-700 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 data-[state=dark]:flex data-[state=light]:hidden"
        />
      </ButtonIcon>
      <ButtonIcon>
        <SunIcon
          data-state={theme === "light" ? "dark" : "light"}
          className="-m-0.5 size-5 text-txt-black-700 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 group-hover:text-[#FFFFFF] data-[state=light]:flex data-[state=dark]:hidden"
        />
      </ButtonIcon>
      <div className="sr-only">{theme === "light" ? "Dark" : "Light"}</div>
    </Button>
  );
}
