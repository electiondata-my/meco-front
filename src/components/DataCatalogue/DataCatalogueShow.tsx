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

type FlexDownloadInfo = { link: string; n_rows: number; n_cols?: number; size_bytes: number };

interface CatalogueData {
  catalogue_type: string;
  title: string;
  description: string;
  last_updated: string;
  methodology: string;
  fields: CatalogueField[];
  cite: CiteData;
  download: { parquet: DownloadInfo; csv: FlexDownloadInfo; excel?: FlexDownloadInfo };
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
type CodeLang = "python" | "r" | "curl" | "duckdb" | "excel" | "sheets";
type CopyState = "idle" | "copied";

const MAX_DISPLAY_ROWS = 500;
const DEFAULT_FLOAT_PRECISION = 2;

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function formatResultCell(
  value: unknown,
  fieldType: string,
  precision?: number,
): string {
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
  if (typeof value === "number") {
    if (ft.includes("float") || ft.includes("double") || ft.includes("decimal")) {
      const digits = precision ?? DEFAULT_FLOAT_PRECISION;
      return value.toLocaleString("en-GB", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits === 0 ? 20 : digits,
      });
    }
    return value.toLocaleString("en-GB");
  }
  return String(value);
}

function isNumericType(fieldType: string, sample: unknown): boolean {
  if (typeof sample === "number" || typeof sample === "bigint") return true;
  const ft = fieldType.toLowerCase();
  return ft.includes("int") || ft.includes("float") || ft.includes("decimal") || ft.includes("double");
}

function isRightAlignedType(fieldType: string, sample?: unknown): boolean {
  const ft = fieldType.toLowerCase();
  if (ft.includes("date") || ft.includes("timestamp")) return false;
  return isNumericType(fieldType, sample);
}

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\\n/g, "\n");
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function highlightSnippet(code: string, language: string): string {
  if (!language) return code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

interface CitationAuthor {
  family: string;
  given: string;
}

function parseCitationAuthor(author: string): CitationAuthor {
  const trimmed = author.trim();
  const commaIndex = trimmed.indexOf(",");
  if (commaIndex >= 0) {
    return {
      family: trimmed.slice(0, commaIndex).trim(),
      given:  trimmed.slice(commaIndex + 1).trim(),
    };
  }

  const parts = trimmed.split(/\s+/u);
  if (parts.length < 2) return { family: trimmed, given: "" };
  return {
    family: parts.at(-1) ?? trimmed,
    given:  parts.slice(0, -1).join(" "),
  };
}

function parseCitationAuthors(author: string): CitationAuthor[] {
  return author
    .split(/,?\s+(?:and|&)\s+/u)
    .map(parseCitationAuthor)
    .filter(({ family, given }) => family || given);
}

function formatAuthorFull(author: CitationAuthor): string {
  if (!author.given) return author.family;
  return `${author.family}, ${author.given}`;
}

function formatAuthorInitial(author: CitationAuthor, separator = " "): string {
  if (!author.given) return author.family;
  const initials = author.given
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => `${part[0]}.`)
    .join(separator);
  return `${author.family}, ${initials}`;
}

function formatAuthorsMLA(author: string): string {
  const authors = parseCitationAuthors(author);
  if (authors.length === 0) return author.trim();
  if (authors.length === 1) return formatAuthorFull(authors[0]);

  const formatted = authors.map(formatAuthorFull);
  const last = formatted.at(-1);
  return `${formatted.slice(0, -1).join(", ")}, and ${last}`;
}

function formatAuthorsAPA(author: string): string {
  const formatted = parseCitationAuthors(author).map((item) => formatAuthorInitial(item));
  if (formatted.length === 0) return author.trim();
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;

  const last = formatted.at(-1);
  return `${formatted.slice(0, -1).join(", ")}, & ${last}`;
}

function formatAuthorsHarvard(author: string): string {
  const formatted = parseCitationAuthors(author).map((item) => formatAuthorInitial(item, ""));
  if (formatted.length === 0) return author.trim();
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;

  const last = formatted.at(-1);
  return `${formatted.slice(0, -1).join(", ")} and ${last}`;
}

function formatAuthorsBibTeX(author: string): string {
  const formatted = parseCitationAuthors(author).map(formatAuthorFull);
  return formatted.length > 0 ? formatted.join(" and ") : author.trim();
}

// ── Citation formatters ───────────────────────────────────────────────────────

function buildAPA(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${formatAuthorsAPA(c.author)} (${year}). ${c.title}. ${c.journal}.`;
}

function buildMLA(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${formatAuthorsMLA(c.author)}. "${c.title}." ${c.journal} (${year}).`;
}

function buildChicago(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${formatAuthorsMLA(c.author)}. "${c.title}." ${c.journal} (${year}).`;
}

function buildHarvard(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${formatAuthorsHarvard(c.author)} ${year}, ${c.title}. ${c.journal}.`;
}

