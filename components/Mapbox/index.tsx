import { FC, useEffect, useState } from "react";
import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";

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

type MapboxProps = {} & ConditionalMapboxProps;

const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

const Mapbox: FC<MapboxProps> = ({ type, seatGeoJson }) => {
  const { resolvedTheme } = useTheme();
  const [styleUrl, setStyleUrl] = useState(LIGHT_STYLE);

  useEffect(() => {
    if (resolvedTheme === "dark") setStyleUrl(DARK_STYLE);
    else setStyleUrl(LIGHT_STYLE);
  }, [resolvedTheme]);

  if (type === "static") {
    const fullURl = `https://api.mapbox.com/styles/v1/mapbox/${resolvedTheme === "dark" ? "dark-v11" : "light-v11"}/static/${seatGeoJson}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
    return (
      <img src={fullURl} alt="mapbox-static-image" width={628} height={380} />
    );
  }

  return (
    <Map
      reuseMaps={true}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{
        longitude: 101.6869,
        latitude: 3.139,
        zoom: 10,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={styleUrl}
    />
  );
};

export default Mapbox;
