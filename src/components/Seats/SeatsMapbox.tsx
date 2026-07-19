import { FC, Fragment, useEffect, useRef, useState } from "react";
import Map, {
  AttributionControl,
  Layer,
  MapRef,
  Popup,
  Source,
} from "react-map-gl/mapbox";
import { maxBy } from "lodash";
import { createPortal } from "react-dom";

const MAPBOX_LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

const MAPBOX_COLOR_INDEX: [string, string][] = [
  ["rgba(255, 1, 0, 1)", "rgba(255, 194, 194, 0.5)"],
  ["rgba(255, 128, 0, 1)", "rgba(255, 206, 157, 0.5)"],
  ["rgba(255, 224, 50, 1)", "rgba(255, 241, 166, 0.5)"],
  ["rgba(0, 255, 1, 1)", "rgba(162, 255, 162, 0.5)"],
  ["rgba(1, 255, 255, 1)", "rgba(185, 255, 255, 0.5)"],
  ["rgba(1, 128, 255, 1)", "rgba(194, 224, 255, 0.5)"],
  ["rgba(255, 1, 255, 1)", "rgba(255, 191, 255, 0.5)"],
];

type MapPlot = {
  zoom: number;
  center: [number, number];
  polygons: Record<string, [string, string[]]>;
};

type LineageRowParlimen = { year: number; parlimen: string; n_duns: number; duns: string };
type LineageRowDun = { year: number; dun: string; parlimen: string };
type LineageRow = LineageRowParlimen | LineageRowDun;

interface Props {
  mapPlot: MapPlot;
  seatType: "parlimen" | "dun";
  mapboxToken: string;
  mapboxAccount: string;
  mapboxLabel: string;
  lineageTitle: string;
  lineageYearLabel: string;
  lineageParlimenLabel: string;
  lineageDunLabel: string;
  lineageNDunsLabel: string;
  lineageDunsLabel: string;
  lineage: LineageRow[];
  boundaryAttribution: string;
}

