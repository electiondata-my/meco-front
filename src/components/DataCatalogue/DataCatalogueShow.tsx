import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import ReactMarkdown from "react-markdown";
import CodeMirror from "@uiw/react-codemirror";
import { sql as sqlLang, StandardSQL } from "@codemirror/lang-sql";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import {
  ArrowDownTrayIcon,
  BookOpenIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  CommandLineIcon,
  DocumentTextIcon,
  EyeIcon,
  ListBulletIcon,
  TableCellsIcon,
} from "@heroicons/react/20/solid";
import { clx } from "@lib/helpers";
import { useDuckDB } from "@dashboards/query-builder/useDuckDB";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("python", python);
hljs.registerLanguage("r", r);

// ── Types ────────────────────────────────────────────────────────────────────

interface CatalogueField {
  name: string;
  title: string;
  description: string;
}

interface CiteData {
  instructions: string;
  type: string;
  id: string;
  title: string;
  author: string;
  journal: string;
  date: string;
  publisher: string;
}

interface DownloadInfo {
  link: string;
  n_rows: number;
  n_cols: number;
  size_bytes: number;
}

interface CatalogueData {
  catalogue_type: string;
  title: string;
  description: string;
  last_updated: string;
  methodology: string;
  fields: CatalogueField[];
  cite: CiteData;
  download: { parquet: DownloadInfo; csv: Omit<DownloadInfo, "n_cols"> & { n_cols?: number } };
  display_options: { precision: { default: number; specific: Record<string, number> } };
  sample_data: Record<string, unknown>[];
}

interface Props {
  data: Record<string, unknown>;
  id: string;
  category: string;
  subcategory: string;
  tbToken: string;
  tbHost: string;
}

interface QueryResult {
  columns: string[];
  fieldTypes: string[];
  rows: unknown[][];
  executionTime: number;
  totalRows: number;
  truncated: boolean;
}

type Tab = "preview" | "methodology" | "variables";
type CodeLang = "python" | "r" | "curl" | "duckdb";
type CopyState = "idle" | "copied";

const MAX_DISPLAY_ROWS = 500;

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseField(description: string): { type: string; desc: string } {
  const m = description.match(/^\[(\w+)\]\s*(.*)/s);
  return m ? { type: m[1], desc: m[2] } : { type: "", desc: description };
}

