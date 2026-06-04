import Map, { AttributionControl } from "react-map-gl/mapbox";
import { useEffect, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";
import type { FilterSpecification } from "mapbox-gl";

type AnalysisRow = {
  seat: string;
  state: string;
  stateDisplay: string;
  majority: number | null;
  majority_perc: number | null;
  n_candidates?: number;
  voters_total?: number;
  voter_turnout?: number;
  voter_turnout_perc?: number;
  votes_rejected?: number;
  votes_rejected_perc?: number;
};

type VarKey =
  | "majority"
  | "majority_perc"
  | "n_candidates"
  | "voters_total"
  | "voter_turnout"
  | "voter_turnout_perc"
  | "votes_rejected"
  | "votes_rejected_perc";

interface Props {
  mapUrl: string;
  stateFilter?: string;
  excludeStates?: string[];
  mapboxToken: string;
  rows: AnalysisRow[];
}

interface TooltipState {
  x: number;
  y: number;
  seat: string;
  value: string;
}

const MY_BOUNDS: [[number, number], [number, number]] = [
  [99.6, 0.85],
  [119.3, 7.35],
];

const VAR_RAMPS: Record<VarKey, string[]> = {
  voter_turnout_perc:  ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"],
  majority_perc:       ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#084594"],
  majority:            ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#084594"],
  votes_rejected_perc: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
  votes_rejected:      ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
  n_candidates:        ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
  voters_total:        ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"],
  voter_turnout:       ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"],
};

const HIDE_LAYER_EXACT = [
  "country-label",
  "state-label",
  "settlement-label",
  "settlement-subdivision-label",
  "settlement-major-label",
  "settlement-minor-label",
];

const LINE_PAINT = {
  "line-color": "#64748b",
  "line-width": 0.5,
};

function getMinMax(rows: AnalysisRow[], key: VarKey): { min: number; max: number } {
  const vals = rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return { min: 0, max: 1 };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function buildFillColor(key: VarKey, min: number, max: number): unknown {
  const colors = VAR_RAMPS[key];
  if (min === max) return colors[Math.floor(colors.length / 2)];
  const range = max - min;
  const stops = colors.flatMap((color, i) => [
    min + (i / (colors.length - 1)) * range,
    color,
  ]);
  return ["interpolate", ["linear"], ["coalesce", ["get", key], min], ...stops];
}

function formatVal(v: number | null | undefined, key: VarKey): string {
  if (v == null) return "—";
  if (key.endsWith("_perc")) return `${v.toFixed(1)}%`;
  return v.toLocaleString("en-MY");
}

export default function ElectionsAnalysisMap({
  mapUrl,
  stateFilter,
  excludeStates,
  mapboxToken,
  rows,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [varKey, setVarKey] = useState<VarKey>("voter_turnout_perc");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const varKeyRef = useRef<VarKey>(varKey);

  useEffect(() => {
    varKeyRef.current = varKey;
  }, [varKey]);

  // Lazy mount: only initialise Mapbox when the Map tab is activated
  useEffect(() => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem("meco-elections-state") ?? "null");
      if (parsed?.tab === "map" && Date.now() - (parsed.ts ?? 0) < 10000) {
        setReady(true);
        return;
      }
    } catch {}
    const handler = () => setReady(true);
    document.addEventListener("elections-analysis-view-change", handler);
    return () => document.removeEventListener("elections-analysis-view-change", handler);
  }, []);

  // Sync initial varKey from session (mirrors what the chart does)
  useEffect(() => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem("meco-elections-state") ?? "null");
      if (parsed?.varKey && Date.now() - (parsed.ts ?? 0) < 10000) {
        setVarKey(parsed.varKey as VarKey);
      }
    } catch {}
  }, []);

  // Listen for variable changes from the dropdown
  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent<{ varKey: string }>).detail.varKey as VarKey;
      setVarKey(key);
    };
    document.addEventListener("elections-var-change", handler);
    return () => document.removeEventListener("elections-var-change", handler);
  }, []);

  // Re-colour choropleth when the active variable changes
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map || !map.getLayer("analysis-fill")) return;
    const { min, max } = getMinMax(rows, varKey);
    map.setPaintProperty(
      "analysis-fill",
      "fill-color",
      buildFillColor(varKey, min, max) as unknown as string,
    );
  }, [varKey, mapLoaded]);

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
        ? (["!", ["in", ["get", "state"], ["literal", excludeStates]]] as unknown as FilterSpecification)
        : undefined;

    const { min, max } = getMinMax(rows, varKeyRef.current);

    map.addSource("analysis-src", { type: "geojson", data: mapUrl });
    map.addLayer({
      id: "analysis-fill",
      type: "fill",
      source: "analysis-src",
      ...(filter ? { filter } : {}),
      paint: {
        "fill-color": buildFillColor(varKeyRef.current, min, max) as unknown as string,
        "fill-opacity": 0.85,
      },
    });
    map.addLayer({
      id: "analysis-line",
      type: "line",
      source: "analysis-src",
      ...(filter ? { filter } : {}),
      paint: LINE_PAINT,
    });

    if (stateFilter || excludeStates?.length) {
      map.once("idle", () => {
        const features = map.querySourceFeatures("analysis-src").filter((f) => {
          const state = f.properties?.state;
          if (stateFilter) return state === stateFilter;
          if (excludeStates?.length) return !excludeStates.includes(state);
          return true;
        });
        if (features.length === 0) return;
        let minLng = Infinity,
          minLat = Infinity,
          maxLng = -Infinity,
          maxLat = -Infinity;
        const expand = (coord: number[]) => {
          if (coord[0] < minLng) minLng = coord[0];
          if (coord[0] > maxLng) maxLng = coord[0];
          if (coord[1] < minLat) minLat = coord[1];
          if (coord[1] > maxLat) maxLat = coord[1];
        };
        features.forEach((f) => {
          const geom = f.geometry;
          if (geom.type === "Polygon") geom.coordinates.forEach((r) => r.forEach(expand));
          else if (geom.type === "MultiPolygon")
            geom.coordinates.forEach((p) => p.forEach((r) => r.forEach(expand)));
        });
        if (minLng < Infinity)
          map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 0 });
      });
    }

    const showTooltip = (
      e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] },
    ) => {
      if (!e.features?.length || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const props = e.features[0].properties ?? {};
      setTooltip({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
        seat: props.seat ?? "",
        value: formatVal(props[varKeyRef.current] as number | null, varKeyRef.current),
      });
      map.getCanvas().style.cursor = "pointer";
    };
    const hideTooltip = () => {
      setTooltip(null);
      map.getCanvas().style.cursor = "";
    };

    map.on("mousemove", "analysis-fill", showTooltip);
    map.on("mouseleave", "analysis-fill", hideTooltip);

    setMapLoaded(true);
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
          <div className="text-txt-black-500">{tooltip.value}</div>
        </div>
      )}
    </div>
  );
}
