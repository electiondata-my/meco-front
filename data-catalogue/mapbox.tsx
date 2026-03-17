import { FC, useEffect, useRef, useState } from "react";
import Map, { Layer, MapRef, Popup, Source } from "react-map-gl/mapbox";
import { useTheme } from "next-themes";
import {
  MapboxMapStyle,
  MAPBOX_COLOR_INDEX,
  getMapboxColorIndex,
} from "@lib/constants";
import useConfig from "next/config";
import { GeoJSONFeature } from "mapbox-gl";
import { ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { MapIcon } from "@govtechmy/myds-react/icon";
import { useMediaQuery } from "@hooks/useMediaQuery";

type DCMapboxProps = {
  mapboxKey: string;
  center?: [number, number];
  zoom?: number;
  className?: string;
};

const DCMapbox: FC<DCMapboxProps> = ({
  mapboxKey,
  center = [109.5, 4.0],
  zoom = 5,
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

  const isMobile = useMediaQuery("(max-width: 768px)");
  const initialCenter =
    center ?? ((isMobile ? [108.0, 4.5] : [109.5, 4.0]) as [number, number]);
  const initialZoom = zoom ?? (isMobile ? 4 : 5);

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
      center: initialCenter,
      zoom: initialZoom,
      duration: 1000,
    });
    setPopupInfo(null);
  };

  return (
    <div className={className}>
      <Map
        ref={mapRef}
        reuseMaps={true}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: initialCenter[0],
          latitude: initialCenter[1],
          zoom: initialZoom,
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
              "fill-color": ["coalesce", ["get", "colour"], "transparent"],
              "fill-opacity": 0.8,
            }}
          />
          <Layer
            id={`${mapboxKey}-line`}
            type="line"
            source-layer={mapboxKey}
            paint={{
              "line-color": "#3f3f46",
              "line-width": 1,
              "line-opacity": 0.4,
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
                .filter(([k]) => k !== "colour")
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
