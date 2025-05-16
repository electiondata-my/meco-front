import { FunctionComponent, ReactNode } from "react";
import { clx } from "@lib/helpers";

interface CardProps {
  left: ReactNode;
  right: ReactNode;
  leftBg?: string;
  rightBg?: string;
}

/**
 * Left = description
 * Right = interactive area
 * @param left
 * @param right
 * @returns
 */

const LeftRightCard: FunctionComponent<CardProps> = ({
  left,
  right,
  leftBg = "bg-slate-50 dark:bg-zinc-800",
  rightBg = "bg-white dark:bg-zinc-900",
}) => {
  return (
    <>
      <div className="border-slate-200 dark:border-zinc-800 flex flex-col items-stretch overflow-visible rounded-xl border lg:flex-row">
        <div
          className={clx(
            "border-slate-200 dark:border-zinc-800 w-full overflow-visible lg:w-1/3 lg:border-r max-lg:rounded-xl lg:rounded-l-xl",
            leftBg
          )}
        >
          {left}
        </div>
        <div className={clx("w-full rounded-b-xl lg:w-2/3 lg:rounded-r-xl", rightBg)}>{right}</div>
      </div>
    </>
  );
};

export default LeftRightCard;
