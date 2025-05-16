import { FunctionComponent } from "react";
import { clx } from "@lib/helpers";

interface SpinnerProps {
  loading: boolean;
  className?: string;
}

const Spinner: FunctionComponent<SpinnerProps> = ({ loading, className }) => {
  return loading ? (
    <div
      className={clx(
        "h-4 w-4 animate-spin rounded-[50%] border-2 border-gray-300 border-t-zinc-900",
        className
      )}
    />
  ) : (
    <></>
  );
};

interface SpinnerBoxProps {
  className?: string;
  height?: string;
  width?: string;
}

const SpinnerBox: FunctionComponent<SpinnerBoxProps> = ({
  className,
  height = "h-full",
  width = "w-full",
}) => {
  return (
    <div
      className={clx(
        "flex items-center justify-center",
        height,
        width,
        className
      )}
    >
      <Spinner loading={true} />
    </div>
  );
};

export { SpinnerBox };

export default Spinner;
