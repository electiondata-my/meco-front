import { clx } from "@lib/helpers";
import { FunctionComponent } from "react";

interface SegmentTabsProps {
  options: string[];
  current: number;
  onChange: (index: number) => void;
  className?: string;
}

const SegmentTabs: FunctionComponent<SegmentTabsProps> = ({
  options,
  current,
  onChange,
  className,
}) => {
  return (
    <div
      className={clx(
        "flex h-8 w-fit flex-row items-center rounded-lg bg-[#F4F4F5] p-0",
        className,
      )}
    >
      {options.map((option, index) => (
        <button
          key={option}
          onClick={() => onChange(index)}
          className={clx(
            "flex h-8 min-h-8 flex-row items-center justify-center px-2.5 py-1.5 text-sm font-medium transition-colors",
            current === index
              ? "rounded-lg border border-otl-gray-200 bg-white text-txt-black-900 shadow-[0px_1px_3px_rgba(0,0,0,0.07)]"
              : "text-txt-black-500",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default SegmentTabs;
