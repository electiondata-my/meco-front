import { Button, ButtonIcon } from "@govtechmy/myds-react/button";
import { ChevronUpIcon } from "@govtechmy/myds-react/icon";
import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import { FunctionComponent, MouseEventHandler } from "react";

/**
 * Election Explorer - Filter
 * @overview Status: Completed
 */

interface ElectionFilterTriggerProps {
  onClick?: MouseEventHandler<HTMLButtonElement> | (() => void);
}

const ElectionFilterTrigger: FunctionComponent<ElectionFilterTriggerProps> = ({
  onClick,
}) => {
  const { t } = useTranslation();

  return (
    <Button
      onClick={onClick}
      variant={"default-outline"}
      size={"medium"}
      className={clx("fixed bottom-4 right-3 z-20 lg:hidden")}
    >
      <span>{t("filters")}</span>
      <ButtonIcon>
        <ChevronUpIcon />
      </ButtonIcon>
    </Button>
  );
};

export default ElectionFilterTrigger;
