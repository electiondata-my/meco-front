import SectionGrid from "@components/Section/section-grid";
import { ElectionType, Region } from "@dashboards/types";
import { useTranslation } from "@hooks/useTranslation";
import { APP_NAME } from "@lib/config";
import { MapboxMapStyle } from "@lib/constants";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@govtechmy/myds-react/tabs";
import { Root, Thumb, Track } from "@radix-ui/react-slider";
import { useTheme } from "next-themes";
import { FC, Fragment, useEffect, useRef, useState } from "react";
import Map, {
  Layer,
  MapMouseEvent,
  MapRef,
  Popup,
  Source,
  ViewState,
  ViewStateChangeEvent,
} from "react-map-gl/mapbox";

interface RedelineationBeforeAfterMapProps {
  election_type: ElectionType;
  map_new: string;
  map_old: string;
  type: string;
}

interface BoundaryMapProps {
  boundaries: Array<{
    color: string;
    labelKey: "new_constituency" | "old_constituency";
    source: string;
  }>;
  id: string;
  election_type: ElectionType;
  map_new: string;
  map_old: string;
  onMove: (event: ViewStateChangeEvent) => void;
  styleUrl: string;
  tooltipOwner?: string | null;
  tooltipResetKey?: number;
  onTooltipOwnerChange?: (owner: string | null) => void;
  viewState: ViewState;
}

interface PopupInfo {
  latitude: number;
  longitude: number;
  newSeat: string;
  oldSeat: string;
}

