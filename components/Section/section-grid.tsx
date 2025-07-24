import { clx } from "@lib/helpers";
import { ForwardedRef, forwardRef, FunctionComponent } from "react";

type SectionGridProps = {
  className?: string;
  children?: React.ReactNode;
  ref?: ForwardedRef<HTMLElement> | undefined;
};

const SectionGrid: FunctionComponent<SectionGridProps> = forwardRef<
  HTMLElement,
  SectionGridProps
>(({ children, className, ...rest }, ref) => {
  return (
    <section
      ref={ref}
      className={clx(
        "col-span-full mx-auto flex w-full max-w-screen-xl flex-col items-center justify-center xl:w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
});

SectionGrid.displayName = "SectionGrid";

export default SectionGrid;