const SeatsMapbox: FC<Props> = ({
  mapPlot: initialMapPlot,
  seatType: initialSeatType,
  mapboxToken,
  mapboxAccount,
  mapboxLabel,
  lineageTitle,
  lineageYearLabel,
  lineageParlimenLabel,
  lineageDunLabel,
  lineageNDunsLabel,
  lineageDunsLabel,
  lineage: initialLineage,
  boundaryAttribution,
}) => {
  const [styleUrl, setStyleUrl] = useState(MAPBOX_LIGHT_STYLE);
  const mapRef = useRef<MapRef | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    year: string;
    seatName: string;
    longitude: number;
    latitude: number;
  } | null>(null);
  const [lineageOpen, setLineageOpen] = useState(false);

  useEffect(() => {
    if (!lineageOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLineageOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [lineageOpen]);

  const [mapPlot, setMapPlot] = useState(initialMapPlot);
  const [seatType, setSeatType] = useState(initialSeatType);
  const [lineage, setLineage] = useState(initialLineage);

  const boundData = Object.entries(mapPlot.polygons).sort(
    (a, b) => Number(b[0]) - Number(a[0]),
  );

  const [selectedBounds, setSelectedBounds] = useState(() => [
    boundData[0]?.[1][0] ?? "",
  ]);

  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark");
    setStyleUrl(dark ? MAPBOX_DARK_STYLE : MAPBOX_LIGHT_STYLE);

    const handler = (e: Event) => {
      setStyleUrl(
        (e as CustomEvent<{ theme: string }>).detail.theme === "dark" ? MAPBOX_DARK_STYLE : MAPBOX_LIGHT_STYLE,
      );
    };
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  const [longitude, latitude] = mapPlot.center;
  const filterProp = seatType === "parlimen" ? "parlimen" : "dun";

  const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
    const features = mapRef.current?.queryRenderedFeatures(e.point, {
      layers: selectedBounds.map((b) => `${b}-fill`),
    });

    if (features && features.length > 0) {
      const feats = features.map((feat) => ({
        ...feat,
        year: feat.source?.split("_").find((part) => /^\d{4}$/.test(part)) ?? "",
      }));
      const mostRecent = maxBy(feats, (f) => Number(f.year));
      if (mostRecent) {
        setPopupInfo({
          year: mostRecent.year,
          seatName:
            mostRecent.properties?.["dun"] ??
            mostRecent.properties?.["parlimen"] ??
            "",
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat,
        });
      }
    } else {
      setPopupInfo(null);
    }
  };

  const isDun = seatType === "dun";

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        reuseMaps={true}
        mapboxAccessToken={mapboxToken}
        initialViewState={{ longitude, latitude, zoom: mapPlot.zoom }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={styleUrl}
        attributionControl={false}
        interactiveLayerIds={boundData.map(([, [id]]) => `${id}-fill`)}
        onMouseMove={handleMouseMove}
      >
        <AttributionControl compact={true} customAttribution={boundaryAttribution} />

        {boundData.map(([year, [id, seats]], index) =>
          selectedBounds.includes(id) ? (
            <Fragment key={year}>
              <Source id={id} type="vector" url={`mapbox://${mapboxAccount}.${id}`}>
                <Layer
                  id={`${id}-line`}
                  type="line"
                  source-layer={id}
                  paint={{
                    "line-color": MAPBOX_COLOR_INDEX[index]?.[0] ?? "transparent",
                    "line-width": 2,
                    "line-opacity": 1,
                  }}
                  filter={["in", filterProp, ...seats]}
                />
                <Layer
                  id={`${id}-fill`}
                  type="fill"
                  source-layer={id}
                  paint={{
                    "fill-color":
                      selectedBounds.length <= 2
                        ? MAPBOX_COLOR_INDEX[index]?.[1]
                        : "transparent",
                  }}
                  filter={["in", filterProp, ...seats]}
                />
              </Source>
            </Fragment>
          ) : null,
        )}

        {/* Delimitation year legend / checklist */}
        <div className="absolute bottom-10 right-1/2 h-fit translate-x-1/2 lg:right-4 lg:top-4 lg:translate-x-0">
          <div className="flex h-fit w-[330px] flex-col rounded-md border border-otl-gray-200 bg-bg-dialog px-3 pb-2 pt-3 shadow-context-menu lg:w-40 lg:p-[5px]">
            <p className="px-2.5 py-1.5 text-center text-body-2xs font-medium text-txt-black-500 lg:text-start">
              {mapboxLabel}
            </p>
            <div className="flex h-[120px] flex-col flex-wrap gap-x-4 lg:h-full">
              {boundData.map(([year, [id]], index) => (
                <div
                  key={year}
                  className="flex items-center gap-2 py-1.5 text-body-xs font-medium text-txt-black-700 lg:px-2.5"
                >
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: MAPBOX_COLOR_INDEX[index]?.[0] }}
                  />
                  <p className="flex-1">{year}</p>
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-primary-600"
                    checked={selectedBounds.includes(id)}
                    disabled={selectedBounds.length === 1 && selectedBounds[0] === id}
                    onChange={(ev) => {
                      if (ev.target.checked) {
                        setSelectedBounds((prev) => {
                          const next = [...prev, id];
                          setTimeout(() => {
                            try {
                              const topId = boundData[0]?.[1][0];
                              if (topId && next.includes(topId)) {
                                mapRef.current?.moveLayer(`${topId}-fill`);
                                mapRef.current?.moveLayer(`${topId}-line`);
                              }
                            } catch {}
                          }, 50);
                          return next;
                        });
                      } else {
                        setSelectedBounds((prev) => prev.filter((b) => b !== id));
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Geo-history lineage table button */}
        {lineage.length > 0 && (
          <div className="absolute left-4 top-4">
            <button
              onClick={() => setLineageOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-2 text-body-xs font-medium shadow-button hover:bg-bg-washed"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              {lineageTitle}
            </button>
          </div>
        )}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
          >
            <p className="px-3 py-2 font-body text-body-xs text-txt-white">
              {popupInfo.seatName} ({popupInfo.year})
            </p>
          </Popup>
        )}
      </Map>

      {/* Lineage modal */}
      {lineageOpen && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[#000]/80"
            onClick={() => setLineageOpen(false)}
          />
          <div className="relative z-10 flex max-h-[calc(100%-40px)] w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-t-2xl bg-bg-white shadow-xl sm:w-fit sm:max-w-[calc(100vw-3rem)] sm:rounded-xl">
            <div className="flex items-center justify-between border-b border-otl-gray-200 px-4 py-4 sm:px-6">
              <h6 className="flex items-center gap-2 text-body-lg font-semibold">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
                {lineageTitle}
              </h6>
              <button
                onClick={() => setLineageOpen(false)}
                className="rounded-sm p-1 text-txt-black-500 opacity-70 hover:opacity-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Desktop table */}
              <div className="hidden max-w-full overflow-x-auto sm:block">
                <table className="w-max text-body-sm">
                  <thead>
                    <tr className="border-b border-otl-gray-200 bg-bg-washed text-txt-black-500">
                      <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{lineageYearLabel}</th>
                      {isDun ? (
                        <>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{lineageDunLabel}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{lineageParlimenLabel}</th>
                        </>
                      ) : (
                        <>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{lineageParlimenLabel}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-center font-medium">{lineageNDunsLabel}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{lineageDunsLabel}</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lineage.map((row, i) => (
                      <tr key={i} className="border-b border-otl-gray-200 odd:bg-bg-white even:bg-bg-black-50 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums">{row.year}</td>
                        {isDun ? (
                          <>
                            <td className="whitespace-nowrap px-4 py-3">{"dun" in row ? row.dun : ""}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-txt-black-500">{row.parlimen}</td>
                          </>
                        ) : (
                          <>
                            <td className="whitespace-nowrap px-4 py-3">{row.parlimen}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums">{"n_duns" in row ? row.n_duns : ""}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-txt-black-500">{"duns" in row ? row.duns : ""}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden">
                {lineage.map((row, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-otl-gray-200 px-4 py-3 odd:bg-bg-white even:bg-bg-black-50 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm font-medium">
                        {isDun ? ("dun" in row ? row.dun : "") : row.parlimen}
                      </span>
                      <span className="rounded-full bg-bg-danger-100 px-2 py-0.5 text-body-xs font-medium text-txt-danger">
                        {row.year}
                      </span>
                    </div>
                    {!isDun && "duns" in row && (
                      <p className="text-body-xs text-txt-black-500">
                        {"duns" in row ? row.duns : ""}{" "}
                        {"n_duns" in row ? `(${row.n_duns} DUNs)` : ""}
                      </p>
                    )}
                    {isDun && (
                      <p className="text-body-xs text-txt-black-500">{row.parlimen}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default SeatsMapbox;
