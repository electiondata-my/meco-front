import { MapboxMapStyle } from "@lib/constants";
import { useTheme } from "next-themes";
import { FC, useEffect, useRef, useState } from "react";
import useConfig from "next/config";
import { GeoJSONFeature } from "mapbox-gl";
import Map, {
  Layer,
  MapRef,
  Popup,
  Source,
  useMap,
  ViewState,
} from "react-map-gl/mapbox";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { ElectionType } from "@dashboards/types";
import maxBy from "lodash/maxBy";
import minBy from "lodash/minBy";

interface Props {
  initialState: Partial<ViewState>;
  sources: [string, string];
  useOutline: string | string[];
  useShaded: string | string[];
  election_type: ElectionType;
  mapLabel: [string, string];
  year: [string, string];
  toggle_state: "old" | "new";
}

const SHADED_COLOR_INDEX = [
  // [Fill, Outline]
  "rgb(250, 220, 221)",
  "rgb(252, 247, 217)",
  "rgb(222, 246, 222)",
  "rgb(217, 240, 248)",
  "rgb(233, 222, 250)",
  "rgb(252, 232, 216)",
];

const MapboxRedelineation: FC<Props> = ({
  initialState,
  sources,
  useOutline,
  useShaded,
  election_type,
  mapLabel,
  year,
  toggle_state,
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

  const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
    const features = mapRef.current?.queryRenderedFeatures(e.point, {
      layers: sources.map((source) => `${source}-fill`),
    });

    if (features && features.length > 0) {
      const feats = features
        .map((feat) => ({
          ...feat,
          year:
            feat.source?.split("_").find((part) => /^\d{4}$/.test(part)) || "",
        }))
        .sort((a, b) => Number(b) - Number(a));

      const featsByToggle =
        toggle_state === "new" ? minBy(feats, "year") : maxBy(feats, "year");

      if (featsByToggle) {
        setPopupInfo({
          feature: featsByToggle,
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat,
        });
      }
    } else {
      setPopupInfo(null);
    }
  };

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
      interactiveLayerIds={sources}
      onMouseMove={handleMouseMove}
    >
      {/* Shaded Source */}
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
            "line-color": "#A1A1AA",
            "line-width": 2,
            "line-opacity": 1,
          }}
          filter={[
            "in",
            election_type === "parlimen" ? "parlimen" : "dun",
            ...(Array.isArray(useShaded) ? useShaded : [useShaded]),
          ]}
        />
        <Layer
          id={`${sources[1]}-fill`}
          type="fill"
          source-layer={sources[1]}
          paint={{
            "fill-color": [
              "match",
              ["get", election_type === "parlimen" ? "parlimen" : "dun"],
              ...(Array.isArray(useShaded) ? useShaded : [useShaded]).flatMap(
                (seat, i) => [seat, SHADED_COLOR_INDEX[i]],
              ),
              "transparent", // default
            ],
            "fill-opacity": 1,
          }}
          filter={[
            "in",
            election_type === "parlimen" ? "parlimen" : "dun",
            ...(Array.isArray(useShaded) ? useShaded : [useShaded]),
          ]}
        />
      </Source>

      {/* Outline Source */}
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
            "line-color": "black",
            "line-width": 2,
            "line-opacity": 1,
          }}
          filter={[
            "in",
            election_type === "parlimen" ? "parlimen" : "dun",
            ...(Array.isArray(useOutline) ? useOutline : [useOutline]),
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
            ...(Array.isArray(useOutline) ? useOutline : [useOutline]),
          ]}
        />
      </Source>
      <div className="absolute right-4 top-4">
        <div className="flex w-[120px] flex-col rounded-md border border-otl-gray-200 bg-bg-dialog p-[5px] shadow-context-menu">
          <p className="px-2.5 py-1.5 text-start text-body-2xs font-medium text-txt-black-500">
            {t("common:constituency")}
          </p>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700">
            <div className="size-2 rounded-full bg-[#000000]" />
            <p>
              {t(mapLabel[0])} ({year[0]})
            </p>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700">
            <div
              className="size-2 rounded-full"
              style={{ background: SHADED_COLOR_INDEX[0] }}
            />
            <p>
              {t(mapLabel[1])} ({year[1]})
            </p>
          </div>
        </div>
      </div>
      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
        >
          <p className="px-3 py-2 font-body text-body-xs text-txt-white">
            {popupInfo.feature.properties?.["dun"] ||
              popupInfo.feature.properties?.["parlimen"]}{" "}
            ({popupInfo.feature.year})
          </p>
        </Popup>
      )}
    </Map>
  );
};

export default MapboxRedelineation;
