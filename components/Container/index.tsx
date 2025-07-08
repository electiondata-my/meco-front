import { clx } from "@lib/helpers";
import React from "react";

type ContainerProps<T extends React.ElementType> = {
  as?: T;
  children?: React.ReactNode;
  background?: string;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children">;

const Container = <T extends React.ElementType = "section">({
  as,
  children,
  background,
  className,
  ...rest
}: ContainerProps<T>) => {
  const Component = as || "div";
  return (
    <Component
      className={clx(
        "mx-auto grid h-full w-full grid-cols-4 gap-4.5 px-4.5 md:grid-cols-8 md:gap-6 md:px-6 lg:grid-cols-12",
        background,
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Container;
