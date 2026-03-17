import { DateTime } from "luxon";
import { DCDownloadType, MetaPage } from "@lib/types";
import {
  FunctionComponent,
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";

const TB_BASE = process.env.NEXT_PUBLIC_API_URL_TB;
const TB_INGEST_TOKEN = process.env.NEXT_PUBLIC_TINYBIRD_TOKEN;
const TB_READ_TOKEN = process.env.NEXT_PUBLIC_TINYBIRD_TOKEN_READ;

export type Meta = Omit<MetaPage["meta"], "type"> & {
  type: "dashboard" | "data-catalogue";
};

type AnalyticsContextProps = {
  views: number | null;
  downloads: Record<string, number> | null;
  trackDownload: (fileFormat: DCDownloadType) => void;
};

interface ContextChildren {
  meta: Meta;
  children: ReactNode;
}

export const AnalyticsContext = createContext<AnalyticsContextProps>({
  views: null,
  downloads: null,
  trackDownload: () => {},
});

export const AnalyticsProvider: FunctionComponent<ContextChildren> = ({
  meta,
  children,
}) => {
  const [views, setViews] = useState<number | null>(null);
  const [downloads, setDownloads] = useState<Record<string, number> | null>(
    null,
  );

  useEffect(() => {
    const fetchViews = async () => {
      try {
        const url = `${TB_BASE}/v0/pipes/views_by_dc.json?id=${meta.id}&token=${TB_READ_TOKEN}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch views");
        const json = await res.json();
        setViews(json.data?.[0]?.hits ?? 0);
      } catch (e) {
        console.error("fetchViews failed:", e);
      }
    };

    const fetchDownloads = async () => {
      try {
        const url = `${TB_BASE}/v0/pipes/downloads_by_dc_format.json?id=${meta.id}&token=${TB_READ_TOKEN}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch downloads");
        const json = await res.json();
        const counts: Record<string, number> = {};
        for (const row of json.data ?? []) {
          counts[row.file_format] = row.downloads ?? 0;
        }
        setDownloads(counts);
      } catch (e) {
        console.error("fetchDownloads failed:", e);
      }
    };

    fetchViews();
    fetchDownloads();
    trackPageView(meta.type);
  }, [meta.id]);

  const trackPageView = useCallback(
    (type: Meta["type"]): void => {
      const url = `${TB_BASE}/v0/events?name=edmy_views&token=${TB_INGEST_TOKEN}`;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: meta.id,
          timestamp: DateTime.now().setZone("Asia/Kuala_Lumpur").toISO(),
          type,
        }),
      }).catch(() => {});
    },
    [meta.id],
  );

  const trackDownload = useCallback(
    (fileFormat: DCDownloadType): void => {
      const url = `${TB_BASE}/v0/events?name=edmy_downloads&token=${TB_INGEST_TOKEN}`;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: meta.id,
          timestamp: DateTime.now().setZone("Asia/Kuala_Lumpur").toISO(),
          file_format: fileFormat,
        }),
      })
        .then((res) => {
          if (res.ok)
            setDownloads((prev) => ({
              ...prev,
              [fileFormat]: (prev?.[fileFormat] ?? 0) + 1,
            }));
        })
        .catch(() => {});
    },
    [meta.id],
  );

  return (
    <AnalyticsContext.Provider value={{ views, downloads, trackDownload }}>
      {children}
    </AnalyticsContext.Provider>
  );
};
