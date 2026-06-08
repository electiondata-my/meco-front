import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import Map, { Source, Layer, AttributionControl } from "react-map-gl/mapbox";
import type { MapMouseEvent } from "react-map-gl/mapbox";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import {
  ArrowDownTrayIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  EyeIcon,
  GlobeAltIcon,
  ListBulletIcon,
  TableCellsIcon,
} from "@heroicons/react/20/solid";
import { clx } from "@lib/helpers";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("python", python);
hljs.registerLanguage("r", r);

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatalogueField {
  name: string;
  title: string;
  description: string;
}

interface MapCiteData {
  instructions: string;
  type: string;
  id: string;
  title: string;
  author: string;
  journal: string;
  year: string;
}

interface MapDownloadInfo {
  link: string;
  n_objects: number;
  n_attributes: number;
  size_bytes: number;
}

interface MapDisplayOptions {
  mapbox_key: string;
  zoom: { desktop: number; mobile: number };
  center: { desktop: [number, number]; mobile: [number, number] };
  fill_colour: string;
  fill_opacity: number;
  stroke_colour: string;
  stroke_opacity: number;
  stroke_width: number;
}

interface MapCatalogueData {
  catalogue_type: "MAP";
  title: string;
  data_as_of: string;
  last_updated: string;
  description: string;
  methodology: string;
  fields: CatalogueField[];
  cite: MapCiteData;
  download: {
    geojson: MapDownloadInfo;
    topojson: MapDownloadInfo;
    geoparquet: MapDownloadInfo;
    flatgeobuf: MapDownloadInfo;
    kml: MapDownloadInfo;
  };
  display_options: { map: MapDisplayOptions };
  sample_data: Record<string, unknown>[];
}

interface Props {
  data: Record<string, unknown>;
  id: string;
  category: string;
  subcategory: string;
  tbToken: string;
  tbHost: string;
  mapboxToken: string;
  mapboxAccount: string;
}

type Tab = "map" | "attributes" | "variables" | "methodology";
type CodeLang = "python" | "r" | "curl";
type CopyState = "idle" | "copied";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseField(description: string): { type: string; desc: string } {
  const m = description.match(/^\[(\w+)\]\s*(.*)/s);
  return m ? { type: m[1], desc: m[2] } : { type: "", desc: description };
}

function formatBytes(bytes: number): string {
  const MB = 1024 * 1024;
  const GB = 1024 * MB;
  if (bytes >= 0.5 * GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= 0.5 * MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\\n/g, "\n");
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function highlightSnippet(code: string, language: string): string {
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

function formatAuthorFull(author: string): string {
  const trimmed = author.trim();
  if (trimmed.includes(",")) return trimmed;
  const parts = trimmed.split(/\s+/u);
  if (parts.length < 2) return trimmed;
  const family = parts.at(-1);
  const given = parts.slice(0, -1).join(" ");
  return `${family}, ${given}`;
}

function formatAuthorInitial(author: string): string {
  const full = formatAuthorFull(author);
  const [family, given = ""] = full.split(",").map((part) => part.trim());
  if (!given) return full;
  const initials = given
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => `${part[0]}.`)
    .join(" ");
  return `${family}, ${initials}`;
}

function toIsoSeconds(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/u, "");
}

function toColorExpr(value: string): string | [string, string] {
  if (!value.startsWith("#")) return ["get", value];
  return value;
}

// ── Citation ──────────────────────────────────────────────────────────────────

function buildAPA(c: MapCiteData): string {
  return `${formatAuthorInitial(c.author)} (${c.year}). ${c.title}. ${c.journal}.`;
}

function buildMLA(c: MapCiteData): string {
  return `${formatAuthorFull(c.author)}. "${c.title}." ${c.journal} (${c.year}).`;
}

function buildChicago(c: MapCiteData): string {
  return `${formatAuthorFull(c.author)}. "${c.title}." ${c.journal} (${c.year}).`;
}

function buildHarvard(c: MapCiteData): string {
  return `${formatAuthorInitial(c.author)} ${c.year}, ${c.title}. ${c.journal}.`;
}

function buildBibTeX(c: MapCiteData): string {
  return `@${c.type}{${c.id},\n  author  = {${formatAuthorFull(c.author)}},\n  title   = {${c.title}},\n  journal = {${c.journal}},\n  year    = {${c.year}}\n}`;
}

