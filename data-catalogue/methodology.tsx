import { FunctionComponent, MutableRefObject } from "react";
import Markdown from "@components/Markdown";
import Section from "@components/Section";
import Card from "@components/Card";
import At from "@components/At";
import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import { DCVariable } from "@lib/types";

type MethodologyProps = {
  isGUI: false;
  scrollRef: MutableRefObject<Record<string, HTMLElement | null>>;
  explanation: Pick<
    DCVariable,
    "methodology" | "caveat" | "publication" | "related_datasets"
  >;
};

const DCMethodology: FunctionComponent<MethodologyProps> = ({
  scrollRef,
  explanation,
}) => {
  const { t, i18n } = useTranslation(["catalogue", "common"]);

  return (
    <div className="dark:border-b-outlineHover-dark space-y-8 border-b py-8 lg:py-12">
      {/* How is this data produced? */}
      <Section
        title={t("header_1")}
        ref={(ref) => {
          scrollRef.current[
            i18n.language === "en-GB"
              ? "Metadata: Methodology"
              : "Metadata: Metodologi"
          ] = ref;
        }}
        className=""
        description={
          <Markdown className="markdown">{explanation.methodology}</Markdown>
        }
      />

      {/* What caveats should I bear in mind when using this data? */}
      {explanation.caveat.length > 3 && (
        <Section
          title={t("header_2")}
          ref={(ref) => {
            scrollRef.current[
              i18n.language === "en-GB"
                ? "Metadata: Caveats"
                : "Metadata: Kaveat"
            ] = ref;
          }}
          className=""
          description={
            <Markdown className="markdown">{explanation.caveat}</Markdown>
          }
        />
      )}

      {/* Publication(s) using this data */}
      {explanation.publication && explanation.publication.length > 3 && (
        <Section
          title={t("header_3")}
          ref={(ref) => {
            scrollRef.current[
              i18n.language === "en-GB"
                ? "Metadata: Publications"
                : "Metadata: Penerbitan"
            ] = ref;
          }}
          className=""
          description={
            <Markdown className="markdown">{explanation.publication}</Markdown>
          }
        />
      )}

      {/* Related Datasets */}
      {explanation.related_datasets.length > 0 && (
        <Section
          title={t("header_4")}
          ref={(ref) => {
            scrollRef.current[
              i18n.language === "en-GB"
                ? "Metadata: Related Datasets"
                : "Metadata: Dataset Berkaitan"
            ] = ref;
          }}
          className=""
        >
          <div className="flex h-full w-full items-start gap-2 overflow-x-scroll pb-4">
            {explanation.related_datasets.map((item, index) => (
              <At
                key={index}
                href={`/data-catalogue/${item.id}`}
                className={clx(
                  "w-full shrink-0 md:w-[calc(100%/3.25-0.5rem)] md:min-w-[calc(100%/3.25-0.5rem)]",
                )}
              >
                <Card className="flex h-full flex-col gap-1.5 p-4">
                  <p className="text-zinc-900 line-clamp-2 text-sm font-semibold dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-zinc-500 line-clamp-3 text-sm">
                    {item.description}
                  </p>
                </Card>
              </At>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default DCMethodology;
