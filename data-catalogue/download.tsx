import Card from "@components/Card";
import Section from "@components/Section";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "@hooks/useTranslation";
import { AnalyticsContext } from "@lib/contexts/analytics";
import { formatBytes, numFormat } from "@lib/helpers";
import { DCDownload, DCDownloadType } from "@lib/types";
import Image from "next/image";
import { FunctionComponent, useContext, useMemo } from "react";

const FORMAT_ICONS: Record<DCDownloadType, string> = {
  csv: "/static/images/icons/csv.png",
  parquet: "/static/images/icons/parquet.png",
  geojson: "/static/images/icons/geojson.png",
  topojson: "/static/images/icons/topojson.png",
  geoparquet: "/static/images/icons/geoparquet.png",
  flatgeobuf: "/static/images/icons/flatgeobuf.png",
  kml: "/static/images/icons/kml.png",
};

const TITLE: Record<DCDownloadType, string> = {
  csv: "Full Dataset (CSV)",
  parquet: "Full Dataset (Parquet)",
  geojson: "GeoJSON",
  topojson: "TopoJSON",
  geoparquet: "GeoParquet",
  flatgeobuf: "FlatGeobuf",
  kml: "KML",
};

interface DCDownloadProps {
  scrollRef: { current: Record<string, HTMLElement | null> };
  download: DCDownload;
}

const DCDownloadSection: FunctionComponent<DCDownloadProps> = ({
  scrollRef,
  download,
}) => {
  const { t } = useTranslation("catalogue");
  const { downloads: counts, trackDownload } = useContext(AnalyticsContext);

  const entries = useMemo(
    () =>
      (
        Object.entries(download) as [
          DCDownloadType,
          DCDownload[DCDownloadType],
        ][]
      )
        .filter(([, info]) => Boolean(info.link))
        .map(([format, info]) => ({
          format,
          info,
          views: counts?.[format],
        })),
    [download, counts],
  );

  if (entries.length === 0) return null;

  return (
    <Section
      title={t("download")}
      ref={(ref) => {
        scrollRef.current["download"] = ref;
      }}
      className="mx-auto max-lg:py-8 lg:pb-16"
    >
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        {entries.map(({ format, info, views }) => (
          <Card
            key={format}
            onClick={() => {
              trackDownload(format);
              window.open(info.link, "_blank");
            }}
            className="bg-background dark:border-outlineHover-dark dark:bg-washed-dark p-4.5"
          >
            <div className="flex items-center gap-4.5">
              <Image
                height={38}
                width={38}
                src={FORMAT_ICONS[format]}
                className="object-contain"
                alt={format}
              />
              <div className="block flex-grow">
                <p className="font-medium">{TITLE[format]}</p>
                <p className="text-xs text-txt-black-500">
                  {`${info.n_rows ? `${info.n_rows} rows` : `${info.n_objects} objects`} · ${info.n_cols ? `${info.n_cols} cols` : `${info.n_attributes} attributes`} · ${formatBytes(info.size_bytes)}`}
                </p>
              </div>
              <div className="space-y-1">
                <ArrowDownTrayIcon className="size-8 text-txt-danger" />
                <p className="text-center text-body-2xs text-txt-black-500">
                  {numFormat(views ?? 0, "compact")}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
};

export default DCDownloadSection;