const REGION_VIEW_STATE: Record<Region, ViewState> = {
  peninsular: {
    longitude: 102.5,
    latitude: 4.5,
    zoom: 5.6,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  sabah: {
    longitude: 117.0,
    latitude: 5.5,
    zoom: 6.5,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  sarawak: {
    longitude: 113.5,
    latitude: 2.5,
    zoom: 6.2,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
};

const RedelineationBeforeAfterMap: FC<RedelineationBeforeAfterMapProps> = ({
  election_type,
  map_new,
  map_old,
  type,
}) => {
  const { LIGHT_STYLE, DARK_STYLE } = MapboxMapStyle;
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation(["redelineation"]);
  const region = type as Region;
  const [styleUrl, setStyleUrl] = useState(LIGHT_STYLE);
  const [slider, setSlider] = useState(50);
  const [tooltipOwner, setTooltipOwner] = useState<string | null>(null);
  const [tooltipResetKey, setTooltipResetKey] = useState(0);
  const [viewState, setViewState] = useState<ViewState>(
    REGION_VIEW_STATE[region] ?? REGION_VIEW_STATE.peninsular,
  );

  useEffect(() => {
    setStyleUrl(resolvedTheme === "dark" ? DARK_STYLE : LIGHT_STYLE);
  }, [DARK_STYLE, LIGHT_STYLE, resolvedTheme]);

  useEffect(() => {
    setViewState(REGION_VIEW_STATE[region] ?? REGION_VIEW_STATE.peninsular);
  }, [region, map_new, map_old, election_type]);

  const primaryColor = resolvedTheme === "dark" ? "#FFFFFF" : "#18181B";
  const secondaryColor = "#DC2626";

  const handleMove = (event: ViewStateChangeEvent) => {
    setViewState(event.viewState);
  };

  const handleSliderChange = (value: number) => {
    setSlider(value);
    setTooltipOwner(null);
    setTooltipResetKey((current) => current + 1);
  };

  return (
    <SectionGrid>
      <div className="mx-auto w-full space-y-6">
        <h2 className="mx-auto max-w-[727px] text-center font-heading text-heading-2xs font-semibold">
          {t("map_explorer.title")}
        </h2>

        <Tabs
          size="small"
          variant="enclosed"
          className="space-y-6 lg:space-y-8"
          defaultValue="compare"
        >
          <TabsList className="mx-auto space-x-0 !py-0">
            <TabsTrigger value="compare">
              {t("map_explorer.tabs.compare")}
            </TabsTrigger>
            <TabsTrigger value="new">{t("new_constituency")}</TabsTrigger>
            <TabsTrigger value="old">{t("old_constituency")}</TabsTrigger>
          </TabsList>

          <TabsContent value="compare">
            <div className="space-y-3">
              <div className="relative mx-auto h-[520px] w-full overflow-hidden rounded-lg border border-otl-gray-200 lg:h-[640px] lg:max-w-screen-xl">
                <BoundaryMap
                  id="redelineation_new_compare_map"
                  election_type={election_type}
                  map_new={map_new}
                  map_old={map_old}
                  styleUrl={styleUrl}
                  tooltipOwner={tooltipOwner}
                  tooltipResetKey={tooltipResetKey}
                  viewState={viewState}
                  onMove={handleMove}
                  onTooltipOwnerChange={setTooltipOwner}
                  boundaries={[
                    {
                      source: map_new,
                      color: primaryColor,
                      labelKey: "new_constituency",
                    },
                  ]}
                />
                <div
                  className="absolute inset-0"
                  style={{ clipPath: `inset(0 0 0 ${slider}%)` }}
                >
                  <BoundaryMap
                    id="redelineation_old_compare_map"
                    election_type={election_type}
                    map_new={map_new}
                    map_old={map_old}
                    styleUrl={styleUrl}
                    tooltipOwner={tooltipOwner}
                    tooltipResetKey={tooltipResetKey}
                    viewState={viewState}
                    onMove={handleMove}
                    onTooltipOwnerChange={setTooltipOwner}
                    boundaries={[
                      {
                        source: map_old,
                        color: primaryColor,
                        labelKey: "old_constituency",
                      },
                    ]}
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-px bg-bg-black-900 dark:bg-bg-white"
                  style={{ left: `${slider}%` }}
                />
                <div
                  className="shadow-floating pointer-events-none absolute top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg-black-900 text-body-xs font-semibold text-txt-white dark:bg-bg-white dark:text-txt-black-900"
                  style={{ left: `${slider}%` }}
                >
                  ||
                </div>
                <Root
                  className="absolute inset-x-0 top-1/2 z-20 flex h-9 -translate-y-1/2 touch-none select-none items-center"
                  value={[slider]}
                  min={0}
                  max={100}
                  step={1}
                  aria-label={t("map_explorer.slider_label")}
                  onValueChange={([value]) => handleSliderChange(value)}
                >
                  <Track className="relative h-full grow bg-transparent" />
                  <Thumb className="block h-9 w-9 cursor-col-resize rounded-full bg-transparent outline-none focus-visible:ring-4 focus-visible:ring-fr-primary" />
                </Root>
                <MapCornerLabel position="left">
                  {t("new_constituency")}
                </MapCornerLabel>
                <MapCornerLabel position="right">
                  {t("old_constituency")}
                </MapCornerLabel>
              </div>
              <p className="text-center text-sm italic text-txt-black-500">
                {t("attribution_tindak")}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="new">
            <SingleMapFrame
              boundaries={[
                {
                  source: map_old,
                  color: secondaryColor,
                  labelKey: "old_constituency",
                },
                {
                  source: map_new,
                  color: primaryColor,
                  labelKey: "new_constituency",
                },
              ]}
              id="redelineation_new_map"
              election_type={election_type}
              map_new={map_new}
              map_old={map_old}
              onMove={handleMove}
              styleUrl={styleUrl}
              viewState={viewState}
            />
          </TabsContent>

          <TabsContent value="old">
            <SingleMapFrame
              boundaries={[
                {
                  source: map_new,
                  color: primaryColor,
                  labelKey: "new_constituency",
                },
                {
                  source: map_old,
                  color: secondaryColor,
                  labelKey: "old_constituency",
                },
              ]}
              id="redelineation_old_map"
              election_type={election_type}
              map_new={map_new}
              map_old={map_old}
              onMove={handleMove}
              styleUrl={styleUrl}
              viewState={viewState}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SectionGrid>
  );
};

const SingleMapFrame: FC<BoundaryMapProps> = (props) => {
  const { t } = useTranslation(["redelineation"]);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto h-[520px] w-full overflow-hidden rounded-lg border border-otl-gray-200 lg:h-[640px] lg:max-w-screen-xl">
        <BoundaryMap {...props} />
        <MapLegend boundaries={props.boundaries} />
      </div>
      <p className="text-center text-sm italic text-txt-black-500">
        {t("attribution_tindak")}
      </p>
    </div>
  );
};

const BoundaryMap: FC<BoundaryMapProps> = ({
  boundaries,
  election_type,
  id,
  map_new,
  map_old,
  onMove,
  onTooltipOwnerChange,
  styleUrl,
  tooltipOwner,
  tooltipResetKey,
  viewState,
}) => {
  const { t } = useTranslation(["redelineation"]);
  const mapRef = useRef<MapRef | null>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const querySources = [map_new, map_old];
  const orderedSources = [
    ...boundaries.map((boundary) => boundary.source),
    ...querySources.filter(
      (source) => !boundaries.some((boundary) => boundary.source === source),
    ),
  ];

  useEffect(() => {
    if (tooltipOwner && tooltipOwner !== id) setPopupInfo(null);
  }, [id, tooltipOwner]);

  useEffect(() => {
    setPopupInfo(null);
  }, [tooltipResetKey]);

  const handleMouseMove = (event: MapMouseEvent) => {
    onTooltipOwnerChange?.(id);

    const features = mapRef.current?.queryRenderedFeatures(event.point, {
      layers: querySources.map((source) => `${id}-${source}-fill`),
    });

    if (!features?.length) {
      setPopupInfo(null);
      return;
    }

    const getSeat = (source: string) => {
      const feature = features.find(
        (item) => item.layer.id === `${id}-${source}-fill`,
      );

      return (
        feature?.properties?.[
          election_type === "parlimen" ? "parlimen" : "dun"
        ] ?? ""
      );
    };

    const newSeat = getSeat(map_new);
    const oldSeat = getSeat(map_old);

    if (!newSeat && !oldSeat) {
      setPopupInfo(null);
      return;
    }

    setPopupInfo({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
      newSeat,
      oldSeat,
    });
  };

  return (
    <Map
      id={id}
      ref={mapRef}
      reuseMaps={true}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      {...viewState}
      style={{ width: "100%", height: "100%" }}
      mapStyle={styleUrl}
      customAttribution={APP_NAME}
      interactiveLayerIds={querySources.map((source) => `${id}-${source}-fill`)}
      onMove={onMove}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setPopupInfo(null);
        onTooltipOwnerChange?.(
          tooltipOwner === id ? null : (tooltipOwner ?? null),
        );
      }}
    >
      {orderedSources.map((source) => (
        <Fragment key={source}>
          <Source
            id={`${id}-${source}`}
            type="vector"
            url={`mapbox://${process.env.NEXT_PUBLIC_MAPBOX_ACCOUNT}.${source}`}
          >
            <Layer
              id={`${id}-${source}-fill`}
              type="fill"
              source-layer={source}
              paint={{
                "fill-color": "transparent",
                "fill-opacity": 0.01,
              }}
            />
            {boundaries
              .filter((boundary) => boundary.source === source)
              .map((boundary) => (
                <Layer
                  key={`${source}-line`}
                  id={`${id}-${source}-line`}
                  type="line"
                  source-layer={source}
                  paint={{
                    "line-color": boundary.color,
                    "line-width":
                      boundaries.findIndex((item) => item.source === source) ===
                      boundaries.length - 1
                        ? 1.5
                        : 1,
                    "line-opacity": 1,
                  }}
                />
              ))}
          </Source>
        </Fragment>
      ))}
      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
        >
          <div className="space-y-1 px-3 py-2 font-body text-body-xs text-txt-white">
            <p>
              {t("new")}: {popupInfo.newSeat || "-"}
            </p>
            <p>
              {t("old")}: {popupInfo.oldSeat || "-"}
            </p>
          </div>
        </Popup>
      )}
    </Map>
  );
};

