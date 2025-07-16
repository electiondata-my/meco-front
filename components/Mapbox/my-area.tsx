import { FC, useEffect, useRef, useState } from "react";
import Map, { Layer, MapRef, Source } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { fitGeoJSONBoundsToView } from "@lib/helpers";
import { Boundaries, ElectionType } from "@dashboards/types";
import { useTranslation } from "@hooks/useTranslation";
import { Checkbox } from "@govtechmy/myds-react/checkbox";
import { useRouter } from "next/router";
import { OptionType } from "@lib/types";
import { useSearchParams } from "next/navigation";

type SeatOption = {
  state: string;
  seat: string;
  type: ElectionType;
};

type MapboxDefault = {
  type: "map";
  seatGeoJson?: never;
};

type ConditionalMapboxProps =
  | {
      type: "static";
      seatGeoJson: string;
    }
  | MapboxDefault;

type MapboxProps = {
  boundaries: Boundaries;
  seat_info?: Omit<OptionType, "contests" | "losses" | "wins"> & SeatOption;
} & ConditionalMapboxProps;

const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

const COLOR_INDEX = [
  ["rgba(255, 1, 0, 1)", "rgba(255, 194, 194, 0.5)"],
  ["rgba(255, 128, 0, 1)", "rgba(255, 206, 157, 0.5)"],
  ["rgba(255, 224, 50, 1)", "rgba(255, 241, 166, 0.5)"],
  ["rgba(0, 255, 1, 1)", "rgba(162, 255, 162, 0.5)"],
  ["rgba(1, 255, 255, 1)", "rgba(185, 255, 255, 0.5)"],
  ["rgba(1, 128, 255, 1)", "rgba(194, 224, 255, 0.5)"],
  ["rgba(255, 1, 255, 1)", "rgba(255, 191, 255, 0.5)"],
];

const MapboxMyArea: FC<MapboxProps> = ({
  type,
  seatGeoJson,
  boundaries,
  seat_info,
}) => {
  const { resolvedTheme } = useTheme();
  const [styleUrl, setStyleUrl] = useState(LIGHT_STYLE);
  const { t } = useTranslation(["common", "home"]);

  console.log(boundaries);

  const { replace } = useRouter();

  const sp = useSearchParams();

  const currentBoundYers = sp.get("bound_years");

  // const usedTileset =

  const [selectedBounds, setSelectedBounds] = useState([
    Object.entries(boundaries.polygons).reverse()[0][1][0],
  ]);

  useEffect(() => {
    if (resolvedTheme === "dark") setStyleUrl(DARK_STYLE);
    else setStyleUrl(LIGHT_STYLE);
  }, [resolvedTheme]);

  if (type === "static") {
    const fullURl = `https://api.mapbox.com/styles/v1/mapbox/${resolvedTheme === "dark" ? "dark-v11" : "light-v11"}/static/${seatGeoJson}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
    return (
      <img src={fullURl} alt="mapbox-static-image" width={846} height={400} />
    );
  }

  const mapRef = useRef<MapRef | null>(null);

  const [longitude, latitude] = boundaries.center;

  const boundData = Object.entries(boundaries.polygons).sort(
    (a, b) => Number(b[0]) - Number(a[0]),
  );

  const [seat_type, seat] = seat_info ? seat_info.value.split("_") : ["", ""];

  return (
    <Map
      ref={mapRef}
      reuseMaps={true}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{
        longitude,
        latitude,
        zoom: boundaries.zoom,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={styleUrl}
      interactiveLayerIds={boundData.map(([years, hdata]) => hdata[0])}
    >
      {boundData.map(([year, [id, seats]], index) => (
        <>
          {selectedBounds.find((selected) => selected === id) && (
            <Source
              key={id}
              id={id}
              type="vector"
              url={`mapbox://${process.env.NEXT_PUBLIC_MAPBOX_ACCOUNT}.${id}`}
            >
              <Layer
                id={`${id}-line`}
                type="line"
                source-layer={id}
                paint={{
                  "line-color":
                    COLOR_INDEX[index]?.[0] ?? "rgba(220, 38, 38, 1)",
                  "line-width": 2,
                  "line-opacity": 1,
                }}
                filter={[
                  "in",
                  seat_type === "parlimen" ? "parlimen" : "dun",
                  ...seats,
                ]}
              />
              {selectedBounds.length <= 2 && (
                <Layer
                  id={`${id}-fill`}
                  type="fill"
                  source-layer={id}
                  source={id}
                  paint={{
                    "fill-color":
                      COLOR_INDEX[index]?.[1] ?? "rgba(220, 38, 38, 1)",
                  }}
                  filter={[
                    "in",
                    seat_type === "parlimen" ? "parlimen" : "dun",
                    ...seats,
                  ]}
                />
              )}
            </Source>
          )}
        </>
      ))}

      <div className="absolute bottom-10 right-4 flex h-fit w-[330px] flex-col rounded-md border border-otl-gray-200 bg-bg-dialog px-3 pb-2 pt-3 shadow-context-menu lg:right-4 lg:top-4 lg:w-40 lg:p-[5px]">
        <p className="px-2.5 py-1.5 text-center text-body-2xs font-medium text-txt-black-500 lg:text-start">
          {t("boundaries_years")}
        </p>
        <div className="flex h-[120px] flex-col flex-wrap gap-x-4 lg:h-full">
          {boundData.map(([year, hdata], index) => (
            <div className="flex items-center gap-2 py-1.5 text-body-xs font-medium text-txt-black-700 lg:px-2.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: COLOR_INDEX[index]?.[0] }}
              />
              <p className="flex-1">{year}</p>
              <Checkbox
                checked={Boolean(
                  selectedBounds.find((bound) => bound === hdata[0]),
                )}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const filter = [
                      ...selectedBounds.map(
                        (selected) => selected.split("_")[1],
                      ),
                      year,
                    ];

                    setSelectedBounds((prev) => [...prev, hdata[0]]);
                    replace(
                      `/${seat_type}/${seat}?bound_years=${filter.toString()}`,
                      undefined,
                      {
                        scroll: false,
                        shallow: true,
                      },
                    );
                  } else {
                    const filter = selectedBounds
                      .filter((bound) => bound !== hdata[0])
                      .map((selected) => selected.split("_")[1]);

                    setSelectedBounds((prev) =>
                      prev.filter((bound) => bound !== hdata[0]),
                    );

                    replace(
                      `/${seat_type}/${seat}?bound_years=${filter.toString()}`,
                      undefined,
                      {
                        scroll: false,
                        shallow: true,
                      },
                    );
                  }
                }}
                disabled={
                  selectedBounds.length === 1 && selectedBounds[0] === hdata[0]
                }
              />
            </div>
          ))}
        </div>
      </div>
    </Map>
  );
};

export default MapboxMyArea;
