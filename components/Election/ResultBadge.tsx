import { ElectionResult } from "@dashboards/types";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useTranslation } from "@hooks/useTranslation";
import { FunctionComponent } from "react";

interface ResultBadgeProps {
  value: ElectionResult | undefined;
  hidden?: boolean;
}

const ResultBadge: FunctionComponent<ResultBadgeProps> = ({
  value,
  hidden = false,
}) => {
  const { t } = useTranslation("candidates");
  switch (value) {
    case "won":
    case "won_uncontested":
      return <Won desc={!hidden && t(value, { ns: "candidates" })} />;
    case "lost":
    case "lost_deposit":
      return <Lost desc={!hidden && t(value, { ns: "candidates" })} />;
    default:
      return <></>;
  }
};

export default ResultBadge;

interface WonProps {
  desc?: string | false;
}

export const Won: FunctionComponent<WonProps> = ({ desc }) => {
  return desc ? (
    <span className="flex items-center gap-1.5 text-txt-success">
      <CheckCircleIcon className="h-5 w-5" />
      <span className="whitespace-nowrap uppercase">{desc}</span>
    </span>
  ) : (
    <CheckCircleIcon className="h-4 w-4 shrink-0 text-txt-success" />
  );
};

interface LostProps {
  desc?: string | false;
}

export const Lost: FunctionComponent<LostProps> = ({ desc }) => {
  return desc ? (
    <span className="flex items-center gap-1.5 text-txt-danger">
      <XCircleIcon className="h-5 w-5" />
      <span className="whitespace-nowrap uppercase">{desc}</span>
    </span>
  ) : (
    <XCircleIcon className="h-4 w-4 shrink-0 text-txt-danger" />
  );
};
