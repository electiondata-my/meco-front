import { MapboxMapStyle } from "@lib/constants";
import { useTheme } from "next-themes";
import {
  Fragment,
  FunctionComponent,
  useEffect,
  useRef,
  useState,
} from "react";
import Map, {
  Layer,
  LngLatLike,
  MapRef,
  Marker,
  Source,
  useMap,
} from "react-map-gl/mapbox";
import bbox from "@turf/bbox";
import { FeatureCollection } from "geojson";
import ComboBox from "@components/Combobox";
import { useTranslation } from "@hooks/useTranslation";
import { useMediaQuery } from "@hooks/useMediaQuery";
import {
  ArrowBackCloseIcon,
  CrossIcon,
  HamburgerMenuIcon,
} from "@govtechmy/myds-react/icon";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTrigger,
  DrawerDescription,
} from "@components/drawer";
import ThemeToggle from "@components/Layout/Header/theme-toggle";
import { Button, ButtonIcon } from "@govtechmy/myds-react/button";
import { useRouter } from "next/router";
import { useData } from "@hooks/useData";
import { DialogTitle } from "@components/dialog";
import { useCache } from "@hooks/useCache";
import { get } from "@lib/api";
import { useToast } from "@govtechmy/myds-react/hooks";
import { clx } from "@lib/helpers";

interface DelimiationExplorerProps {
  sidebar: Record<string, Array<[string, string]>>;
  dropdown_data: { value: string; code: string }[];
}

const PENINSULAR_DEFAULT = {
  center: [102.5, 4.5] as LngLatLike,
  zoom: 6.6,
};

const SABAH_DEFAULT = {
  center: [117.0, 5.5] as LngLatLike,
  zoom: 7,
};
const SARAWAK_DEFAULT = {
  center: [113.5, 2.5] as LngLatLike,
  zoom: 6.8,
};

