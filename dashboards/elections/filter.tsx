import Button from "@components/Button";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useTranslation } from "@hooks/useTranslation";
import { WindowContext } from "@lib/contexts/window";
import { clx } from "@lib/helpers";
import {
  FunctionComponent,
  MouseEventHandler,
  useContext,
  useMemo,
} from "react";

/**
 * Election Explorer - Filter
 * @overview Status: In-development
 */

interface ElectionFilterProps {
  onClick?: MouseEventHandler<HTMLButtonElement> | (() => void);
}

const ElectionFilter: FunctionComponent<ElectionFilterProps> = ({
  onClick,
}) => {
  const { t } = useTranslation();
  const { scroll } = useContext(WindowContext);
  const show = useMemo(() => scroll.y > 300, [scroll.y]);

  return (
    <div
      className={clx(show ? "fixed right-3 top-16 z-20 lg:hidden" : "hidden")}
    >
      <Button
        onClick={onClick}
        className="btn-default shadow-floating drop-shadow-xl dark:drop-shadow-[0_8px_8px_rgba(255,255,255,0.15)]"
      >
        <span>{t("filters")}</span>
        <span className="bg-primary dark:bg-primary-dark w-4.5 h-5 rounded-full text-center text-white">
          3
        </span>
        <ChevronDownIcon className="-mx-[5px] h-5 w-5" />
      </Button>
    </div>
  );
};

export default ElectionFilter;
