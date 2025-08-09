import { MapboxMapStyle } from "@lib/constants";
import { useTheme } from "next-themes";
import { FC, useEffect, useRef, useState } from "react";
import useConfig from "next/config";
import { GeoJSONFeature } from "mapbox-gl";
import Map, {
  Layer,
  MapRef,
  Source,
  useMap,
  ViewState,
} from "react-map-gl/mapbox";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { ElectionType } from "@dashboards/types";

interface Props {
  params_source: string;
  initialState: Partial<ViewState>;
  sources: [string, string]; // [new, old]
  seat_new: string | string[];
  seat_old: string | string[];
  election_type: ElectionType;
}

const MapboxRedelineation: FC<Props> = ({
  params_source,
  initialState,
  sources,
  seat_new,
  seat_old,
  election_type,
}) => {
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
  });

  const { styleUrl } = data;
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
      <Source
        key={sources[0]}
        id={sources[0]}
        type="vector"
        url={`mapbox://${process.env.NEXT_PUBLIC_MAPBOX_ACCOUNT}.${sources[0]}`}
      >
        <Layer
          id={`${sources[0]}-line`}
          type="line"
          source-layer={sources[0]}
          paint={{
            "line-color": "#DC2626",
            "line-width": 2,
            "line-opacity": 1,
          }}
          filter={[
            "in",
            election_type === "parlimen" ? "parlimen" : "dun",
            ...(Array.isArray(seat_new) ? seat_new : [seat_new]),
          ]}
        />
        <Layer
          id={`${sources[0]}-fill`}
          type="fill"
          source-layer={sources[0]}
          paint={{
            "fill-color": "transparent",
          }}
          filter={[
            "in",
            election_type === "parlimen" ? "parlimen" : "dun",
            ...(Array.isArray(seat_new) ? seat_new : [seat_new]),
          ]}
        />
      </Source>
      <Source
        key={sources[1]}
        id={sources[1]}
        type="vector"
        url={`mapbox://${process.env.NEXT_PUBLIC_MAPBOX_ACCOUNT}.${sources[1]}`}
      >
        <Layer
          id={`${sources[1]}-line`}
          type="line"
          source-layer={sources[1]}
          paint={{
            "line-color": "#FCA5A5",
            "line-width": 1,
            "line-opacity": 0.8,
          }}
          filter={[
            "in",
            election_type === "parlimen" ? "parlimen" : "dun",
            ...(Array.isArray(seat_old) ? seat_old : [seat_old]),
          ]}
        />
        <Layer
          id={`${sources[1]}-fill`}
          type="fill"
          source-layer={sources[1]}
          paint={{
            "fill-color": "#FCA5A5",
            "fill-opacity": 0.5,
          }}
          filter={[
            "in",
            election_type === "parlimen" ? "parlimen" : "dun",
            ...(Array.isArray(seat_old) ? seat_old : [seat_old]),
          ]}
        />
      </Source>

      <div className="absolute right-4 top-4">
        <div className="flex w-[120px] flex-col rounded-md border border-otl-gray-200 bg-bg-dialog p-[5px] shadow-context-menu">
          <p className="px-2.5 py-1.5 text-start text-body-2xs font-medium text-txt-black-500">
            {t("common:constituency")}
          </p>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700">
            <div className="size-2 rounded-full bg-danger-600" />
            <p>{t("new")}</p>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700">
            <div className="size-2 rounded-full bg-danger-300" />
            <p>{t("old")}</p>
          </div>
        </div>
      </div>
    </Map>
  );
};

export default MapboxRedelineation;
