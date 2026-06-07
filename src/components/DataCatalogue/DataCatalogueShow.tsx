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
import {
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/20/solid";
import { clx } from "@lib/helpers";
import { useDuckDB } from "@dashboards/query-builder/useDuckDB";

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
type CodeLang = "python" | "r" | "curl";
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

function prepareCatalogueQuery(sql: string, tableName: string, parquetUrl: string): string {
  const singleQuoted = new RegExp(`'${tableName}'`, "gi");
  const unquoted     = new RegExp(`\\b${tableName}\\b`, "gi");
  const replacement  = `'${parquetUrl}'`;
  return sql.replace(singleQuoted, replacement).replace(unquoted, replacement);
}

// ── Citation formatters ───────────────────────────────────────────────────────

function buildAPA(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${c.author} (${year}). ${c.title}. ${c.journal}. ${c.publisher}.`;
}

function buildMLA(c: CiteData): string {
  return `${c.author}. "${c.title}." ${c.journal}, ${c.publisher}, ${c.date}.`;
}

function buildChicago(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${c.author}. "${c.title}." ${c.journal} (${year}). ${c.publisher}.`;
}

function buildHarvard(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `${c.author} ${year}, '${c.title}', ${c.journal}, ${c.publisher}.`;
}

function buildBibTeX(c: CiteData): string {
  const year = c.date.split("-")[0];
  return `@${c.type}{${c.id},\n  author    = {${c.author}},\n  title     = {${c.title}},\n  journal   = {${c.journal}},\n  year      = {${year}},\n  publisher = {${c.publisher}}\n}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const cls: Record<string, string> = {
    String:  "bg-bg-black-100 text-txt-black-600",
    Integer: "bg-bg-danger-100 text-txt-danger",
    Float:   "bg-amber-100 text-amber-700",
    Date:    "bg-blue-100 text-blue-700",
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
    <div className="mb-6 flex items-center gap-3">
      <span className="font-poppins text-[1.1rem] font-semibold text-txt-black-900">
        {label}
      </span>
      <div className="flex-1 border-t border-otl-gray-200" />
    </div>
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
      className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-txt-black-500 transition-colors hover:bg-bg-washed-active"
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
  const isNumeric = useMemo(
    () =>
      result.columns.map((_, ci) => {
        const sample = result.rows.find((row) => row[ci] != null)?.[ci];
        return isNumericType(result.fieldTypes[ci] ?? "", sample);
      }),
    [result],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-white">
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
                      "sticky top-0 z-10 whitespace-nowrap border-b border-otl-gray-200 bg-bg-white px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-wider text-txt-black-400",
                      isNumeric[ci] ? "text-right" : "text-left",
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
                        isNumeric[ci] ? "text-right tabular-nums" : "text-left",
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
  const [bibtexOpen,   setBibtexOpen]   = useState(false);
  const [viewCount,    setViewCount]    = useState<number | null>(null);

  const isDbReady = !!db && !initializing && !dbError;

  // Fetch view count
  useEffect(() => {
    if (!tbToken || !tbHost) return;
    fetch(`${tbHost}/v0/pipes/views_by_page.json?token=${tbToken}&page_id=/data-catalogue/${id}`)
      .then((r) => r.json())
      .then((d) => setViewCount(d?.data?.[0]?.hits ?? null))
      .catch(() => {});
  }, [tbToken, tbHost, id]);

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
        `url = "${url}"`,
        "",
        "df = pd.read_parquet(url)",
        `print(df.shape)   # (${data.download.parquet.n_rows}, ${data.download.parquet.n_cols})`,
        "print(df.dtypes)",
        "print(df.head())",
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
        "",
        "# Inspect with DuckDB CLI (if installed)",
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-3 sm:px-4.5 md:px-6">
      <div className="mx-auto w-full max-w-screen-xl pb-24 pt-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-txt-black-400">
          <a href="/data-catalogue" className="hover:text-txt-black-700">
            Data Catalogue
          </a>
          {category && (
            <>
              <span>/</span>
              <span>{category}</span>
            </>
          )}
          <span>/</span>
          <span className="text-txt-black-700">{data.title}</span>
        </nav>

        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-poppins text-[1.875rem] font-semibold leading-tight text-txt-black-900 sm:text-[2rem]">
            {data.title}
          </h1>
          <span className="mt-1 shrink-0 rounded-full border border-otl-gray-200 px-2.5 py-0.5 text-[12px] text-txt-black-500">
            Updated {formatDate(data.last_updated)}
          </span>
        </div>
        <p className="mb-8 max-w-3xl text-body-md text-txt-black-600">
          {data.description}
        </p>

        {/* ── Preview block ───────────────────────────────────── */}
        <div className="mb-10 overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-white">

          {/* Tab bar */}
          <div className="flex border-b border-otl-gray-200 px-1">
            {(["preview", "variables", "methodology"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSqlOpen(false); }}
                className={clx(
                  "border-b-2 px-4 py-3 text-[13px] font-medium transition-colors",
                  !sqlOpen && activeTab === tab
                    ? "border-txt-black-900 text-txt-black-900"
                    : "border-transparent text-txt-black-500 hover:text-txt-black-700",
                )}
              >
                {tab === "methodology" ? "Methodology" : tab === "variables" ? "Variables" : "Preview"}
              </button>
            ))}

            {/* SQL tab — grayed until DuckDB ready */}
            <button
              disabled={!isDbReady && !sqlOpen}
              onClick={() => { if (isDbReady || sqlOpen) setSqlOpen((p) => !p); }}
              className={clx(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors",
                sqlOpen
                  ? "border-txt-black-900 text-txt-black-900"
                  : isDbReady
                  ? "border-transparent text-txt-black-500 hover:text-txt-black-700"
                  : "border-transparent text-txt-black-300 cursor-not-allowed",
              )}
            >
              {isDbReady && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              )}
              Query with SQL
            </button>
          </div>

          {/* SQL panel */}
          {sqlOpen && (
            <div className="border-b border-otl-gray-200 p-4">
              <div
                className="flex flex-col gap-4"
                onKeyDown={handleEditorKeyDown}
              >
                <div className="overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-washed">
                  <div className="flex items-center justify-between border-b border-otl-gray-200 px-4 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-500">
                      SQL Editor
                    </span>
                    <CopyButton text={queryText} label="Copy" />
                  </div>

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

                  <div className="flex items-center justify-end gap-2 px-3 py-2">
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
                  <div className="rounded-xl border border-danger-200 bg-bg-danger-100 px-4 py-3">
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
                            const isNum = type === "Integer" || type === "Float";
                            return (
                              <th
                                key={col}
                                className={clx(
                                  "sticky top-0 z-10 whitespace-nowrap border-b border-otl-gray-200 bg-bg-white px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-wider text-txt-black-400",
                                  isNum ? "text-right" : "text-left",
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
                              const isNum = type === "Integer" || type === "Float";
                              const precision =
                                data.display_options.precision.specific[col] ??
                                data.display_options.precision.default;
                              const cell = row[col];
                              return (
                                <td
                                  key={col}
                                  className={clx(
                                    "whitespace-nowrap px-3 py-1.5 font-mono text-[13px] text-txt-black-800",
                                    isNum ? "text-right tabular-nums" : "text-left",
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
                <div className="prose prose-sm max-w-none px-6 py-5 text-txt-black-700 [&_a]:text-txt-danger [&_a]:underline">
                  <ReactMarkdown>{data.methodology}</ReactMarkdown>
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
          {!sqlOpen && (
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

              <p className="text-[12px] text-txt-black-500">
                {parquet.n_rows.toLocaleString()} rows × {parquet.n_cols} cols
              </p>

              <div className="flex items-center gap-1">
                {(
                  [
                    { label: "Cite",     href: "#dc-cite" },
                    { label: "Download", href: "#dc-download" },
                    { label: "Code",     href: "#dc-code" },
                  ] as const
                ).map(({ label, href }) => (
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
                    className="rounded-lg border border-otl-gray-200 px-3 py-1 text-[12px] font-medium text-txt-black-600 transition-colors hover:bg-bg-black-50"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Views/downloads */}
        {viewCount !== null && (
          <p className="mb-8 text-right text-[12px] text-txt-black-400">
            {viewCount.toLocaleString()} views
          </p>
        )}

        {/* ── Narrowed sections (1/6 padding each side) ───────── */}
        <div className="px-[16.667%]">

        {/* ── Cite ───────────────────────────────────────────── */}
        <section id="dc-cite" className="mb-12">
          <SectionDivider label="Cite" />

          <p className="mb-6 text-[13px] text-txt-black-500">{data.cite.instructions}</p>

          <div className="divide-y divide-otl-gray-200 border-t border-otl-gray-200">
            {(
              [
                { label: "APA",     text: citations.apa },
                { label: "MLA",     text: citations.mla },
                { label: "Chicago", text: citations.chicago },
                { label: "Harvard", text: citations.harvard },
              ] as const
            ).map(({ label, text }) => (
              <div key={label} className="py-5">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <p className="text-[15px] font-semibold text-txt-black-900">{label}</p>
                  <CopyButton text={text} />
                </div>
                <p className="text-[13px] leading-relaxed text-txt-black-600">{text}</p>
              </div>
            ))}

            {/* BibTeX (collapsed) */}
            <div className="py-5">
              <button
                onClick={() => setBibtexOpen((p) => !p)}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <p className="text-[15px] font-semibold text-txt-black-900">BibTeX</p>
                <span className="shrink-0 text-[12px] text-txt-black-400">
                  {bibtexOpen ? "Collapse ▲" : "Expand ▼"}
                </span>
              </button>
              {bibtexOpen && (
                <div className="mt-3">
                  <div className="flex justify-end pb-2">
                    <CopyButton text={citations.bibtex} />
                  </div>
                  <pre className="overflow-auto rounded-lg bg-bg-washed px-4 py-3 font-mono text-[12px] leading-6 text-txt-black-700">
                    {citations.bibtex}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Download ────────────────────────────────────────── */}
        <section id="dc-download" className="mb-12">
          <SectionDivider label="Download" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Parquet */}
            <div className="flex flex-col gap-3 rounded-xl border border-otl-gray-200 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded border border-otl-gray-200 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-txt-black-600">
                  PQ
                </span>
                <span className="text-[14px] font-semibold text-txt-black-900">Parquet</span>
              </div>
              <p className="text-[12px] text-txt-black-500">
                {parquet.n_rows.toLocaleString()} rows · {formatBytes(parquet.size_bytes)}
                <span className="ml-1.5 text-txt-black-400">· recommended</span>
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={parquet.link}
                  download
                  className="flex items-center gap-1.5 rounded-lg border border-otl-gray-200 px-3 py-1.5 text-[13px] font-medium text-txt-black-700 transition-colors hover:bg-bg-black-50"
                >
                  Download
                </a>
                <CopyButton text={parquet.link} label="Copy link" />
              </div>
            </div>

            {/* CSV */}
            <div className="flex flex-col gap-3 rounded-xl border border-otl-gray-200 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded border border-otl-gray-200 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-txt-black-600">
                  CSV
                </span>
                <span className="text-[14px] font-semibold text-txt-black-900">CSV</span>
              </div>
              <p className="text-[12px] text-txt-black-500">
                {(csv.n_rows ?? parquet.n_rows).toLocaleString()} rows · {formatBytes(csv.size_bytes)}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={csv.link}
                  download
                  className="flex items-center gap-1.5 rounded-lg border border-otl-gray-200 px-3 py-1.5 text-[13px] font-medium text-txt-black-700 transition-colors hover:bg-bg-black-50"
                >
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
            <pre className="overflow-auto bg-bg-washed px-5 py-5 font-mono text-[13px] leading-7 text-txt-black-800">
              {snippets[codeLanguage]}
            </pre>
          </div>
        </section>

        </div>{/* end narrowed sections */}
      </div>
    </div>
  );
}
