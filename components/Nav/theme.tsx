import Button from "@components/Button";
import { Transition } from "@headlessui/react";
import MoonIcon from "@heroicons/react/20/solid/MoonIcon";
import SunIcon from "@heroicons/react/20/solid/SunIcon";
import { useTheme } from "next-themes";

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <>
      <Button
        className="btn hover:bg-slate-100 dark:hover:bg-zinc-800 group relative p-2"
        onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      >
        <Transition
          show={resolvedTheme === "light"}
          enter="delay-200 transition ease-out duration-150"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="duration-150"
          leaveFrom="absolute opacity-100 translate-y-0"
          leaveTo="absolute opacity-0 translate-y-1"
        >
          <MoonIcon className="text-zinc-500 h-4 w-4 group-hover:text-zinc-900" />
        </Transition>
        <Transition
          show={resolvedTheme !== "light"}
          enter="delay-200 transition ease-out duration-150"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="duration-150"
          leaveFrom="absolute opacity-100 translate-y-0"
          leaveTo="absolute opacity-0 translate-y-1"
        >
          <SunIcon className="text-zinc-500 -m-0.5 h-5 w-5 dark:group-hover:text-white" />
        </Transition>
      </Button>
    </>
  );
};

export default ThemeToggle;
