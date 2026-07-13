import Map, { AttributionControl, NavigationControl } from "react-map-gl/mapbox";
import { useEffect, useMemo, useRef, useState } from "react";
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
  flipX: boolean;
  seat: string;
  state: string;
  value: string;
}

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

  const geojson = useGeojson(mapUrl, ready);
  const features = useMemo(
    () => filterFeatures((geojson?.features ?? []) as MapFeature[], stateFilter, excludeStates),
    [geojson, stateFilter, excludeStates],
  );
  const bounds = useMemo(() => bboxOfFeatures(features) ?? MY_BOUNDS, [features]);
  const { min, max } = useMemo(() => getMinMax(rows, varKey), [rows, varKey]);

  // Re-colour choropleth when the active variable changes
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current?.getMap();
    if (!map || !map.getLayer("analysis-fill")) return;
    map.setPaintProperty(
      "analysis-fill",
      "fill-color",
      buildFillColor(varKey, min, max) as unknown as string,
    );
  }, [varKey, min, max, mapLoaded]);

  function handleLoad() {
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.getStyle().layers.forEach((layer) => {
      if (HIDE_LAYER_EXACT.includes(layer.id))
        map.setLayoutProperty(layer.id, "visibility", "none");
    });

    const initial = getMinMax(rows, varKeyRef.current);

    map.addSource("analysis-src", {
      type: "geojson",
      data: { type: "FeatureCollection", features } as GeoJSON.FeatureCollection,
    });
    map.addLayer({
      id: "analysis-fill",
      type: "fill",
      source: "analysis-src",
      paint: {
        "fill-color": buildFillColor(varKeyRef.current, initial.min, initial.max) as unknown as string,
        "fill-opacity": 0.85,
      },
    });
    map.addLayer({
      id: "analysis-line",
      type: "line",
      source: "analysis-src",
      paint: LINE_PAINT,
    });

    const showTooltip = (point: mapboxgl.Point, props: Record<string, any>) => {
      const width = containerRef.current?.clientWidth ?? 0;
      setTooltip({
        x: point.x,
        y: point.y,
        flipX: point.x > width * 0.6,
        seat: props.seat ?? "",
        state: props.state ?? "",
        value: formatVal(props[varKeyRef.current] as number | null, varKeyRef.current),
      });
      map.getCanvas().style.cursor = "pointer";
    };
    const hideTooltip = () => {
      setTooltip(null);
      map.getCanvas().style.cursor = "";
    };

    map.on("mousemove", "analysis-fill", (e) => {
      if (e.features?.length) showTooltip(e.point, e.features[0].properties ?? {});
    });
    map.on("mouseleave", "analysis-fill", hideTooltip);
    // Tap support: clicking a seat shows the tooltip, clicking empty map hides it.
    map.on("click", (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ["analysis-fill"] });
      if (hits.length) showTooltip(e.point, hits[0].properties ?? {});
      else hideTooltip();
    });

    setMapLoaded(true);
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-otl-gray-200"
      style={{ height: 480 }}
    >
      {ready && geojson && (
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
      {ready && geojson && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-md bg-bg-dialog-active px-3 py-2 shadow-floating ring-1 ring-otl-gray-200">
          <div
            className="h-2.5 w-36 rounded-sm"
            style={{ background: `linear-gradient(to right, ${VAR_RAMPS[varKey].join(", ")})` }}
          />
          <div className="mt-1 flex justify-between text-body-xs tabular-nums text-txt-black-700">
            <span>{formatVal(min, varKey)}</span>
            <span>{formatVal(max, varKey)}</span>
          </div>
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
          <div className="mt-1.5 border-t border-otl-gray-200 pt-1.5 font-['IBM_Plex_Mono','Roboto_Mono',monospace] tabular-nums text-txt-black-900">
            {tooltip.value}
          </div>
        </div>
      )}
    </div>
  );
}