function buildBibTeX(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `@${c.type}{${c.id},\n  author  = {${formatAuthorsBibTeX(c.author)}},\n  title   = {${c.title}},\n  journal = {${c.journal}},\n  year    = {${year}}\n}`;
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
        {formatAuthorsAPA(cite.author)} ({year}). {cite.title}. <em>{cite.journal}</em>.
      </>
    );
  }
  if (style === "mla") {
    return (
      <>
        {formatAuthorsMLA(cite.author)}. "{cite.title}." <em>{cite.journal}</em> ({year}).
      </>
    );
  }
  if (style === "chicago") {
    return (
      <>
        {formatAuthorsMLA(cite.author)}. "{cite.title}." <em>{cite.journal}</em> ({year}).
      </>
    );
  }
  return (
    <>
      {formatAuthorsHarvard(cite.author)} {year}, {cite.title}. <em>{cite.journal}</em>.
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
  className,
  labelClassName,
}: {
  text: string;
  label?: string;
  className?: string;
  labelClassName?: string;
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
      className={clx(
        "flex shrink-0 items-center gap-1 px-2 py-1 text-[13px] font-medium text-txt-black-600 transition-colors hover:text-txt-black-900",
        className,
      )}
    >
      {state === "copied" ? (
        <>
          <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-green-600" />
          <span className={clx("text-green-600", labelClassName)}>Copied!</span>
        </>
      ) : (
        <>
          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          <span className={labelClassName}>{label}</span>
        </>
      )}
    </button>
  );
}