const MapCornerLabel: FC<{
  children: string;
  position: "left" | "right";
}> = ({ children, position }) => {
  return (
    <div
      className={
        position === "left"
          ? "pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-otl-gray-200 bg-bg-dialog px-2.5 py-1.5 text-body-xs font-medium text-txt-black-700 shadow-context-menu"
          : "pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-otl-gray-200 bg-bg-dialog px-2.5 py-1.5 text-body-xs font-medium text-txt-black-700 shadow-context-menu"
      }
    >
      {children}
    </div>
  );
};

const MapLegend: FC<{
  boundaries: BoundaryMapProps["boundaries"];
}> = ({ boundaries }) => {
  const { t } = useTranslation(["redelineation"]);

  return (
    <div className="absolute right-4 top-4">
      <div className="flex w-[150px] flex-col rounded-md border border-otl-gray-200 bg-bg-dialog p-[5px] shadow-context-menu">
        <p className="px-2.5 py-1.5 text-start text-body-2xs font-medium text-txt-black-500">
          {t("map_explorer.legend.title")}
        </p>
        {[...boundaries].reverse().map((boundary) => (
          <div
            key={boundary.source}
            className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700"
          >
            <div
              className="h-0.5 w-3 shrink-0"
              style={{ backgroundColor: boundary.color }}
            />
            <p>{t(boundary.labelKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RedelineationBeforeAfterMap;
