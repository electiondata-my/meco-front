import { ComponentProps, FunctionComponent, MouseEventHandler, ReactNode } from "react";
import { clx } from "@lib/helpers";

interface ButtonProps extends ComponentProps<"button"> {
  className?: string;
  type?: "button" | "reset" | "submit";
  variant?: keyof typeof style;
  onClick?: MouseEventHandler<HTMLButtonElement> | (() => void);
  children?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

const style = {
  base: "flex select-none items-center gap-1.5 rounded-md text-start text-sm font-medium outline-none transition disabled:opacity-50 px-3 py-1.5",
  reset: "",
  default:
    "border border-slate-200 dark:border-zinc-800 hover:border-slate-400 hover:dark:border-zinc-700 active:bg-slate-100 hover:dark:bg-zinc-800/50 active:dark:bg-zinc-800 bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white",
  primary:
    "from-primary to-primary-dark shadow-button bg-gradient-to-t text-white hover:to-[#5B8EFF]",
  ghost:
    "hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
};

const Button: FunctionComponent<ButtonProps> = ({
  className,
  icon,
  type = "button",
  variant = "base",
  onClick,
  children,
  disabled = false,
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={clx(variant !== "reset" && style.base, style[variant], className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};

export default Button;