const MapExplorerDelimitation: FunctionComponent<DelimiationExplorerProps> = ({
  sidebar,
  dropdown_data,
}) => {
  const { LIGHT_STYLE, DARK_STYLE } = MapboxMapStyle;
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation(["common", "home"]);
  const { push } = useRouter();
  const { cache } = useCache();
  const { toast } = useToast();

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const { data, setData } = useData({
    open: false,
    styleUrl: LIGHT_STYLE,
    dropdown: dropdown_data.map(
      (
        d: any,
      ): {
        value: string;
        label: string;
        code: string;
        center: [number, number];
        zoom: number;
      } => ({
        value: d["dun"] || d["parlimen"],
        label: d["dun"] || d["parlimen"],
        code: d["code_dun"] || d["code_parlimen"],
        center: d.center,
        zoom: d.zoom,
      }),
    ),
    seat_value: "",
    loading: false,
    current_del: Object.entries(Object.values(sidebar)[0])[0][1][0][0],
  });

  const { open, styleUrl, dropdown, seat_value, current_del } = data;

  const [popupInfo, setPopupInfo] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (resolvedTheme === "dark") setData("styleUrl", DARK_STYLE);
    else setData("styleUrl", LIGHT_STYLE);
  }, [resolvedTheme]);

  const mapRef = useRef<MapRef | null>(null);

  const { mymap } = useMap();

  const handleClickPolygon = (e: mapboxgl.MapMouseEvent) => {
    if (!mymap) return;

    const features = mymap.queryRenderedFeatures(e.point, {
      layers: [`${current_del}-fill`],
    });

    if (features.length > 0) {
      const feature = features[0];

      const zoomData = dropdown.find(
        (d) =>
          (feature.properties && d.value === feature?.properties["parlimen"]) ||
          (feature.properties && d.value === feature?.properties["dun"]),
      );

      if (zoomData) {
        setPopupInfo({
          lat: zoomData.center[1],
          lng: zoomData.center[0],
          label: zoomData.label,
        });
        mymap.flyTo({
          center: zoomData.center,
          zoom: zoomData.zoom,
          duration: 1500,
        });
      }
      setData(
        "seat_value",
        feature.properties
          ? feature?.properties["dun"] || feature?.properties["parlimen"]
          : "",
      );
    }
  };

  const fetchDropdownList = async (source: string) => {
    const identifier = `dropdown_${source}`;
    new Promise(async (resolve) => {
      if (cache.has(identifier)) {
        setData("dropdown", cache.get(identifier));
        resolve(cache.get(identifier));
      }
      try {
        const response = await get(`/map/dropdown_${source}.json`);
        const { data } = response.data;

        const _dropdown = data.map(
          (
            d: any,
          ): {
            value: string;
            label: string;
            code: string;
            center: [number, number];
            zoom: number;
          } => ({
            value: d["dun"] || d["parlimen"],
            label: d["dun"] || d["parlimen"],
            code: d["code_dun"] || d["code_parlimen"],
            center: d.center,
            zoom: d.zoom,
          }),
        );

        setData("dropdown", _dropdown);
        cache.set(identifier, _dropdown);
        resolve(_dropdown);
      } catch (error) {
        toast({
          variant: "error",
          title: t("toast.request_failure"),
          description: t("toast.try_again"),
        });
      }
    });
  };

  return (
    <div className="relative h-screen max-h-screen w-full bg-bg-white">
      <Map
        id="mymap"
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        mapStyle={styleUrl}
        interactive={true}
        onClick={handleClickPolygon}
        interactiveLayerIds={[`${current_del}-fill`]}
        logoPosition="top-right"
        onLoad={(e) => {
          // onload, read the source tileset, and then fitBound to jump to tileset
          const map = e.target;
          if (!map) return;

          const features = map.querySourceFeatures(current_del, {
            sourceLayer: current_del,
          });

          if (features.length > 0) {
            const featureCollection: FeatureCollection = {
              type: "FeatureCollection",
              features: features,
            };

            const [minLng, minLat, maxLng, maxLat] = bbox(featureCollection);

            map.fitBounds(
              [
                [minLng, minLat],
                [maxLng, maxLat],
              ],
              {
                padding: 40,
                duration: 1000,
              },
            );
          }
        }}
      >
        <Source
          key={current_del}
          type="vector"
          id={current_del}
          url={`mapbox://${process.env.NEXT_PUBLIC_MAPBOX_ACCOUNT}.${current_del}`}
        >
          <Layer
            id={`${current_del}-fill`}
            source-layer={current_del}
            type="fill"
            paint={{
              "fill-color": [
                "coalesce",
                ["get", "colour"],
                "rgba(220, 38, 38, 1)",
              ],
              "fill-opacity": 0.8,
            }}
          />
          <Layer
            id={`${current_del}-line`}
            type="line"
            source-layer={current_del}
            paint={{
              "line-color": "#3f3f46",
              "line-width": 1,
              "line-opacity": 1,
            }}
          />
        </Source>

        {popupInfo && (
          <Marker
            anchor="top"
            longitude={Number(popupInfo.lng)}
            latitude={Number(popupInfo.lat)}
          >
            <div>{popupInfo.label}</div>
          </Marker>
        )}

        <div className="absolute right-1/2 top-4 flex w-[325px] translate-x-1/2 items-start gap-2 px-4 py-4 sm:w-[500px] lg:left-10 lg:top-0 lg:translate-x-0">
          <ComboBox<{
            value: string;
            code: string;
            center: [number, number];
            zoom: number;
          }>
            placeholder={t("search_seat", { ns: "home" })}
            options={dropdown}
            config={{
              keys: ["label"],
            }}
            format={(option) => (
              <>
                <span className="text-body-sm">{`${option.label} `}</span>
              </>
            )}
            selected={
              data.seat_value
                ? dropdown.find((e) => e.value === data.seat_value)
                : null
            }
            onChange={(selected) => {
              if (selected) {
                setData("seat_value", selected.value);

                if (!mymap) return;

                setPopupInfo({
                  lat: selected.center[1],
                  lng: selected.center[0],
                  label: selected.label,
                });

                mymap.flyTo({
                  center: selected.center,
                  zoom: selected.zoom,
                  duration: 1500,
                });
              } else setData("seat_value", "");
            }}
          />
        </div>
      </Map>
      <div className="absolute left-0 top-4 flex h-screen w-fit items-start gap-2 lg:left-0 lg:top-0 lg:translate-x-0">
        <div className="flex h-full w-12 flex-col items-center justify-center py-4">
          <MapDrawer
            open={open}
            setOpen={(open) => setData("open", open)}
            sidebar={sidebar}
            current={current_del}
            setDelimitation={(selected) => {
              if (current_del !== selected) {
                setData("current_del", selected);
                setData("seat_value", "");
                fetchDropdownList(selected);
                setData("open", false);
                setPopupInfo(null);

                if (!mymap) return;

                const { center, zoom } = selected.includes("sabah")
                  ? SABAH_DEFAULT
                  : selected.includes("sarawak")
                    ? SARAWAK_DEFAULT
                    : PENINSULAR_DEFAULT;

                mymap.flyTo({
                  center: center,
                  zoom: zoom,
                  duration: 1500,
                });
              }
            }}
          />
          <div className="flex h-full flex-col justify-end gap-2">
            <ThemeToggle />
            <Button variant={"default-ghost"} onClick={() => push("/")}>
              <ButtonIcon>
                <ArrowBackCloseIcon className="size-6" />
              </ButtonIcon>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapExplorerDelimitation;

interface MapDrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  sidebar: Record<string, Array<[string, string]>>;
  setDelimitation: (selected: string) => void;
  current: string;
}

const MapDrawer: FunctionComponent<MapDrawerProps> = ({
  open,
  setOpen,
  sidebar,
  current,
  setDelimitation,
}) => {
  const type = Object.keys(sidebar)[0];
  const value = Object.values(sidebar)[0];

  return (
    <Drawer
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
      }}
      direction="left"
    >
      <DrawerTrigger asChild className="h-[44px]">
        <Button variant={"default-ghost"}>
          <ButtonIcon>
            <HamburgerMenuIcon className="size-6 text-txt-black-500" />
          </ButtonIcon>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-screen max-h-screen w-4/5 rounded-tl-none bg-bg-white px-4 py-2 font-body text-body-md lg:w-1/5">
        <DrawerHeader className="flex items-center px-0">
          <DialogTitle className="flex-1">{type}</DialogTitle>
          <DrawerDescription></DrawerDescription>
          <DrawerClose className="self-end">
            <CrossIcon className="size-6" />
          </DrawerClose>
        </DrawerHeader>

        <div className="hide-scrollbar space-y-1 overflow-scroll px-1">
          {Object.entries(value).map(([label, list]) => (
            <Fragment key={label}>
              <h4 className="py-1 font-semibold">{label}</h4>
              {list.map((l) => (
                <Button
                  key={l}
                  variant={"default-ghost"}
                  className={clx(
                    "w-full hover:bg-bg-washed-active",
                    current === l[0] &&
                      "bg-bg-danger-600/50 text-txt-white hover:bg-bg-danger-600/80",
                  )}
                  onClick={(e) => {
                    setDelimitation(l[0]);
                  }}
                >
                  {l[1]}
                </Button>
              ))}
            </Fragment>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
