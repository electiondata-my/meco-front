import { FunctionComponent, ReactNode } from "react";
import { clx, limitMax, numFormat } from "@lib/helpers";

type BarPercProps = {
  label?: ReactNode;
  value: number;
  className?: string;
  hidden?: boolean;
  total?: number;
  precision?: number | [number, number];
  unit?: ReactNode;
  size?: string;
};

const BarPerc: FunctionComponent<BarPercProps> = ({
  label,
  value,
  className = "w-fit space-y-1",
  precision = 1,
  hidden = false,
  total = 100,
  unit = "%",
  size = "h-[5px] w-[30px] md:w-[50px]",
}) => {
  const percentFill = (value: number): string => {
    return `${limitMax((value / total) * 100)}%`;
  };

  return (
    <div className={className}>
      {!hidden && (
        <div className="flex justify-between">
          {label && <p>{label}</p>}
          <div className="text-txt-black-900">
            {value !== null ? (
              <p>
                {numFormat(value, "standard", precision)}
                {unit}
              </p>
            ) : (
              <p>N/A</p>
            )}
          </div>
        </div>
      )}

      <div
        className={clx(
          "flex overflow-x-hidden rounded-full bg-bg-washed",
          size,
        )}
      >
        <div
          className="h-full items-center overflow-hidden rounded-full bg-bg-black-900"
          style={{ width: percentFill(value) }}
        />
      </div>
    </div>
  );
};

export default BarPerc;
