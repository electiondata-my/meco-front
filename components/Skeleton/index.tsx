import { clx } from "@lib/helpers";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clx(
        "relative h-4 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden",
        "after:absolute after:inset-0",
        "after:content-['']",
        "after:-translate-x-full",
        "after:animate-[shimmer_1.2s_infinite]",
        "after:bg-gradient-to-r",
        "from-0% via-50% to-100% from-slate-100 via-slate-200 to-slate-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800/50",
        className
      )}
      {...props}
    />
  );
}

export default Skeleton;
