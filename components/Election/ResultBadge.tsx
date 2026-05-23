import { ElectionResult } from "@dashboards/types";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useTranslation } from "@hooks/useTranslation";
import { FunctionComponent } from "react";

interface ResultBadgeProps {
  value: ElectionResult | undefined;
  hidden?: boolean;
  /** When true, renders text before the icon instead of after. */
  reversed?: boolean;
}

const ResultBadge: FunctionComponent<ResultBadgeProps> = ({
  value,
  hidden = false,
  reversed = false,
}) => {
  const { t } = useTranslation("candidates");
  switch (value) {
    case "won":
    case "won_uncontested":
      return <Won desc={!hidden && t(value, { ns: "candidates" })} reversed={reversed} />;
    case "lost":
    case "lost_deposit":
      return <Lost desc={!hidden && t(value, { ns: "candidates" })} reversed={reversed} />;
    default:
      return <></>;
  }
};

export default ResultBadge;

interface WonProps {
  desc?: string | false;
  reversed?: boolean;
}

export const Won: FunctionComponent<WonProps> = ({ desc, reversed }) => {
  return desc ? (
    <span className="flex items-center gap-1.5 text-txt-success">
      {!reversed && <CheckCircleIcon className="h-5 w-5" />}
      <span className="whitespace-nowrap uppercase">{desc}</span>
      {reversed && <CheckCircleIcon className="h-5 w-5" />}
    </span>
  ) : (
    <CheckCircleIcon className="h-4 w-4 shrink-0 text-txt-success" />
  );
};

interface LostProps {
  desc?: string | false;
  reversed?: boolean;
}

export const Lost: FunctionComponent<LostProps> = ({ desc, reversed }) => {
  return desc ? (
    <span className="flex items-center gap-1.5 text-txt-danger">
      {!reversed && <XCircleIcon className="h-5 w-5" />}
      <span className="whitespace-nowrap uppercase">{desc}</span>
      {reversed && <XCircleIcon className="h-5 w-5" />}
    </span>
  ) : (
    <XCircleIcon className="h-4 w-4 shrink-0 text-txt-danger" />
  );
};