function CitationMarkup({
  style,
  cite,
}: {
  style: "apa" | "mla" | "chicago" | "harvard";
  cite: MapCiteData;
}) {
  if (style === "apa") {
    return (
      <>
        {formatAuthorInitial(cite.author)} ({cite.year}). {cite.title}.{" "}
        <em>{cite.journal}</em>.
      </>
    );
  }
  if (style === "mla") {
    return (
      <>
        {formatAuthorFull(cite.author)}. "{cite.title}." <em>{cite.journal}</em>{" "}
        ({cite.year}).
      </>
    );
  }
  if (style === "chicago") {
    return (
      <>
        {formatAuthorFull(cite.author)}. "{cite.title}." <em>{cite.journal}</em>{" "}
        ({cite.year}).
      </>
    );
  }
  return (
    <>
      {formatAuthorInitial(cite.author)} {cite.year}, {cite.title}.{" "}
      <em>{cite.journal}</em>.
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const cls: Record<string, string> = {
    String:  "bg-bg-black-100 text-txt-black-600",
    Integer: "bg-bg-danger-100 text-txt-danger",
    Float:   "bg-bg-warning-100 text-txt-warning",
    Date:    "bg-bg-black-100 text-txt-black-600",
  };
  if (!type) return null;
  return (
    <span
      className={clx(
        "inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-medium",
        cls[type] ?? "bg-bg-black-100 text-txt-black-600",
      )}
    >
      {type}
    </span>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <h2 className="mb-6 font-poppins text-[1.1rem] font-semibold text-txt-black-900">
      {label}
    </h2>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setState("copied");
    setTimeout(() => setState("idle"), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex shrink-0 items-center gap-1 px-2 py-1 text-[13px] font-medium text-txt-black-600 transition-colors hover:text-txt-black-900"
    >
      {state === "copied" ? (
        <>
          <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </button>
  );
}

// ── CatalogueMap ──────────────────────────────────────────────────────────────

interface CatalogueMapProps {
  opts: MapDisplayOptions;
  fields: CatalogueField[];
  mapboxToken: string;
  mapboxAccount: string;
}

function CatalogueMap({ opts, fields, mapboxToken, mapboxAccount }: CatalogueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    props: Record<string, unknown>;
  } | null>(null);
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const sourceUrl = `mapbox://${mapboxAccount}.${opts.mapbox_key}`;
  const sourceLayer = opts.mapbox_key;

  const fillColorExpr = useMemo(() => toColorExpr(opts.fill_colour), [opts.fill_colour]);
  const strokeColorExpr = useMemo(() => toColorExpr(opts.stroke_colour), [opts.stroke_colour]);

  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      if (!e.features?.length || !containerRef.current) {
        setTooltip(null);
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
        props: (e.features[0].properties ?? {}) as Record<string, unknown>,
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <div ref={containerRef} className="relative" style={{ height: 480 }}>
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: opts.center.desktop[0],
          latitude: opts.center.desktop[1],
          zoom: opts.zoom.desktop,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
        attributionControl={false}
        interactiveLayerIds={["catalogue-fill"]}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <AttributionControl compact />
        <Source id="catalogue-src" type="vector" url={sourceUrl}>
          <Layer
            id="catalogue-fill"
            type="fill"
            source-layer={sourceLayer}
            paint={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              "fill-color": fillColorExpr as any,
              "fill-opacity": opts.fill_opacity,
            }}
          />
          <Layer
            id="catalogue-line"
            type="line"
            source-layer={sourceLayer}
            paint={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              "line-color": strokeColorExpr as any,
              "line-opacity": opts.stroke_opacity,
              "line-width": opts.stroke_width,
            }}
          />
        </Source>
      </Map>
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-md bg-bg-dialog-active px-3 py-2.5 shadow-floating ring-1 ring-otl-gray-200"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: "auto auto" }}>
            {fields.map((f) => (
              <>
                <span key={`${f.name}-label`} className="text-right text-[13px] text-txt-black-400">
                  {f.title}:
                </span>
                <span key={`${f.name}-value`} className="text-[13px] font-medium text-txt-black-900">
                  {String(tooltip.props[f.name] ?? "—")}
                </span>
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DataCatalogueShowMap({
  data: rawData,
  id,
  category,
  subcategory,
  tbToken,
  tbHost,
  mapboxToken,
  mapboxAccount,
}: Props) {
  const data = rawData as unknown as MapCatalogueData;

  const [activeTab,     setActiveTab]     = useState<Tab>("map");
  const [codeLanguage,  setCodeLanguage]  = useState<CodeLang>("python");
  const [viewCount,     setViewCount]     = useState<number | null>(null);
  const [downloadCount, setDownloadCount] = useState<number | null>(null);

  const appendTinybirdEvent = useCallback(
    (name: "edmy_views" | "edmy_downloads", payload: Record<string, string>) => {
      if (!tbToken || !tbHost) return;
      fetch(`${tbHost}/v0/events?name=${name}&format=json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tbToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    },
    [tbToken, tbHost],
  );

  const trackDownload = useCallback(
    (fileFormat: string) => {
      setDownloadCount((count) => (count == null ? count : count + 1));
      appendTinybirdEvent("edmy_downloads", {
        id,
        file_format: fileFormat,
        timestamp: toIsoSeconds(),
      });
    },
    [appendTinybirdEvent, id],
  );

  useEffect(() => {
    if (!tbToken || !tbHost) return;
    appendTinybirdEvent("edmy_views", {
      id,
      type: "data-catalogue",
      timestamp: toIsoSeconds(),
    });

    fetch(`${tbHost}/v0/pipes/views_by_dc.json?token=${tbToken}&id=${id}`)
      .then((r) => r.json())
      .then((d) => setViewCount(d?.data?.[0]?.hits ?? null))
      .catch(() => {});

    fetch(`${tbHost}/v0/pipes/downloads_by_dc_format.json?token=${tbToken}&id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        const total = Array.isArray(d?.data)
          ? d.data.reduce(
              (sum: number, row: { downloads?: number }) => sum + Number(row.downloads ?? 0),
              0,
            )
          : null;
        setDownloadCount(total);
      })
      .catch(() => {});
  }, [tbToken, tbHost, id, appendTinybirdEvent]);

  const { geoparquet, geojson, topojson, flatgeobuf, kml } = data.download;
  const mapOpts = data.display_options.map;

  const snippets: Record<CodeLang, string> = useMemo(() => {
    const gpqUrl      = geoparquet.link;
    const gpqFilename = gpqUrl.split("/").pop() ?? "data.parquet";
    return {
      python: [
        "import geopandas as gpd",
        "",
        `URL = "${gpqUrl}"`,
        "",
        "gdf = gpd.read_parquet(URL)",
        `print(gdf.shape)   # (${geoparquet.n_objects}, ${geoparquet.n_attributes})`,
        "print(gdf.crs)",
        "gdf",
      ].join("\n"),
      r: [
        "library(sfarrow)",
        "",
        `url <- "${gpqUrl}"`,
        "",
        "gdf <- st_read_parquet(url)",
        "print(st_crs(gdf))",
        "head(gdf)",
      ].join("\n"),
      curl: [
        "# Download the GeoParquet file",
        `curl -L -o ${gpqFilename} "${gpqUrl}"`,
      ].join("\n"),
    };
  }, [geoparquet]);

  const snippetLanguage: Record<CodeLang, string> = {
    python: "python",
    r:      "r",
    curl:   "bash",
  };

  const highlightedSnippet = useMemo(
    () => highlightSnippet(snippets[codeLanguage], snippetLanguage[codeLanguage]),
    [snippets, codeLanguage],
  );

  const citations = useMemo(
    () => ({
      apa:     buildAPA(data.cite),
      mla:     buildMLA(data.cite),
      chicago: buildChicago(data.cite),
      harvard: buildHarvard(data.cite),
      bibtex:  buildBibTeX(data.cite),
    }),
    [data.cite],
  );

  const tabItems = [
    { tab: "map"         as const, label: "Map",         Icon: GlobeAltIcon    },
    { tab: "attributes"  as const, label: "Attributes",  Icon: TableCellsIcon  },
    { tab: "variables"   as const, label: "Variables",   Icon: ListBulletIcon  },
    { tab: "methodology" as const, label: "Methodology", Icon: DocumentTextIcon },
  ];

  const footerLinks = [
    { label: "Download", href: "#dc-download", Icon: ArrowDownTrayIcon },
    { label: "Code",     href: "#dc-code",     Icon: CodeBracketIcon   },
    { label: "Cite",     href: "#dc-cite",     Icon: BookOpenIcon      },
  ] as const;

  const catalogueSectionTitle = subcategory ? `${category}: ${subcategory}` : category;
  const catalogueSectionHref  = catalogueSectionTitle
    ? `/data-catalogue#${slugify(catalogueSectionTitle)}`
    : "/data-catalogue";

  const scrollTo = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-3 sm:px-4.5 md:px-6">
      <div className="mx-auto w-full max-w-screen-xl pb-24 pt-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-txt-black-400">
          <a href="/data-catalogue" className="hover:text-txt-black-700">
            Data Catalogue
          </a>
          {catalogueSectionTitle && (
            <>
              <span>&gt;</span>
              <a href={catalogueSectionHref} className="hover:text-txt-black-700">
                {catalogueSectionTitle}
              </a>
            </>
          )}
        </nav>

        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h1 className="font-poppins text-[1.875rem] font-semibold leading-tight text-txt-black-900 sm:text-[2rem]">
            {data.title}
          </h1>
          <p className="shrink-0 pt-1 text-[13px] text-txt-black-500">
            Last updated: {formatDate(data.last_updated)}
          </p>
        </div>
        <p className="mb-3 max-w-3xl text-body-md text-txt-black-600">
          {data.description}
        </p>
        <div className="mb-8 flex flex-wrap items-center gap-3 text-[13px] text-txt-black-500">
          <span className="flex items-center gap-1.5">
            <EyeIcon className="h-4 w-4 shrink-0 text-txt-black-400" />
            {viewCount === null ? "--" : viewCount.toLocaleString()} views
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowDownTrayIcon className="h-4 w-4 shrink-0 text-txt-black-400" />
            {downloadCount === null ? "--" : downloadCount.toLocaleString()} downloads
          </span>
        </div>

        {/* ── Preview block ───────────────────────────────────── */}
        <div className="mb-10 overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-white">

          {/* Tab bar */}
          <div className="grid grid-cols-2 border-b border-otl-gray-200 px-1 sm:flex sm:items-center">
            {tabItems.map(({ tab, label, Icon }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clx(
                  "flex items-center justify-center gap-1.5 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors sm:justify-start",
                  activeTab === tab
                    ? "border-txt-black-900 text-txt-black-900"
                    : "border-transparent text-txt-black-500 hover:text-txt-black-700",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
            <p className="ml-auto hidden py-3 pr-3 text-[13px] text-txt-black-500 sm:block">
              {geoparquet.n_objects.toLocaleString()} features × {geoparquet.n_attributes} attributes
            </p>
          </div>

          {/* Tab panels — map stays mounted to avoid remounting Mapbox */}
          <div>
            <div className={activeTab === "map" ? "" : "hidden"}>
              <CatalogueMap
                opts={mapOpts}
                fields={data.fields}
                mapboxToken={mapboxToken}
                mapboxAccount={mapboxAccount}
              />
            </div>

            {activeTab === "attributes" && (
              <div className="max-h-[calc(15*2.25rem+3rem)] overflow-auto">
                {data.sample_data.length === 0 ? (
                  <p className="px-4 py-10 text-center text-[13px] text-txt-black-400">
                    No sample data available.
                  </p>
                ) : (
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        {Object.keys(data.sample_data[0]).map((col) => (
                          <th
                            key={col}
                            className="sticky top-0 z-10 whitespace-nowrap border-b border-otl-gray-200 bg-bg-white px-3 py-2 text-left font-mono text-[12px] font-semibold uppercase tracking-wider text-txt-black-400 shadow-[inset_0_-1px_0_rgb(var(--otl-gray-200))]"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.sample_data.map((row, ri) => (
                        <tr
                          key={ri}
                          className="border-b border-otl-gray-100 transition-colors last:border-0 hover:bg-bg-black-50/60"
                        >
                          {Object.keys(data.sample_data[0]).map((col) => (
                            <td
                              key={col}
                              className="whitespace-nowrap px-3 py-1.5 font-mono text-[13px] text-txt-black-800"
                            >
                              {row[col] == null ? (
                                <span className="italic text-txt-black-300">—</span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "methodology" && (
              <div className="markdown max-w-none px-6 py-5">
                <ReactMarkdown>{normalizeMarkdown(data.methodology)}</ReactMarkdown>
              </div>
            )}

            <div className={activeTab === "variables" ? "" : "hidden"}>
              <div className="max-h-[calc(15*2.25rem+3rem)] overflow-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-10 border-b border-otl-gray-200 bg-bg-white px-4 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-txt-black-400">
                        Column
                      </th>
                      <th className="sticky top-0 z-10 border-b border-otl-gray-200 bg-bg-white px-4 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-txt-black-400">
                        Type
                      </th>
                      <th className="sticky top-0 z-10 border-b border-otl-gray-200 bg-bg-white px-4 py-2 text-left text-[12px] font-semibold uppercase tracking-wider text-txt-black-400">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fields.map((field) => {
                      const { type, desc } = parseField(field.description);
                      return (
                        <tr
                          key={field.name}
                          className="border-b border-otl-gray-100 transition-colors last:border-0 hover:bg-bg-black-50/60"
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-txt-black-800">
                            {field.name}
                          </td>
                          <td className="px-4 py-2.5">
                            <TypeBadge type={type} />
                          </td>
                          <td className="px-4 py-2.5 text-[13px] text-txt-black-600">
                            {desc}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Persistent footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-otl-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 text-[12px] text-txt-black-500">
              <span
                title="Creative Commons Zero — No Rights Reserved"
                className="flex h-5 w-8 items-center justify-center rounded border border-current text-[10px] font-bold leading-none"
              >
                CC0
              </span>
              <span>Dedicated to the public domain</span>
            </div>
            <div className="flex items-center gap-1">
              {footerLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  onClick={scrollTo(href)}
                  className="flex items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-txt-black-500 transition-colors hover:text-txt-black-900"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Narrowed sections ──────────────────────────────── */}
        <div className="lg:px-[16.667%]">

          {/* ── Download ─────────────────────────────────────── */}
          <section id="dc-download" className="mb-12">
            <SectionDivider label="Download" />

            {/* Row 1: GeoJSON + GeoParquet (both recommended) */}
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* GeoJSON */}
              <div className="overflow-hidden rounded-xl border border-otl-danger-200 bg-bg-white">
                <div className="flex items-center justify-between gap-3 bg-bg-danger-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-otl-danger-200 bg-bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-txt-danger">
                      GJ
                    </span>
                    <span className="text-[14px] font-semibold text-txt-black-900">GeoJSON</span>
                  </div>
                  <span className="rounded-full bg-bg-white px-2 py-0.5 text-[11px] font-semibold text-txt-danger">
                    Recommended
                  </span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-otl-gray-200 border-b border-otl-gray-200">
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Features</p>
                    <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{geojson.n_objects.toLocaleString()}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Attributes</p>
                    <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{geojson.n_attributes}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Size</p>
                    <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{formatBytes(geojson.size_bytes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3">
                  <a
                    href={geojson.link}
                    download
                    onClick={() => trackDownload("geojson")}
                    className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-txt-black-600 transition-colors hover:text-txt-black-900"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                    Download
                  </a>
                  <CopyButton text={geojson.link} label="Copy link" />
                </div>
              </div>

              {/* GeoParquet */}
              <div className="overflow-hidden rounded-xl border border-otl-danger-200 bg-bg-white">
                <div className="flex items-center justify-between gap-3 bg-bg-danger-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-otl-danger-200 bg-bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-txt-danger">
                      GPQ
                    </span>
                    <span className="text-[14px] font-semibold text-txt-black-900">GeoParquet</span>
                  </div>
                  <span className="rounded-full bg-bg-white px-2 py-0.5 text-[11px] font-semibold text-txt-danger">
                    Recommended
                  </span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-otl-gray-200 border-b border-otl-gray-200">
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Features</p>
                    <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{geoparquet.n_objects.toLocaleString()}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Attributes</p>
                    <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{geoparquet.n_attributes}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Size</p>
                    <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{formatBytes(geoparquet.size_bytes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3">
                  <a
                    href={geoparquet.link}
                    download
                    onClick={() => trackDownload("geoparquet")}
                    className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-txt-black-600 transition-colors hover:text-txt-black-900"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                    Download
                  </a>
                  <CopyButton text={geoparquet.link} label="Copy link" />
                </div>
              </div>
            </div>

            {/* Row 2: TopoJSON + FlatGeoBuf */}
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {([
                { abbr: "TJ",  label: "TopoJSON",   info: topojson,   format: "topojson"   },
                { abbr: "FGB", label: "FlatGeoBuf", info: flatgeobuf, format: "flatgeobuf" },
              ] as const).map(({ abbr, label, info, format }) => (
                <div key={format} className="overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-white">
                  <div className="flex items-center gap-2 border-b border-otl-gray-200 bg-bg-washed px-4 py-3">
                    <span className="rounded border border-otl-gray-200 bg-bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-txt-black-500">
                      {abbr}
                    </span>
                    <span className="text-[14px] font-semibold text-txt-black-900">{label}</span>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-otl-gray-200 border-b border-otl-gray-200">
                    <div className="px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Features</p>
                      <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{info.n_objects.toLocaleString()}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Attributes</p>
                      <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{info.n_attributes}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Size</p>
                      <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{formatBytes(info.size_bytes)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3">
                    <a
                      href={info.link}
                      download
                      onClick={() => trackDownload(format)}
                      className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-txt-black-600 transition-colors hover:text-txt-black-900"
                    >
                      <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                      Download
                    </a>
                    <CopyButton text={info.link} label="Copy link" />
                  </div>
                </div>
              ))}
            </div>

            {/* Row 3: KML */}
            <div className="sm:w-1/2">
            <div className="overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-white">
              <div className="flex items-center gap-2 border-b border-otl-gray-200 bg-bg-washed px-4 py-3">
                <span className="rounded border border-otl-gray-200 bg-bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-txt-black-500">
                  KML
                </span>
                <span className="text-[14px] font-semibold text-txt-black-900">KML</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-otl-gray-200 border-b border-otl-gray-200">
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Features</p>
                  <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{kml.n_objects.toLocaleString()}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Attributes</p>
                  <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{kml.n_attributes}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Size</p>
                  <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{formatBytes(kml.size_bytes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <a
                  href={kml.link}
                  download
                  onClick={() => trackDownload("kml")}
                  className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-txt-black-600 transition-colors hover:text-txt-black-900"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                  Download
                </a>
                <CopyButton text={kml.link} label="Copy link" />
              </div>
            </div>
            </div>
          </section>

          {/* ── Programmatic Access ───────────────────────────── */}
          <section id="dc-code" className="mb-12">
            <SectionDivider label="Programmatic Access" />

            <div className="overflow-hidden rounded-xl border border-otl-gray-200">
              <div className="flex items-center justify-between border-b border-otl-gray-200 px-3 py-2">
                <div className="flex gap-1">
                  {(["python", "r", "curl"] as CodeLang[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLanguage(lang)}
                      className={clx(
                        "rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                        codeLanguage === lang
                          ? "bg-bg-black-100 text-txt-black-900"
                          : "text-txt-black-500 hover:bg-bg-washed-active",
                      )}
                    >
                      {lang === "python" ? "Python" : lang === "r" ? "R" : "curl"}
                    </button>
                  ))}
                </div>
                <CopyButton text={snippets[codeLanguage]} />
              </div>
              <pre className="overflow-auto bg-bg-washed px-5 py-4 font-mono text-[13px] leading-6 text-txt-black-800 [&_.hljs-built_in]:text-txt-warning [&_.hljs-comment]:text-txt-black-400 [&_.hljs-keyword]:text-txt-danger [&_.hljs-literal]:text-blue-700 [&_.hljs-meta]:text-txt-black-400 [&_.hljs-number]:text-blue-700 [&_.hljs-string]:text-blue-700 [&_.hljs-title]:text-txt-danger">
                <code
                  className="hljs whitespace-pre font-mono"
                  dangerouslySetInnerHTML={{ __html: highlightedSnippet }}
                />
              </pre>
            </div>
          </section>

          {/* ── Cite ─────────────────────────────────────────── */}
          <section id="dc-cite" className="mb-12">
            <SectionDivider label="Cite" />

            <p className="mb-6 text-body-md text-txt-black-500">{data.cite.instructions}</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(
                [
                  { label: "APA",     style: "apa"     as const, text: citations.apa     },
                  { label: "MLA",     style: "mla"     as const, text: citations.mla     },
                  { label: "Chicago", style: "chicago" as const, text: citations.chicago },
                  { label: "Harvard", style: "harvard" as const, text: citations.harvard },
                ]
              ).map(({ label, style, text }) => (
                <div key={label} className="rounded-xl border border-otl-gray-200 bg-bg-white p-4">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <p className="text-[15px] font-semibold text-txt-black-900">{label}</p>
                    <CopyButton text={text} />
                  </div>
                  <p className="text-[13px] leading-relaxed text-txt-black-600">
                    <CitationMarkup style={style} cite={data.cite} />
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-otl-gray-200 bg-bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-4">
                <p className="text-[15px] font-semibold text-txt-black-900">BibTeX</p>
                <CopyButton text={citations.bibtex} />
              </div>
              <pre className="overflow-auto rounded-lg bg-bg-washed px-4 py-2.5 font-mono text-[12px] leading-5 text-txt-black-700">
                {citations.bibtex}
              </pre>
            </div>
          </section>

        </div>{/* end narrowed sections */}
      </div>
    </div>
  );
}
