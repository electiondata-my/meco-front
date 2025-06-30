import { useContext } from "react";
import { AnalyticsContext } from "@lib/contexts/analytics";

/**
 * For data-catalogue only.
 */
export const useAnalytics = (dataset: any) => {
  const { result, realtime_track } = useContext(AnalyticsContext);

  const track = (ext: "svg" | "png" | "csv" | "parquet") => {
    const meta = {
      uid: dataset.meta.unique_id.concat(`_${ext}`),
      id: dataset.meta.unique_id,
      name: dataset.meta.title,
      type: ["svg", "png"].includes(ext) ? "image" : "file",
      ext,
    };
    realtime_track(dataset.meta.unique_id, "data-catalogue", `download_${ext}`);
  };
  return { result, track };
};
