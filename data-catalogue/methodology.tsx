import { FunctionComponent, RefObject } from "react";
import Markdown from "@components/Markdown";
import Section from "@components/Section";
import { useTranslation } from "@hooks/useTranslation";
import { DCVariable } from "@lib/types";

type MethodologyProps = {
  scrollRef: RefObject<Record<string, HTMLElement | null>>;
  explanation: Pick<DCVariable, "methodology">;
};

const DCMethodology: FunctionComponent<MethodologyProps> = ({
  scrollRef,
  explanation,
}) => {
  const { i18n, t } = useTranslation(["catalogue", "common"]);

  return (
    <div className="space-y-8 max-lg:py-8 lg:pb-16">
      <Section
        title={t("header_4")} // Notes on this dataset
        ref={(ref) => {
          scrollRef.current[
            i18n.language === "en-GB"
              ? "Metadata: Notes on this Dataset"
              : "Metadata: Nota untuk Dataset ini"
          ] = ref;
        }}
        className=""
        description={
          <Markdown className="markdown">{explanation.methodology}</Markdown>
        }
      />
    </div>
  );
};

export default DCMethodology;
