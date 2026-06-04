import Map, { AttributionControl } from "react-map-gl/mapbox";
import { useEffect, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";
import type { FilterSpecification } from "mapbox-gl";

interface Props {
  mapUrl: string;
  stateFilter?: string;
  excludeStates?: string[];
  viewEventName: string;
  mapboxToken: string;
}

interface TooltipState {
  x: number;
  y: number;
  seat: string;
  coalition: string;
  party: string;
}

const MY_BOUNDS: [[number, number], [number, number]] = [[99.6, 0.85], [119.3, 7.35]];

const FILL_PAINT = {
  "fill-color": ["coalesce", ["get", "colour"], "#94a3b8"] as unknown as string,
  "fill-opacity": 0.85,
};

const LINE_PAINT = {
  "line-color": "#64748b",
  "line-width": 0.5,
};

const HIDE_LAYER_EXACT = [
  "country-label",
  "state-label",
  "settlement-label",
  "settlement-subdivision-label",
  "settlement-major-label",
  "settlement-minor-label",
];

export default function ElectionsMap({ mapUrl, stateFilter, excludeStates, viewEventName, mapboxToken }: Props) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    // Restore map tab from session if the user was on it before navigating.
    try {
      const parsed = JSON.parse(sessionStorage.getItem("meco-elections-state") ?? "null");
      if (parsed?.overviewTab === "map" && Date.now() - (parsed.ts ?? 0) < 10000) {
        setReady(true);
        return;
      }
    } catch {}

    const handler = () => setReady(true);
    document.addEventListener(viewEventName, handler);
    return () => document.removeEventListener(viewEventName, handler);
  }, [viewEventName]);

  function handleLoad() {
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.getStyle().layers.forEach((layer) => {
      if (HIDE_LAYER_EXACT.includes(layer.id))
        map.setLayoutProperty(layer.id, "visibility", "none");
    });

    const filter: FilterSpecification | undefined = stateFilter
      ? ["==", ["get", "state"], stateFilter]
      : excludeStates?.length
        ? ["!", ["in", ["get", "state"], ["literal", excludeStates]]] as unknown as FilterSpecification
        : undefined;

    map.addSource("map-src", { type: "geojson", data: mapUrl });
    map.addLayer({ id: "map-fill", type: "fill", source: "map-src", ...(filter ? { filter } : {}), paint: FILL_PAINT });
    map.addLayer({ id: "map-line", type: "line", source: "map-src", ...(filter ? { filter } : {}), paint: LINE_PAINT });

    // Fit to the visible features once data has loaded.
    if (stateFilter || excludeStates?.length) {
      map.once("idle", () => {
        const features = map.querySourceFeatures("map-src").filter((f) => {
          const state = f.properties?.state;
          if (stateFilter) return state === stateFilter;
          if (excludeStates?.length) return !excludeStates.includes(state);
          return true;
        });
        if (features.length === 0) return;
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        const expand = (coord: number[]) => {
          if (coord[0] < minLng) minLng = coord[0];
          if (coord[0] > maxLng) maxLng = coord[0];
          if (coord[1] < minLat) minLat = coord[1];
          if (coord[1] > maxLat) maxLat = coord[1];
        };
        features.forEach((f) => {
          const geom = f.geometry;
          if (geom.type === "Polygon") geom.coordinates.forEach((r) => r.forEach(expand));
          else if (geom.type === "MultiPolygon") geom.coordinates.forEach((p) => p.forEach((r) => r.forEach(expand)));
        });
        if (minLng < Infinity) map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 0 });
      });
    }

    const showTooltip = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) => {
      if (!e.features?.length || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const props = e.features[0].properties ?? {};
      setTooltip({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
        seat: props.seat ?? "",
        coalition: props.coalition ?? "",
        party: props.party ?? "",
      });
      map.getCanvas().style.cursor = "pointer";
    };
    const hideTooltip = () => { setTooltip(null); map.getCanvas().style.cursor = ""; };

    map.on("mousemove", "map-fill", showTooltip);
    map.on("mouseleave", "map-fill", hideTooltip);
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-otl-gray-200"
      style={{ height: 480 }}
    >
      {ready && (
        <Map
          ref={mapRef}
          mapboxAccessToken={mapboxToken}
          initialViewState={{ bounds: MY_BOUNDS, fitBoundsOptions: { padding: 30 } }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          attributionControl={false}
          onLoad={handleLoad}
        >
          <AttributionControl compact={true} />
        </Map>
      )}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-md bg-bg-dialog-active px-3 py-2 text-body-sm shadow-floating ring-1 ring-otl-gray-200"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="font-medium text-txt-black-900">{tooltip.seat}</div>
          <div className="text-txt-black-500">
            {tooltip.coalition}
            {tooltip.coalition && tooltip.party ? " · " : ""}
            {tooltip.party}
          </div>
        </div>
      )}
    </div>
  );
}
