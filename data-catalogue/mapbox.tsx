import { FC, useEffect, useRef, useState } from "react";
import Map, { Layer, MapRef, Popup, Source } from "react-map-gl/mapbox";
import { useTheme } from "next-themes";
import {
  MapboxMapStyle,
  MAPBOX_COLOR_INDEX,
  MAPBOX_REGION_CENTER,
  getMapboxColorIndex,
} from "@lib/constants";
import useConfig from "next/config";
import { ExpressionSpecification, GeoJSONFeature } from "mapbox-gl";
import { ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { MapIcon } from "@govtechmy/myds-react/icon";
import { DCMapboxDataVizConfig } from "@lib/types";
import { clx } from "@lib/helpers";

// Returns a Mapbox paint color value: transparent, hex, or a feature-property expression
const resolveColor = (
  value: string | null,
): string | ExpressionSpecification => {
  if (value === null) return "transparent";
  if (value.startsWith("#")) return value;
  return ["coalesce", ["get", value], "transparent"];
};

type DCMapboxProps = Required<DCMapboxDataVizConfig> & {
  className?: string;
};

type MapInstanceProps = DCMapboxProps & {
  center: [number, number];
  zoom: number;
};

const DCMapbox: FC<DCMapboxProps> = (props) => {
  const { mapbox_key: mapboxKey } = props;
  const region = mapboxKey.split("_")[0];
  const fallback =
    MAPBOX_REGION_CENTER[region] ?? MAPBOX_REGION_CENTER.peninsular;
  const mobile = props.center_mobile ?? fallback.mobile;
  const desktop = props.center_desktop ?? fallback.desktop;
  const zoomMobile = props.zoom_mobile ?? fallback.zoom;
  const zoomDesktop = props.zoom_desktop ?? fallback.zoom;

  return (
    <>
      <div className="block lg:hidden">
        <MapInstance {...props} center={mobile} zoom={zoomMobile} />
      </div>
      <div className="hidden lg:block">
        <MapInstance {...props} center={desktop} zoom={zoomDesktop} />
      </div>
    </>
  );
};

const MapInstance: FC<MapInstanceProps> = ({
  mapbox_key: mapboxKey,
  fill_colour,
  fill_opacity,
  stroke_colour,
  stroke_opacity,
  stroke_width,
  center,
  zoom,
  className = "h-[350px] w-full lg:h-[450px]",
}) => {
  const { LIGHT_STYLE, DARK_STYLE } = MapboxMapStyle;
  const { resolvedTheme } = useTheme();
  const [styleUrl, setStyleUrl] = useState(LIGHT_STYLE);
  const {
    publicRuntimeConfig: { APP_NAME },
  } = useConfig();
  const mapRef = useRef<MapRef | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    feature: GeoJSONFeature;
    longitude: number;
    latitude: number;
  } | null>(null);

  const year = Number(
    mapboxKey.split("_").find((part) => /^\d{4}$/.test(part)),
  );

  useEffect(() => {
    if (resolvedTheme === "dark") setStyleUrl(DARK_STYLE);
    else setStyleUrl(LIGHT_STYLE);
  }, [resolvedTheme]);

  const handleClick = (e: mapboxgl.MapMouseEvent) => {
    const features = mapRef.current?.queryRenderedFeatures(e.point, {
      layers: [`${mapboxKey}-fill`],
    });

    if (features && features.length > 0) {
      setPopupInfo({
        feature: features[0],
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
      });

      const bbox = features[0].geometry as GeoJSON.Geometry;
      if (bbox.type === "Polygon" || bbox.type === "MultiPolygon") {
        const coords =
          bbox.type === "Polygon"
            ? bbox.coordinates.flat()
            : bbox.coordinates.flat(2);
        const lngs = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        mapRef.current?.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 60, duration: 1000 },
        );
      } else {
        mapRef.current?.flyTo({
          center: [e.lngLat.lng, e.lngLat.lat],
          zoom: (mapRef.current.getZoom() ?? zoom) + 2,
          duration: 1000,
        });
      }
    } else {
      setPopupInfo(null);
    }
  };

  const handleReset = () => {
    mapRef.current?.flyTo({
      center,
      zoom,
      duration: 1000,
    });
    setPopupInfo(null);
  };

  return (
    <div className={clx("h-full", "w-full", className)}>
      <Map
        ref={mapRef}
        reuseMaps={true}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={styleUrl}
        customAttribution={APP_NAME}
        interactiveLayerIds={[`${mapboxKey}-fill`]}
        onClick={handleClick}
      >
        <button
          onClick={handleReset}
          className="absolute right-2 top-2 z-10 rounded-md border border-otl-gray-200 bg-bg-dialog p-1.5 shadow-context-menu hover:bg-bg-white"
          title="Reset zoom"
        >
          <ArrowsPointingInIcon className="h-4 w-4 text-txt-black-700" />
        </button>
        <Source
          id={mapboxKey}
          type="vector"
          url={`mapbox://${process.env.NEXT_PUBLIC_MAPBOX_ACCOUNT}.${mapboxKey}`}
        >
          <Layer
            id={`${mapboxKey}-fill`}
            type="fill"
            source-layer={mapboxKey}
            paint={{
              "fill-color":
                fill_colour !== undefined
                  ? resolveColor(fill_colour)
                  : ["coalesce", ["get", "colour"], "transparent"],
              "fill-opacity": fill_opacity ?? 0.8,
            }}
          />
          <Layer
            id={`${mapboxKey}-line`}
            type="line"
            source-layer={mapboxKey}
            paint={{
              "line-color": resolveColor(stroke_colour ?? null),
              "line-width": stroke_width ?? 1,
              "line-opacity": stroke_opacity ?? 0.4,
            }}
          />
        </Source>

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
          >
            <div className="flex flex-col gap-1 px-3 py-2 font-body text-body-xs">
              <div className="flex items-stretch gap-1.5 text-txt-white">
                <div
                  className="w-1 self-stretch"
                  style={{
                    backgroundColor:
                      MAPBOX_COLOR_INDEX[getMapboxColorIndex(year)][0],
                  }}
                />
                <MapIcon className="size-5" />
                <span className="font-semibold">{mapboxKey}</span>
              </div>
              {Object.entries(popupInfo.feature.properties ?? {})
                .filter(([k]) => !/colou?r/i.test(k))
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-txt-white/60">{k}</span>
                    <span className="font-medium text-txt-white">
                      {String(v)}
                    </span>
                  </div>
                ))}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default DCMapbox;
