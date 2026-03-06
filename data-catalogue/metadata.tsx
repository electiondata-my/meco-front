import { FunctionComponent, RefObject, useContext } from "react";
import Card from "@components/Card";
import Section from "@components/Section";
import Tooltip from "@components/Tooltip";
import Dropdown from "@components/Dropdown";
import { useAnalytics } from "@hooks/useAnalytics";
import { useTranslation } from "@hooks/useTranslation";
import { interpolate, toDate } from "@lib/helpers";
import Table from "@charts/table";
import { METADATA_TABLE_SCHEMA } from "@lib/schema/data-catalogue";
import { DCVariable } from "@lib/types";
import { CatalogueContext } from "@lib/contexts/catalogue";

type MetadataProps = {
  scrollRef: RefObject<Record<string, HTMLElement | null>>;
  metadata: Pick<
    DCVariable,
    | "description"
    | "fields"
    | "last_updated"
    | "next_update"
    | "data_source"
    | "link_csv"
    | "link_parquet"
    | "link_editions"
  >;
  selectedEdition: string | undefined;
  setSelectedEdition: (edition: string) => void;
};

const DCMetadata: FunctionComponent<MetadataProps> = ({
  scrollRef,
  metadata,
  selectedEdition,
  setSelectedEdition,
}) => {
  const { t, i18n } = useTranslation(["catalogue", "common"]);
  const { dataset } = useContext(CatalogueContext);
  const { track } = useAnalytics(dataset);

  return (
    <>
      <Section
        title={"Metadata"}
        ref={(ref) => {
          scrollRef.current["metadata: variables"] = ref;
        }}
        className="mx-auto max-lg:py-8 lg:pb-16"
      >
        <Card className="p-6">
          <div className="space-y-6">
            {/* Dataset description */}
            <div className="space-y-3">
              <h5>{t("meta_desc")}</h5>
              <p className="leading-relaxed text-txt-black-500">
                {interpolate(metadata.description)}
              </p>
            </div>

            {/* Variable definitions */}
            <div className="space-y-3">
              <h5>{t("meta_def")}</h5>
              {metadata.fields?.length > 0 && (
                <>
                  <ul className="ml-6 list-outside list-disc text-txt-black-500 md:hidden">
                    {metadata.fields.map((item) => (
                      <li key={item.title}>
                        <span className="flex gap-x-1">
                          {item.title}
                          <Tooltip tip={interpolate(item.description)} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden md:block">
                    <Table
                      className="table-slate table-default-slate md:w-full"
                      data={metadata.fields.map((item) => {
                        const raw = item.description;
                        const [type, definition] = [
                          raw.substring(raw.indexOf("[") + 1, raw.indexOf("]")),
                          raw.substring(raw.indexOf("]") + 1),
                        ];
                        return {
                          variable: item.name,
                          variable_name: item.title,
                          data_type: type,
                          definition: interpolate(definition),
                        };
                      })}
                      config={METADATA_TABLE_SCHEMA(t, true)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Last updated */}
            <div className="space-y-3">
              <h5>{t("common:last_updated", { date: "" })}</h5>
              <p
                className="whitespace-pre-line text-txt-black-500"
                data-testid="catalogue-last-updated"
              >
                {toDate(
                  metadata.last_updated,
                  "dd MMM yyyy, HH:mm",
                  i18n.language,
                )}
              </p>
            </div>

            {/* Next update */}
            <div
              className="space-y-3"
              ref={(ref) => {
                scrollRef.current["metadata: next_update"] = ref;
              }}
            >
              <h5>{t("next_update", { date: "" })}</h5>
              <p
                className="text-txt-black-500"
                data-testid="catalogue-next-update"
              >
                {toDate(
                  metadata.next_update,
                  "dd MMM yyyy, HH:mm",
                  i18n.language,
                )}
              </p>
            </div>

            {/* Data Source */}
            <div className="space-y-3">
              <h5>{t("meta_source")}</h5>
              <ul className="ml-6 list-outside list-disc text-txt-black-500">
                {metadata.data_source.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </div>

            {/* URLs to dataset */}
            <div className="space-y-3">
              <h5>{t("meta_url")}</h5>
              {metadata.link_editions && metadata.link_editions.length > 0 && (
                <Dropdown
                  options={metadata.link_editions.map((edition) => ({
                    label: edition,
                    value: edition,
                  }))}
                  selected={
                    selectedEdition
                      ? { label: selectedEdition, value: selectedEdition }
                      : undefined
                  }
                  onChange={(selected) =>
                    setSelectedEdition(selected.value as string)
                  }
                  placeholder={t("common:common.select_edition")}
                  className="w-fit"
                  width="w-fit"
                  anchor="left"
                />
              )}
              <ul className="ml-6 list-outside list-disc text-txt-black-500">
                {Object.entries({
                  csv: metadata.link_csv,
                  parquet: metadata.link_parquet,
                }).map(([key, url]: [string, string]) =>
                  url ? (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-txt-primary [text-underline-position:from-font] hover:underline"
                        onClick={() =>
                          track(
                            key === "link_geojson"
                              ? "parquet"
                              : (key as "parquet" | "csv"),
                          )
                        }
                      >
                        {url}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>

            {/* License */}
            <div
              className="space-y-3"
              ref={(ref) => {
                scrollRef.current["metadata: license"] = ref;
              }}
            >
              <h5>{t("meta_license")}</h5>
              <p className="text-txt-black-500">
                {t("license_text")}{" "}
                <a
                  className="lowercase text-txt-primary [text-underline-position:from-font] hover:underline"
                  target="_blank"
                  rel="noopener"
                  href="https://creativecommons.org/licenses/by/4.0/"
                >
                  {t("common:common.here")}.
                </a>
              </p>
            </div>
          </div>
        </Card>
      </Section>
    </>
  );
};

export default DCMetadata;
