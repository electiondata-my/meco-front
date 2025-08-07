import { MapboxMapStyle } from "@lib/constants";
import { useTheme } from "next-themes";
import { FC, useEffect, useRef, useState } from "react";
import useConfig from "next/config";
import { GeoJSONFeature } from "mapbox-gl";
import Map, { MapRef, useMap, ViewState } from "react-map-gl/mapbox";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";

interface Props {
  params_source: string;
  initialState: Partial<ViewState>;
}

const MapboxRedelineation: FC<Props> = ({ params_source, initialState }) => {
  const { LIGHT_STYLE, DARK_STYLE } = MapboxMapStyle;
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation(["redelineation", "common", "home"]);

  const {
    publicRuntimeConfig: { APP_NAME },
  } = useConfig();
  const [popupInfo, setPopupInfo] = useState<{
    feature: GeoJSONFeature & { year: string };
    longitude: number;
    latitude: number;
  } | null>(null);

  const { data, setData } = useData({
    styleUrl: LIGHT_STYLE,
    current_del: params_source,
  });

  const { styleUrl, current_del } = data;
  const mapRef = useRef<MapRef | null>(null);

  const { redelineation_map } = useMap();

  useEffect(() => {
    if (resolvedTheme === "dark") setData("styleUrl", DARK_STYLE);
    else setData("styleUrl", LIGHT_STYLE);
  }, [resolvedTheme]);

  return (
    <Map
      id="redelineation_map"
      ref={mapRef}
      reuseMaps={true}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={initialState}
      style={{ width: "100%", height: "100%" }}
      mapStyle={styleUrl}
      customAttribution={APP_NAME}
    >
      <div className="absolute bottom-10 right-1/2 h-fit translate-x-1/2 lg:right-4 lg:top-4 lg:translate-x-0">
        <div className="flex h-fit w-[330px] flex-col rounded-md border border-otl-gray-200 bg-bg-dialog px-3 pb-2 pt-3 shadow-context-menu lg:w-[120px] lg:p-[5px]">
          <p className="px-2.5 py-1.5 text-center text-body-2xs font-medium text-txt-black-500 lg:text-start">
            {t("common:constituency")}
          </p>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700">
            <div className="size-2 rounded-full bg-bg-danger-600" />
            <p>{t("new")}</p>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700">
            <div className="size-2 rounded-full bg-fr-danger" />
            <p>{t("old")}</p>
          </div>
        </div>
      </div>
    </Map>
  );
};

export default MapboxRedelineation;
