import { Button, ButtonIcon } from "@govtechmy/myds-react/button";
import { MoonIcon, SunIcon } from "@govtechmy/myds-react/icon";
// import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return (
    <Button
      variant={"primary-ghost"}
      size={"small"}
      title={"theme_toggler"}
      className="group hover:bg-otl-gray-200"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <ButtonIcon>
        <MoonIcon
          data-state={resolvedTheme === "light" ? "dark" : "light"}
          className="text-txt-black-700 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 size-4 group-hover:text-black data-[state=dark]:flex data-[state=light]:hidden"
        />
      </ButtonIcon>
      <ButtonIcon>
        <SunIcon
          data-state={resolvedTheme === "light" ? "dark" : "light"}
          className="text-txt-black-700 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 -m-0.5 size-5 group-hover:text-[#FFFFFF] data-[state=light]:flex data-[state=dark]:hidden"
        />
      </ButtonIcon>
      <div className="sr-only">{theme === "light" ? "Dark" : "Light"}</div>
    </Button>
  );
}
