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
      <div className="flex flex-col items-stretch overflow-visible rounded-xl border border-otl-gray-200 lg:flex-row">
        <div
          className={clx(
            "w-full overflow-visible border-otl-gray-200 max-lg:rounded-xl lg:w-1/3 lg:rounded-l-xl lg:border-r",
            leftBg,
          )}
        >
          {left}
        </div>
        <div
          className={clx(
            "w-full rounded-b-xl lg:w-2/3 lg:rounded-r-xl",
            rightBg,
          )}
        >
          {right}
        </div>
      </div>
    </>
  );
};

export default LeftRightCard;