function formatBytes(bytes: number): string {
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

function formatPreviewCell(
  value: unknown,
  type: string,
  precision: number,
): string {
  if (value === null || value === undefined) return "—";
  if (type === "Date") {
    const s = String(value);
    try {
      return new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return s;
    }
  }
  if ((type === "Integer" || type === "Float") && typeof value === "number") {
    return value.toLocaleString("en-GB", {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision === 0 ? 20 : precision,
    });
  }
  return String(value);
}

function escapeCsvCell(val: string): string {
  return /[",\n\r]/u.test(val) ? `"${val.replace(/"/gu, '""')}"` : val;
}

function buildCsv(result: QueryResult): string {
  const header = result.columns.map(escapeCsvCell).join(",");
  const rows = result.rows.map((row) =>
    row
      .map((cell, ci) =>
        escapeCsvCell(
          cell == null ? "" : formatResultCell(cell, result.fieldTypes[ci] ?? ""),
        ),
      )
      .join(","),
  );
  return [header, ...rows].join("\n");
}

function formatResultCell(value: unknown, fieldType: string): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) {
    return value.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const ft = fieldType.toLowerCase();
  if ((ft.includes("date") || ft.includes("timestamp")) && typeof value === "number") {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  if (typeof value === "bigint") return value.toLocaleString("en-GB");
  if (typeof value === "number") return value.toLocaleString("en-GB");
  return String(value);
}

function isNumericType(fieldType: string, sample: unknown): boolean {
  if (typeof sample === "number" || typeof sample === "bigint") return true;
  const ft = fieldType.toLowerCase();
  return ft.includes("int") || ft.includes("float") || ft.includes("decimal") || ft.includes("double");
}

function isRightAlignedType(fieldType: string, sample?: unknown): boolean {
  return isNumericType(fieldType, sample);
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

function prepareCatalogueQuery(sql: string, tableName: string, parquetUrl: string): string {
  const singleQuoted = new RegExp(`'${tableName}'`, "gi");
  const unquoted     = new RegExp(`\\b${tableName}\\b`, "gi");
  const replacement  = `'${parquetUrl}'`;
  return sql.replace(singleQuoted, replacement).replace(unquoted, replacement);
}

function toIsoSeconds(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/u, "");
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

// ── Citation formatters ───────────────────────────────────────────────────────

function buildAPA(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${formatAuthorInitial(c.author)} (${year}). ${c.title}. ${c.journal}.`;
}

function buildMLA(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${formatAuthorFull(c.author)}. "${c.title}." ${c.journal} (${year}).`;
}

function buildChicago(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${formatAuthorFull(c.author)}. "${c.title}." ${c.journal} (${year}).`;
}

function buildHarvard(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${formatAuthorInitial(c.author)} ${year}, ${c.title}. ${c.journal}.`;
}

function buildBibTeX(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `@${c.type}{${c.id},\n  author  = {${formatAuthorFull(c.author)}},\n  title   = {${c.title}},\n  journal = {${c.journal}},\n  year    = {${year}}\n}`;
}

function CitationMarkup({
  style,
  cite,
}: {
  style: "apa" | "mla" | "chicago" | "harvard";
  cite: CiteData;
}) {
  const year = cite.date.split("-")[0];
  if (style === "apa") {
    return (
      <>
        {formatAuthorInitial(cite.author)} ({year}). {cite.title}. <em>{cite.journal}</em>.
      </>
    );
  }
  if (style === "mla") {
    return (
      <>
        {formatAuthorFull(cite.author)}. "{cite.title}." <em>{cite.journal}</em> ({year}).
      </>
    );
  }
  if (style === "chicago") {
    return (
      <>
        {formatAuthorFull(cite.author)}. "{cite.title}." <em>{cite.journal}</em> ({year}).
      </>
    );
  }
  return (
    <>
      {formatAuthorInitial(cite.author)} {year}, {cite.title}. <em>{cite.journal}</em>.
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

function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
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

const SqlResults = memo(function SqlResults({
  result,
  onCopyCsv,
  csvCopyState,
}: {
  result: QueryResult;
  onCopyCsv: () => void;
  csvCopyState: CopyState;
}) {
  const isRightAligned = useMemo(
    () =>
      result.columns.map((_, ci) => {
        const sample = result.rows.find((row) => row[ci] != null)?.[ci];
        return isRightAlignedType(result.fieldTypes[ci] ?? "", sample);
      }),
    [result],
  );

  return (
    <div className="bg-bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-otl-gray-200 px-4 py-2">
        <p className="flex items-center gap-1.5 text-[12px] text-txt-black-500">
          <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-green-600" />
          <span>
            {result.truncated
              ? `${MAX_DISPLAY_ROWS.toLocaleString()}+ rows (capped)`
              : `${result.totalRows.toLocaleString()} row${result.totalRows !== 1 ? "s" : ""}`}
            {" · "}
            {result.columns.length} col{result.columns.length !== 1 ? "s" : ""}
            {" · "}
            {result.executionTime < 1000
              ? `${Math.round(result.executionTime)} ms`
              : `${(result.executionTime / 1000).toFixed(2)} s`}
          </span>
        </p>
        <button
          onClick={onCopyCsv}
          className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-txt-black-500 transition-colors hover:bg-bg-washed-active"
        >
          {csvCopyState === "copied" ? (
            <>
              <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              Copy as CSV
            </>
          )}
        </button>
      </div>

      {result.rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] text-txt-black-400">
          Query returned no rows.
        </p>
      ) : (
        <div className="max-h-[24rem] overflow-auto sm:max-h-[28rem]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {result.columns.map((col, ci) => (
                  <th
                    key={col}
                    className={clx(
                      "sticky top-0 z-10 whitespace-nowrap border-b border-otl-gray-200 bg-bg-white px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-wider text-txt-black-400 shadow-[inset_0_-1px_0_rgb(var(--otl-gray-200))]",
                      isRightAligned[ci] ? "text-right" : "text-left",
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-otl-gray-100 transition-colors last:border-0 hover:bg-bg-black-50/60"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={clx(
                        "whitespace-nowrap px-3 py-1.5 font-mono text-[13px] text-txt-black-800",
                        isRightAligned[ci] ? "text-right tabular-nums" : "text-left",
                        cell == null && "italic text-txt-black-300",
                      )}
                    >
                      {formatResultCell(cell, result.fieldTypes[ci] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

// ── Dark mode hook ────────────────────────────────────────────────────────────

function useDarkMode(): "dark" | "light" {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const handler = (e: Event) => {
      setDark((e as CustomEvent<{ theme: string }>).detail.theme === "dark");
    };
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);
  return dark ? "dark" : "light";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DataCatalogueShow({
  data: rawData,
  id,
  category,
  subcategory,
  tbToken,
  tbHost,
}: Props) {
  const data = rawData as unknown as CatalogueData;

  if (data.catalogue_type !== "TABLE") {
    return (
      <div className="px-3 py-20 text-center text-body-md text-txt-black-500 sm:px-4.5 md:px-6">
        This dataset type is not yet supported.
      </div>
    );
  }

  const theme = useDarkMode();
  const { db, initializing, error: dbError } = useDuckDB();

  const tableName = useMemo(() => {
    const filename = data.download.parquet.link.split("/").pop() ?? "";
    return filename.replace(".parquet", "");
  }, [data.download.parquet.link]);

  const defaultQuery = useMemo(
    () => `-- Table: ${tableName}\nSELECT *\nFROM ${tableName}\nLIMIT 30`,
    [tableName],
  );

  const [activeTab,    setActiveTab]    = useState<Tab>("preview");
  const [sqlOpen,      setSqlOpen]      = useState(false);
  const [queryText,    setQueryText]    = useState(defaultQuery);
  const [running,      setRunning]      = useState(false);
  const [result,       setResult]       = useState<QueryResult | null>(null);
  const [queryError,   setQueryError]   = useState<string | null>(null);
  const [csvCopyState, setCsvCopyState] = useState<CopyState>("idle");
  const [codeLanguage, setCodeLanguage] = useState<CodeLang>("python");
  const [viewCount,    setViewCount]    = useState<number | null>(null);
  const [downloadCount, setDownloadCount] = useState<number | null>(null);

  const isDbReady = !!db && !initializing && !dbError;

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

  // Fetch and log data catalogue analytics
  useEffect(() => {
    if (!tbToken || !tbHost) return;
    setViewCount((count) => (count == null ? count : count + 1));
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
          ? d.data.reduce((sum: number, row: { downloads?: number }) => sum + Number(row.downloads ?? 0), 0)
          : null;
        setDownloadCount(total);
      })
      .catch(() => {});
  }, [tbToken, tbHost, id, appendTinybirdEvent]);

  useEffect(() => { setCsvCopyState("idle"); }, [result]);

  const fieldTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of data.fields) {
      map[f.name] = parseField(f.description).type;
    }
    return map;
  }, [data.fields]);

  const columns = useMemo(() => {
    if (!data.sample_data.length) return [];
    return Object.keys(data.sample_data[0]);
  }, [data.sample_data]);

  const extensions = useMemo(
    () => [
      sqlLang({
        dialect: StandardSQL,
        schema: { [tableName]: columns },
        defaultTable: tableName,
      }),
    ],
    [tableName, columns],
  );

  const runQuery = useCallback(async () => {
    if (!db || running || !queryText.trim()) return;
    setRunning(true);
    setQueryError(null);
    setResult(null);
    try {
      const prepared = prepareCatalogueQuery(queryText, tableName, data.download.parquet.link);
      const start    = performance.now();
      const conn     = await db.connect();
      const arrow    = await conn.query(prepared);
      const elapsed  = performance.now() - start;

      const cols: string[] = arrow.schema.fields.map((f: any) => f.name);
      const types: string[] = arrow.schema.fields.map((f: any) => f.type?.toString() ?? "");
      const allRows = arrow.toArray();
      const rows: unknown[][] = allRows
        .slice(0, MAX_DISPLAY_ROWS)
        .map((row: any) => cols.map((c) => row[c]));

      setResult({
        columns: cols,
        fieldTypes: types,
        rows,
        executionTime: elapsed,
        totalRows: arrow.numRows,
        truncated: arrow.numRows > MAX_DISPLAY_ROWS,
      });
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [db, queryText, tableName, data.download.parquet.link, running]);

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void runQuery();
      }
    },
    [runQuery],
  );

  const handleCopyCsv = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(buildCsv(result));
    setCsvCopyState("copied");
    setTimeout(() => setCsvCopyState("idle"), 2000);
  }, [result]);

  // Programmatic access snippets
  const snippets: Record<CodeLang, string> = useMemo(() => {
    const url      = data.download.parquet.link;
    const filename = `${tableName}.parquet`;
    return {
      python: [
        "import pandas as pd",
        "",
        `URL = "${url}"`,
        "",
        "df = pd.read_parquet(URL)",
        `print(df.shape)   # (${data.download.parquet.n_rows}, ${data.download.parquet.n_cols})`,
        "print(df.dtypes)",
        "df",
      ].join("\n"),
      r: [
        "library(arrow)",
        "library(dplyr)",
        "",
        `url <- "${url}"`,
        "",
        "df <- read_parquet(url)",
        "glimpse(df)",
        "head(df)",
      ].join("\n"),
      curl: [
        `# Download the Parquet file`,
        `curl -L -o ${filename} "${url}"`,
      ].join("\n"),
      duckdb: [
        "# If not already installed, run:",
        "curl https://install.duckdb.org | sh",
        "",
        `duckdb -c "DESCRIBE SELECT * FROM '${url}'"`,
        `duckdb -c "SELECT * FROM '${url}' LIMIT 10"`,
      ].join("\n"),
    };
  }, [data.download.parquet.link, data.download.parquet.n_rows, data.download.parquet.n_cols, tableName]);

  // Citation strings (memoised once)
  const citations = useMemo(() => ({
    apa:     buildAPA(data.cite),
    mla:     buildMLA(data.cite),
    chicago: buildChicago(data.cite),
    harvard: buildHarvard(data.cite),
    bibtex:  buildBibTeX(data.cite),
  }), [data.cite]);

  const parquet = data.download.parquet;
  const csv     = data.download.csv;
  const tabItems = [
    { tab: "preview",     label: "Preview",     Icon: TableCellsIcon },
    { tab: "variables",   label: "Variables",   Icon: ListBulletIcon },
    { tab: "methodology", label: "Methodology", Icon: DocumentTextIcon },
  ] as const;
  const footerLinks = [
    { label: "Download", href: "#dc-download", Icon: ArrowDownTrayIcon },
    { label: "Code",     href: "#dc-code",     Icon: CodeBracketIcon },
    { label: "Cite",     href: "#dc-cite",     Icon: BookOpenIcon },
  ] as const;
  const catalogueSectionTitle = subcategory ? `${category}: ${subcategory}` : category;
  const catalogueSectionHref = catalogueSectionTitle
    ? `/data-catalogue#${slugify(catalogueSectionTitle)}`
    : "/data-catalogue";
  const snippetLanguage: Record<CodeLang, string> = {
    python: "python",
    r:      "r",
    duckdb: "bash",
    curl:   "bash",
  };
  const highlightedSnippet = useMemo(
    () => highlightSnippet(snippets[codeLanguage], snippetLanguage[codeLanguage]),
    [snippets, codeLanguage],
  );

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
          <span>&gt;</span>
          <span className="text-txt-black-700">{data.title}</span>
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
        <div className="mb-8 flex flex-col gap-2 text-[13px] text-txt-black-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <EyeIcon className="h-4 w-4 shrink-0 text-txt-black-400" />
              {viewCount === null ? "--" : viewCount.toLocaleString()} views
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowDownTrayIcon className="h-4 w-4 shrink-0 text-txt-black-400" />
              {downloadCount === null ? "--" : downloadCount.toLocaleString()} downloads
            </span>
          </div>
        </div>

        {/* ── Preview block ───────────────────────────────────── */}
        <div className="mb-10 overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-white">

          {/* Tab bar */}
          <div className="grid grid-cols-2 border-b border-otl-gray-200 px-1 sm:flex sm:items-center">
            {tabItems.map(({ tab, label, Icon }) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSqlOpen(false); }}
                className={clx(
                  "flex items-center justify-center gap-1.5 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors sm:justify-start",
                  !sqlOpen && activeTab === tab
                    ? "border-txt-black-900 text-txt-black-900"
                    : "border-transparent text-txt-black-500 hover:text-txt-black-700",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}

            {/* SQL tab — grayed until DuckDB ready */}
            <button
              disabled={!isDbReady && !sqlOpen}
              onClick={() => { if (isDbReady || sqlOpen) setSqlOpen((p) => !p); }}
              className={clx(
                "flex items-center justify-center gap-1.5 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors sm:justify-start",
                sqlOpen
                  ? "border-txt-black-900 text-txt-black-900"
                  : isDbReady
                  ? "border-transparent text-txt-black-500 hover:text-txt-black-700"
                  : "border-transparent text-txt-black-300 cursor-not-allowed",
              )}
            >
              <CommandLineIcon className="h-4 w-4 shrink-0" />
              Query with SQL
              {isDbReady && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              )}
            </button>
            <p className="col-span-2 border-t border-otl-gray-100 px-3 py-2 text-right text-[13px] text-txt-black-500 sm:col-span-1 sm:ml-auto sm:border-t-0 sm:py-0">
              {parquet.n_rows.toLocaleString()} rows × {parquet.n_cols} cols
            </p>
          </div>

          {/* SQL panel */}
          {sqlOpen && (
            <div className="border-b border-otl-gray-200">
              <div
                className="flex flex-col"
                onKeyDown={handleEditorKeyDown}
              >
                <div className="overflow-hidden bg-bg-washed">
                  <div className="relative overflow-hidden border-b border-otl-gray-200 [&_.cm-editor.cm-focused]:outline-none [&_.cm-editor]:font-mono [&_.cm-editor]:text-[13px]">
                    <CodeMirror
                      value={queryText}
                      onChange={setQueryText}
                      extensions={extensions}
                      theme={theme}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: false,
                        dropCursor: false,
                        indentOnInput: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        autocompletion: false,
                        highlightActiveLine: true,
                        highlightSelectionMatches: true,
                        closeBracketsKeymap: true,
                        defaultKeymap: true,
                        searchKeymap: true,
                        historyKeymap: true,
                        completionKeymap: true,
                      }}
                      placeholder="Write your SQL here…"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <CopyButton text={queryText} label="Copy SQL" />
                    <button
                      onClick={() => void runQuery()}
                      disabled={!db || running || !queryText.trim()}
                      className={clx(
                        "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12px] font-semibold transition-colors",
                        "bg-green-600 text-white hover:bg-green-700",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      )}
                    >
                      {running ? (
                        <>
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Running…
                        </>
                      ) : (
                        "Run"
                      )}
                    </button>
                  </div>
                </div>

                {queryError && (
                  <div className="m-4 rounded-xl border border-danger-200 bg-bg-danger-100 px-4 py-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-danger-700">
                      Query error
                    </p>
                    <p className="whitespace-pre-wrap break-words font-mono text-[12px] text-danger-700">
                      {queryError}
                    </p>
                  </div>
                )}

                {result && !queryError && (
                  <SqlResults
                    result={result}
                    onCopyCsv={() => void handleCopyCsv()}
                    csvCopyState={csvCopyState}
                  />
                )}
              </div>
            </div>
          )}

          {/* Tab panels */}
          {!sqlOpen && (
            <div>

              {/* Preview tab */}
              {activeTab === "preview" && (
                <div className="max-h-[calc(15*2.25rem+3rem)] overflow-auto">
                  {data.sample_data.length === 0 ? (
                    <p className="px-4 py-10 text-center text-[13px] text-txt-black-400">
                      No preview data available.
                    </p>
                  ) : (
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr>
                          {columns.map((col) => {
                            const type = fieldTypeMap[col] ?? "";
                            const isRightAligned = type === "Integer" || type === "Float";
                            return (
                              <th
                                key={col}
                                className={clx(
                                  "sticky top-0 z-10 whitespace-nowrap border-b border-otl-gray-200 bg-bg-white px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-wider text-txt-black-400 shadow-[inset_0_-1px_0_rgb(var(--otl-gray-200))]",
                                  isRightAligned ? "text-right" : "text-left",
                                )}
                              >
                                {col}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {data.sample_data.map((row, ri) => (
                          <tr
                            key={ri}
                            className="border-b border-otl-gray-100 transition-colors last:border-0 hover:bg-bg-black-50/60"
                          >
                            {columns.map((col) => {
                              const type = fieldTypeMap[col] ?? "";
                              const isRightAligned = type === "Integer" || type === "Float";
                              const precision =
                                data.display_options.precision.specific[col] ??
                                data.display_options.precision.default;
                              const cell = row[col];
                              return (
                                <td
                                  key={col}
                                  className={clx(
                                    "whitespace-nowrap px-3 py-1.5 font-mono text-[13px] text-txt-black-800",
                                    isRightAligned ? "text-right tabular-nums" : "text-left",
                                    cell == null && "italic text-txt-black-300",
                                  )}
                                >
                                  {formatPreviewCell(cell, type, precision)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Methodology tab */}
              {activeTab === "methodology" && (
                <div className="markdown max-w-none px-6 py-5">
                  <ReactMarkdown>{normalizeMarkdown(data.methodology)}</ReactMarkdown>
                </div>
              )}

              {/* Variables tab */}
              {activeTab === "variables" && (
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
              )}

            </div>
          )}

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
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.querySelector(href);
                    if (el) {
                      const top = el.getBoundingClientRect().top + window.scrollY - 80;
                      window.scrollTo({ top, behavior: "smooth" });
                    }
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-txt-black-500 transition-colors hover:text-txt-black-900"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Narrowed sections (desktop only) ───────── */}
        <div className="lg:px-[16.667%]">

        {/* ── Download ────────────────────────────────────────── */}
        <section id="dc-download" className="mb-12">
          <SectionDivider label="Download" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Parquet */}
            <div className="overflow-hidden rounded-xl border border-otl-danger-200 bg-bg-white">
              <div className="flex items-center justify-between gap-3 bg-bg-danger-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-otl-danger-200 bg-bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-txt-danger">
                    PQ
                  </span>
                  <span className="text-[14px] font-semibold text-txt-black-900">Parquet</span>
                </div>
                <span className="rounded-full bg-bg-white px-2 py-0.5 text-[11px] font-semibold text-txt-danger">
                  Recommended
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-otl-gray-200 border-b border-otl-gray-200">
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Rows</p>
                  <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{parquet.n_rows.toLocaleString()}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Cols</p>
                  <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{parquet.n_cols.toLocaleString()}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Size</p>
                  <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{formatBytes(parquet.size_bytes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <a
                  href={parquet.link}
                  download
                  onClick={() => trackDownload("parquet")}
                  className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-txt-black-600 transition-colors hover:text-txt-black-900"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                  Download
                </a>
                <CopyButton text={parquet.link} label="Copy link" />
              </div>
            </div>

            {/* CSV */}
            <div className="overflow-hidden rounded-xl border border-blue-200 bg-bg-white">
              <div className="flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-3">
                <span className="rounded border border-blue-200 bg-bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-blue-700">
                  CSV
                </span>
                <span className="text-[14px] font-semibold text-txt-black-900">CSV</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-otl-gray-200 border-b border-otl-gray-200">
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Rows</p>
                  <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{(csv.n_rows ?? parquet.n_rows).toLocaleString()}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Cols</p>
                  <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{(csv.n_cols ?? parquet.n_cols).toLocaleString()}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-400">Size</p>
                  <p className="mt-1 text-[15px] font-semibold text-txt-black-900">{formatBytes(csv.size_bytes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3">
                <a
                  href={csv.link}
                  download
                  onClick={() => trackDownload("csv")}
                  className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-txt-black-600 transition-colors hover:text-txt-black-900"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                  Download
                </a>
                <CopyButton text={csv.link} label="Copy link" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Programmatic access ─────────────────────────────── */}
        <section id="dc-code" className="mb-12">
          <SectionDivider label="Programmatic Access" />

          <div className="overflow-hidden rounded-xl border border-otl-gray-200">
            {/* Language switcher */}
            <div className="flex items-center justify-between border-b border-otl-gray-200 px-3 py-2">
              <div className="flex gap-1">
                {(["python", "r", "duckdb", "curl"] as CodeLang[]).map((lang) => (
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
                    {lang === "python"
                      ? "Python"
                      : lang === "r"
                      ? "R"
                      : lang === "duckdb"
                      ? "DuckDB"
                      : "curl"}
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

        {/* ── Cite ───────────────────────────────────────────── */}
        <section id="dc-cite" className="mb-12">
          <SectionDivider label="Cite" />

          <p className="mb-6 text-body-md text-txt-black-500">{data.cite.instructions}</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(
              [
                { label: "APA",     style: "apa",     text: citations.apa },
                { label: "MLA",     style: "mla",     text: citations.mla },
                { label: "Chicago", style: "chicago", text: citations.chicago },
                { label: "Harvard", style: "harvard", text: citations.harvard },
              ] as const
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
