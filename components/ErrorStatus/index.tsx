import { useTranslation } from "@hooks/useTranslation";
import { FunctionComponent } from "react";
import useConfig from "next/config";

interface ErrorStatusProps {
  title: string;
  description?: string | null;
  code: number;
  reason: string;
}

const ErrorStatus: FunctionComponent<ErrorStatusProps> = ({
  title,
  description,
  code,
  reason,
}) => {
  const { t } = useTranslation("error");
  const {
    publicRuntimeConfig: { APP_NAME },
  } = useConfig();

  return (
    <>
      <div className="flex flex-col space-y-10">
        <div className="flex flex-col-reverse items-end justify-between gap-6 lg:flex-row">
          <div className="space-y-2">
            <h2 className="text-xl lg:text-3xl">{title}</h2>
            {description && <p className="text-txt-black-500">{description}</p>}
          </div>
          <h1 className="text-7xl font-bold text-txt-black-500">{code}</h1>
        </div>
        <div>
          <p className="pb-2 text-sm font-bold uppercase text-txt-black-500">
            {t("output")}
          </p>
          <div className="rounded-xl">
            <div className="p-4.5 font-mono text-sm text-txt-black-900">
              <span className="font-bold text-txt-success">
                {APP_NAME}:~/ $
              </span>{" "}
              cat {code}
              -error.log
              <br />
              {reason}
              <br />
              <span className="font-bold text-txt-success">
                {APP_NAME}:~/ $
              </span>
            </div>
          </div>

          <small className="text-xs text-txt-black-500">
            <i>{t("disclaimer")}</i>
          </small>
        </div>
      </div>
    </>
  );
};

export default ErrorStatus;
