import Card from "@components/Card";
import Section from "@components/Section";
import { DownloadIcon } from "@govtechmy/myds-react/icon";
import { useTranslation } from "@hooks/useTranslation";
import {
  ParquetIcon,
  CSVIcon,
  GeoJSONIcon,
  TopoJSONIcon,
  GeoParquetIcon,
  FlatGeobufIcon,
  KMLIcon,
} from "@icons/files";
import { AnalyticsContext } from "@lib/contexts/analytics";
import { formatBytes, numFormat } from "@lib/helpers";
import { DCDownload, DCDownloadType } from "@lib/types";
import {
  ComponentType,
  FunctionComponent,
  SVGProps,
  useContext,
  useMemo,
} from "react";

const FORMAT_ICONS: Record<
  DCDownloadType,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  csv: CSVIcon,
  parquet: ParquetIcon,
  geojson: GeoJSONIcon,
  topojson: TopoJSONIcon,
  geoparquet: GeoParquetIcon,
  flatgeobuf: FlatGeobufIcon,
  kml: KMLIcon,
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
            className="bg-bg-white px-4.5 py-5"
          >
            <div className="flex items-center gap-4.5">
              {(() => {
                const Icon = FORMAT_ICONS[format];
                return <Icon className="size-14 text-txt-danger" />;
              })()}
              <div className="block flex-grow">
                <p className="font-medium">{TITLE[format]}</p>
                <p className="text-xs text-txt-black-500">
                  {`${info.n_rows ? `${info.n_rows} rows` : `${info.n_objects} objects`} x ${info.n_cols ? `${info.n_cols} cols` : `${info.n_attributes} attributes`} · ${formatBytes(info.size_bytes)}`}
                </p>
              </div>
              <div className="space-y-1">
                <DownloadIcon className="size-8 text-txt-danger" />
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
