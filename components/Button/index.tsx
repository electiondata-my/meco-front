import {
  ComponentProps,
  FunctionComponent,
  MouseEventHandler,
  ReactNode,
} from "react";
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
    "border hover:border-otl-gray-400 active:bg-bg-black-100 bg-bg-white text-txt-black-900",
  primary:
    "bg-gradient-to-t from-bg-primary-600 to-bg-primary-700 shadow-button text-white hover:to-bg-primary-600",
  ghost: "hover:bg-bg-black-100 text-txt-black-500 hover:text-txt-black-900",
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
      className={clx(
        variant !== "reset" && style.base,
        style[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};

export default Button;
