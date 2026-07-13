import Map, { AttributionControl, NavigationControl } from "react-map-gl/mapbox";
import { useMemo, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";
import {
  MY_BOUNDS,
  HIDE_LAYER_EXACT,
  LINE_PAINT,
  filterFeatures,
  bboxOfFeatures,
  isCoarsePointer,
  useGeojson,
  type MapFeature,
} from "./mapShared";

interface Props {
  mapUrl: string;
  stateFilter?: string;
  excludeStates?: string[];
  mapboxToken: string;
}

interface TooltipState {
  x: number;
  y: number;
  flipX: boolean;
  seat: string;
  state: string;
  coalition: string;
  party: string;
  colour: string;
}

const FILL_PAINT = {
  "fill-color": ["coalesce", ["get", "colour"], "#94a3b8"] as unknown as string,
  "fill-opacity": 0.85,
};

function buildLegend(features: MapFeature[]): { label: string; colour: string; count: number }[] {
  // NB: `Map` is the react-map-gl component here, so use a plain record.
  const entries: Record<string, { label: string; colour: string; count: number }> = {};
  features.forEach((f) => {
    const props = f.properties ?? {};
    const label = props.coalition || props.party || "—";
    if (entries[label]) entries[label].count += 1;
    else entries[label] = { label, colour: props.colour ?? "#94a3b8", count: 1 };
  });
  return Object.values(entries).sort((a, b) => b.count - a.count);
}

export default function ElectionsMap({ mapUrl, stateFilter, excludeStates, mapboxToken }: Props) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const geojson = useGeojson(mapUrl);
  const features = useMemo(
    () => filterFeatures((geojson?.features ?? []) as MapFeature[], stateFilter, excludeStates),
    [geojson, stateFilter, excludeStates],
  );
  const bounds = useMemo(() => bboxOfFeatures(features) ?? MY_BOUNDS, [features]);
  const legend = useMemo(() => buildLegend(features), [features]);

  function handleLoad() {
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.getStyle().layers.forEach((layer) => {
      if (HIDE_LAYER_EXACT.includes(layer.id))
        map.setLayoutProperty(layer.id, "visibility", "none");
    });

    map.addSource("map-src", {
      type: "geojson",
      data: { type: "FeatureCollection", features } as GeoJSON.FeatureCollection,
    });
    map.addLayer({ id: "map-fill", type: "fill", source: "map-src", paint: FILL_PAINT });
    map.addLayer({ id: "map-line", type: "line", source: "map-src", paint: LINE_PAINT });

    const showTooltip = (point: mapboxgl.Point, props: Record<string, any>) => {
      const width = containerRef.current?.clientWidth ?? 0;
      setTooltip({
        x: point.x,
        y: point.y,
        flipX: point.x > width * 0.6,
        seat: props.seat ?? "",
        state: props.state ?? "",
        coalition: props.coalition ?? "",
        party: props.party ?? "",
        colour: props.colour ?? "#94a3b8",
      });
      map.getCanvas().style.cursor = "pointer";
    };
    const hideTooltip = () => {
      setTooltip(null);
      map.getCanvas().style.cursor = "";
    };

    map.on("mousemove", "map-fill", (e) => {
      if (e.features?.length) showTooltip(e.point, e.features[0].properties ?? {});
    });
    map.on("mouseleave", "map-fill", hideTooltip);
    // Tap support: clicking a seat shows the tooltip, clicking empty map hides it.
    map.on("click", (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ["map-fill"] });
      if (hits.length) showTooltip(e.point, hits[0].properties ?? {});
      else hideTooltip();
    });
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-otl-gray-200"
      style={{ height: 480 }}
    >
      {geojson && (
        <Map
          ref={mapRef}
          mapboxAccessToken={mapboxToken}
          initialViewState={{ bounds, fitBoundsOptions: { padding: 30 } }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          projection="mercator"
          attributionControl={false}
          // Desktop: let the page scroll over the map (zoom via buttons / double-click).
          // Touch: cooperative mode so one finger scrolls the page, two fingers move the map.
          scrollZoom={false}
          cooperativeGestures={isCoarsePointer()}
          onLoad={handleLoad}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <AttributionControl compact={true} />
        </Map>
      )}
      {legend.length > 0 && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[60%] rounded-md bg-bg-dialog-active px-3 py-2 shadow-floating ring-1 ring-otl-gray-200">
          <ul className="space-y-1">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-body-xs text-txt-black-700">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.colour }}
                />
                <span className="truncate">{item.label}</span>
                <span className="ml-auto font-medium tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 min-w-40 rounded-lg border border-otl-gray-200 bg-bg-white px-3 py-2.5 text-body-sm shadow-floating"
          style={{
            left: tooltip.flipX ? tooltip.x - 12 : tooltip.x + 12,
            top: tooltip.y - 8,
            transform: tooltip.flipX ? "translateX(-100%)" : undefined,
          }}
        >
          <div className="font-semibold text-txt-black-900">{tooltip.seat}</div>
          <div className="text-body-xs text-txt-black-500">{tooltip.state}</div>
          <div className="mt-1.5 flex items-center gap-2 border-t border-otl-gray-200 pt-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: tooltip.colour }}
            />
            <span className="font-medium text-txt-black-900">{tooltip.party}</span>
            {tooltip.coalition && (
              <span className="text-txt-black-500">{tooltip.coalition}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
