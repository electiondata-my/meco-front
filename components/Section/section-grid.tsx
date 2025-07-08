import { clx } from "@lib/helpers";

type SectionGrid<T extends React.ElementType> = {
  as?: T;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children">;

const SectionGrid = <T extends React.ElementType = "section">({
  as,
  children,
  className,
  ...rest
}: SectionGrid<T>) => {
  const Component = as || "section";
  return (
    <Component
      className={clx(
        "col-span-full mx-auto flex w-full max-w-screen-xl flex-col items-center justify-center xl:w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default SectionGrid;
