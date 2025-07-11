import { FC, useEffect, useState } from "react";
import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";

interface MapboxProps {}

const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

const Mapbox: FC<MapboxProps> = ({}) => {
  const { resolvedTheme } = useTheme();
  const [styleUrl, setStyleUrl] = useState(LIGHT_STYLE);

  useEffect(() => {
    if (resolvedTheme === "dark") setStyleUrl(DARK_STYLE);
    else setStyleUrl(LIGHT_STYLE);
  }, [resolvedTheme]);
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