const SqlResults = memo(function SqlResults({
  result,
  precisionByColumn,
}: {
  result: QueryResult;
  precisionByColumn: Record<string, number>;
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
                      {formatResultCell(
                        cell,
                        result.fieldTypes[ci] ?? "",
                        precisionByColumn[result.columns[ci]],
                      )}
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

  const fieldTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of data.fields) {
      map[f.name] = parseField(f.description).type;
    }
    return map;
  }, [data.fields]);

  const precisionByColumn = useMemo(() => {
    const map: Record<string, number> = {};
    for (const field of data.fields) {
      map[field.name] =
        data.display_options.precision.specific[field.name] ??
        data.display_options.precision.default;
    }
    return map;
  }, [
    data.fields,
    data.display_options.precision.default,
    data.display_options.precision.specific,
  ]);

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
      excel: [
        "// Excel: Data tab → Get Data → From Other Sources → From Web",
        `// Enter: ${url}`,
        "//",
        "// Or via Power Query Advanced Editor (Home → Advanced Editor):",
        "",
        "let",
        `    Source = Parquet.Feed("${url}")`,
        "in",
        "    Source",
      ].join("\n"),
      sheets: [
        "// Google Sheets does not natively support Parquet.",
        "// Use IMPORTDATA with the CSV export for live auto-refresh:",
        "",
        `=IMPORTDATA("${data.download.csv.link}")`,
      ].join("\n"),
    };
  }, [data.download.parquet.link, data.download.parquet.n_rows, data.download.parquet.n_cols, data.download.csv.link, tableName]);

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
    excel:  "",
    sheets: "",
  };
  const highlightedSnippet = useMemo(
    () => highlightSnippet(snippets[codeLanguage], snippetLanguage[codeLanguage]),
    [snippets, codeLanguage],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-4.5 md:px-6">
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
        <p className="mb-3 max-w-5xl text-body-md text-txt-black-600">
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
          <div className="grid grid-cols-2 border-b border-otl-gray-200 sm:flex sm:items-center">
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

                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <p className="min-w-0 truncate text-[12px] text-txt-black-500">
                      {result && !queryError ? (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-green-600" />
                          <span className="truncate">
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
                        </span>
                      ) : queryError ? (
                        "Query error"
                      ) : (
                        "Run query to preview results"
                      )}
                    </p>
                    <button
                      onClick={() => void runQuery()}
                      disabled={!db || running || !queryText.trim()}
                      className={clx(
                        "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12px] font-semibold transition-colors",
                        "bg-danger-600 text-white hover:bg-danger-700",
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
                    precisionByColumn={precisionByColumn}
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
          <div className="flex flex-nowrap items-center justify-between gap-2 border-t border-otl-gray-200 px-4 py-3 sm:flex-wrap sm:gap-3">
            <div className="flex items-center gap-0 text-[12px] text-txt-black-500 sm:gap-2">
              <span
                title="Creative Commons Zero — No Rights Reserved"
                className="flex h-5 w-8 items-center justify-center rounded border border-current text-[10px] font-bold leading-none"
              >
                CC0
              </span>
              <span className="hidden sm:inline">Dedicated to the public domain</span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
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
                  className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-[12px] font-medium text-txt-black-500 transition-colors hover:text-txt-black-900"
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

          <div className="overflow-hidden bg-bg-white">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[34%] sm:w-[20%]" />
                  <col className="hidden sm:table-column sm:w-[28%]" />
                  <col className="w-[22%] sm:w-[13%]" />
                  <col className="w-[26%] sm:w-[20%]" />
                  <col className="w-[18%] sm:w-[19%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-otl-gray-200 text-left">
                    <th className="py-3 pr-3 text-[11px] font-semibold uppercase tracking-wider text-txt-black-900 sm:pr-4 sm:text-[12px]">
                      Format
                    </th>
                    <th className="hidden py-3 pr-4 text-[12px] font-semibold uppercase tracking-wider text-txt-black-900 sm:table-cell">
                      Best for
                    </th>
                    <th className="whitespace-nowrap py-3 pr-3 text-[11px] font-semibold uppercase tracking-wider text-txt-black-900 sm:pr-4 sm:text-[12px]">
                      Size
                    </th>
                    <th className="whitespace-nowrap py-3 pr-2 text-center text-[11px] font-semibold uppercase tracking-wider text-txt-black-900 sm:pr-3 sm:text-[12px]">
                      Download
                    </th>
                    <th className="whitespace-nowrap py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-txt-black-900 sm:text-[12px]">
                      Link
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-otl-gray-200">
                  {[
                    { label: "Parquet", info: parquet,              format: "parquet", bestFor: "Data science & analytics" },
                    { label: "CSV",     info: csv,                  format: "csv",     bestFor: "Universal compatibility"  },
                    ...(data.download.excel ? [{ label: "Excel", info: data.download.excel, format: "excel", bestFor: "Non-technical users" }] : []),
                  ].map(({ label, info, format, bestFor }) => (
                    <tr key={format}>
                      <td className="py-3 pr-3 sm:pr-4">
                        <span className="break-words text-[13px] font-semibold leading-tight text-txt-black-900 sm:text-[14px]">
                          {label}
                        </span>
                      </td>
                      <td className="hidden py-3 pr-4 text-[13px] text-txt-black-600 sm:table-cell">
                        {bestFor}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3 font-mono text-[12px] tabular-nums text-txt-black-900 sm:pr-4 sm:text-[13px]">
                        {formatBytes(info.size_bytes)}
                      </td>
                      <td className="py-3 pr-2 sm:pr-3">
                        <a
                          href={info.link}
                          download
                          onClick={() => trackDownload(format)}
                          aria-label={`Download ${label}`}
                          className="mx-auto flex h-8 w-8 items-center justify-center gap-1.5 rounded-md border border-otl-gray-200 bg-bg-white text-[13px] font-medium text-txt-black-600 transition-colors hover:border-otl-gray-300 hover:bg-bg-black-50 hover:text-txt-black-900 sm:h-auto sm:w-fit sm:px-2 sm:py-1"
                        >
                          <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      </td>
                      <td className="py-3">
                        <CopyButton
                          text={info.link}
                          label="Copy link"
                          className="mx-auto h-8 w-8 justify-center rounded-md border border-otl-gray-200 bg-bg-white hover:border-otl-gray-300 hover:bg-bg-black-50 sm:h-auto sm:w-fit"
                          labelClassName="hidden sm:inline"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Programmatic access ─────────────────────────────── */}
        <section id="dc-code" className="mb-12">
          <SectionDivider label="Programmatic Access" />

          <div className="overflow-hidden rounded-xl border border-otl-gray-200">
            {/* Language switcher */}
            <div className="flex items-center justify-between border-b border-otl-gray-200 px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {(["python", "r", "duckdb", "curl", "excel", "sheets"] as CodeLang[]).map((lang) => (
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
                      : lang === "curl"
                      ? "curl"
                      : lang === "excel"
                      ? "Excel"
                      : "Google Sheets"}
                  </button>
                ))}
              </div>
              <CopyButton text={snippets[codeLanguage]} />
            </div>
            <pre className="dc-code overflow-auto bg-bg-washed px-5 py-4 font-mono text-[13px] leading-6 text-txt-black-700">
              <code
                className="hljs whitespace-pre font-mono"
                dangerouslySetInnerHTML={{ __html: highlightedSnippet }}
              />
            </pre>
          </div>
        </section>

        {/* ── Cite ───────────────────────────────────────────── */}
        <section id="dc-cite" className="mb-6">
          <SectionDivider label="Cite" />

          <p className="mb-6 text-body-md text-txt-black-500">{data.cite.instructions}</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(
              [
                { label: "APA",     style: "apa",     text: citations.apa },
                { label: "Harvard", style: "harvard", text: citations.harvard },
                { label: "MLA",     style: "mla",     text: citations.mla },
                { label: "Chicago", style: "chicago", text: citations.chicago },
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
