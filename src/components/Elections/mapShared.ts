import { useEffect, useState } from "react";

export type MapFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  Record<string, any>
>;

export const MY_BOUNDS: [[number, number], [number, number]] = [
  [99.6, 0.85],
  [119.3, 7.35],
];

export const HIDE_LAYER_EXACT = [
  "country-label",
  "state-label",
  "settlement-label",
  "settlement-subdivision-label",
  "settlement-major-label",
  "settlement-minor-label",
];

export const LINE_PAINT = {
  "line-color": "#64748b",
  "line-width": 0.5,
};

/** True on touch-first devices, where map gestures need cooperative mode. */
export function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

export function filterFeatures(
  features: MapFeature[],
  stateFilter?: string,
  excludeStates?: string[],
): MapFeature[] {
  if (stateFilter) return features.filter((f) => f.properties?.state === stateFilter);
  if (excludeStates?.length)
    return features.filter((f) => !excludeStates.includes(f.properties?.state));
  return features;
}

export function bboxOfFeatures(
  features: MapFeature[],
): [[number, number], [number, number]] | null {
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
    else if (geom.type === "MultiPolygon")
      geom.coordinates.forEach((p) => p.forEach((r) => r.forEach(expand)));
  });
  if (minLng === Infinity) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

/** Fetch the choropleth GeoJSON once; returns null until loaded. */
export function useGeojson(mapUrl: string, enabled: boolean = true) {
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled || data) return;
    let cancelled = false;
    fetch(mapUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json as GeoJSON.FeatureCollection);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mapUrl, enabled]);

  return data;
}
