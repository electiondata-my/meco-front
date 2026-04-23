import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import { clx, numFormat } from "@lib/helpers";
import { sql as sqlLang, StandardSQL } from "@codemirror/lang-sql";
import { format as formatSql } from "sql-formatter";
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon,
  LinkIcon,
  SparklesIcon,
} from "@heroicons/react/20/solid";

import {
  DATASETS,
  DATASET_LABELS,
  DATASET_DESCRIPTIONS,
  type DatasetKey,
} from "./datasets";
import { INTERESTING_QUESTIONS, type InterestingQuestion } from "./samples";
import { encodeQuery, decodeQuery } from "./codec";
import { prepareQuery } from "./validator";
import { trackQueryRun } from "./trackQueryRun";
import { useDuckDB } from "./useDuckDB";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

const MAX_DISPLAY_ROWS = 500;

interface QueryResult {
  columns: string[];
  fieldTypes: string[];
  rows: any[][];
  executionTime: number;
  totalRows: number;
  truncated: boolean;
}

type ColType = "numeric" | "date" | "text";

function getColType(fieldType: string, sample: any): ColType {
  const ft = fieldType.toLowerCase();
  if (ft.includes("date") || ft.includes("timestamp") || ft.includes("time") || sample instanceof Date) {
    return "date";
  }
  if (typeof sample === "number" || typeof sample === "bigint") return "numeric";
  return "text";
}

function formatCell(value: any, fieldType: string = ""): string {
  if (value === null || value === undefined) return "—";

  if (value instanceof Date) {
    const hasTime =
      value.getUTCHours() !== 0 || value.getUTCMinutes() !== 0 || value.getUTCSeconds() !== 0;
    return hasTime
      ? value.toLocaleString("en-GB")
      : value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Arrow DATE32 columns sometimes arrive as plain integers (days since epoch in ms)
  const ft = fieldType.toLowerCase();
  if ((ft.includes("date") || ft.includes("timestamp")) && typeof value === "number") {
    const d = new Date(value);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  if (typeof value === "bigint") return value.toLocaleString("en-GB");
  if (typeof value === "number") return value.toLocaleString("en-GB");
  return String(value);
}

function StepLabel({ n, label }: { n: number; label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-600 text-[12px] font-bold text-white">
        {n}
      </div>
      <h2 className="font-poppins text-[1.25rem] font-semibold text-txt-black-900">{label}</h2>
    </div>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────

export default function QueryBuilderDashboard() {
  const router = useRouter();
  const { db, initializing, error: dbError } = useDuckDB();
  const defaultQuestion = INTERESTING_QUESTIONS[0];

  const [queryText, setQueryText] = useState(defaultQuestion.sql);
  const [activeDataset, setActiveDataset] = useState<DatasetKey>(defaultQuestion.dataset);
  const [activeSample, setActiveSample] = useState<string | null>(defaultQuestion.question);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [queryCount, setQueryCount] = useState<number | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_TINYBIRD_TOKEN;
    fetch(
      `https://api.us-west-2.aws.tinybird.co/v0/pipes/views_by_page.json?token=${token}&page_id=/query-run`
    )
      .then(r => r.json())
      .then(d => setQueryCount(d?.data?.[0]?.hits ?? null))
      .catch(() => setQueryCount(null));
  }, []);

  // Decode shared query from URL on mount
  useEffect(() => {
    if (!router.isReady) return;
    const { query: qp } = router.query;
    if (typeof qp === "string" && qp) {
      try {
        setQueryText(decodeQuery(qp));
        setActiveSample(null);
      } catch {
        // malformed share link — ignore
      }
    }
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const extensions = useMemo(
    () => [
      sqlLang({
        dialect: StandardSQL,
        schema: { results_ballots: [], results_stats: [] },
        defaultTable: activeDataset,
      }),
    ],
    [activeDataset]
  );

  // Per-column types derived from Arrow schema + first non-null sample
  const columnTypes = useMemo<Record<number, ColType>>(() => {
    if (!result) return {};
    return result.columns.reduce(
      (acc, _, ci) => {
        const sample = result.rows.find(r => r[ci] !== null && r[ci] !== undefined)?.[ci];
        acc[ci] = getColType(result.fieldTypes[ci] ?? "", sample);
        return acc;
      },
      {} as Record<number, ColType>
    );
  }, [result]);

  const loadQuestion = useCallback((q: InterestingQuestion) => {
    setQueryText(q.sql);
    setActiveDataset(q.dataset);
    setActiveSample(q.question);
    setResult(null);
    setQueryError(null);
  }, []);

  const handleDatasetClick = useCallback((key: DatasetKey) => {
    setActiveDataset(key);
    setQueryText(`SELECT *\nFROM ${key}\nLIMIT 20`);
    setActiveSample(null);
    setResult(null);
    setQueryError(null);
  }, []);

  const handleFormat = useCallback(() => {
    if (!queryText.trim()) return;
    try {
      setQueryText(
        formatSql(queryText, {
          language: "duckdb",
          tabWidth: 2,
          keywordCase: "upper",
          logicalOperatorNewline: "after",
          expressionWidth: 120,
        })
      );
    } catch {}
  }, [queryText]);

  const handleCopy = useCallback(async () => {
    if (!queryText.trim()) return;
    await navigator.clipboard.writeText(queryText);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  }, [queryText]);

  const handleShare = useCallback(async () => {
    if (!queryText.trim()) return;
    const encoded = encodeQuery(queryText);
    const url = `${window.location.origin}${window.location.pathname}?query=${encoded}`;
    await navigator.clipboard.writeText(url);
    router.replace({ query: { query: encoded } }, undefined, { shallow: true });
    setShareState("copied");
    setTimeout(() => setShareState("idle"), 2000);
  }, [queryText, router]);

  const runQuery = useCallback(async () => {
    if (!db || running || !queryText.trim()) return;
    setRunning(true);
    setQueryError(null);
    setResult(null);

    trackQueryRun();
    setQueryCount(prev => (prev !== null ? prev + 1 : 1));

    try {
      const prepared = prepareQuery(queryText);
      const start = performance.now();
      const conn = await db.connect();
      const arrowResult = await conn.query(prepared);
      const elapsed = performance.now() - start;
      const columns: string[] = arrowResult.schema.fields.map((f: any) => f.name);
      const fieldTypes: string[] = arrowResult.schema.fields.map(
        (f: any) => f.type?.toString() ?? ""
      );
      const allRows = arrowResult.toArray();
      const rows: any[][] = allRows
        .slice(0, MAX_DISPLAY_ROWS)
        .map((row: any) => columns.map(col => row[col]));
      setResult({
        columns,
        fieldTypes,
        rows,
        executionTime: elapsed,
        totalRows: arrowResult.numRows,
        truncated: arrowResult.numRows > MAX_DISPLAY_ROWS,
      });
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [db, queryText, running]);

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runQuery();
      }
    },
    [runQuery]
  );

  const status = (() => {
    if (dbError) return { text: `DuckDB error: ${dbError}`, cls: "text-danger-600" };
    if (initializing) return { text: "Initialising DuckDB WASM…", cls: "text-txt-black-500" };
    if (running) return { text: "Running query…", cls: "text-txt-black-500" };
    if (queryError) return { text: queryError, cls: "text-danger-600" };
    if (result) {
      return { text: "Query complete", cls: "text-txt-black-400" };
    }
    return { text: "Cmd + Enter / Ctrl + Enter to run", cls: "text-txt-black-400" };
  })();

  return (
    <div className="px-4.5 md:px-6">
      <div className="mx-auto flex w-full max-w-screen-xl min-h-[calc(100vh-4rem)]">

        {/* ── Left sidebar ─────────────────────────────────── */}
        <aside className="hidden shrink-0 lg:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)] w-60 overflow-y-auto border-r border-otl-gray-200 pb-10 pr-4 pt-8">
            <div className="mb-5 flex flex-col gap-2">
              <Link
                href="https://t.me/myelectiondata"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-otl-danger-200 bg-bg-danger-50 px-3 py-2.5 text-[15px] font-medium leading-6 text-txt-danger transition-colors hover:bg-bg-danger-100"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4 shrink-0" />
                Get help: User group
              </Link>
            </div>

            <div className="mb-4 border-t border-otl-gray-200" />

            <div className="mb-4">
              <p className="mb-1.5 text-[15px] font-semibold leading-6 text-txt-black-800">
                Sample Queries
              </p>
              <p className="text-[13px] leading-5 text-txt-black-500">
                Get a feel for how to build queries and answer a question
              </p>
            </div>
            <ul className="space-y-1">
              {INTERESTING_QUESTIONS.map(q => (
                <li key={q.question}>
                  <button
                    onClick={() => loadQuestion(q)}
                    className={clx(
                      "group w-full rounded-lg px-2 py-1.5 text-left transition-colors",
                      activeSample === q.question
                        ? "bg-bg-danger-50 text-txt-danger"
                        : "text-txt-black-700 hover:bg-bg-black-50 hover:text-txt-black-900"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={clx(
                          "mt-2 h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                          activeSample === q.question
                            ? "bg-danger-600"
                            : "bg-txt-black-300 group-hover:bg-txt-black-500"
                        )}
                      />
                      <p
                        className={clx(
                          "text-[15px] leading-6",
                          activeSample === q.question
                            ? "font-medium text-txt-danger"
                            : "font-normal text-inherit"
                        )}
                      >
                        {q.question}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────── */}
        <main className="min-w-0 flex-1 px-6 pb-24 pt-8 sm:px-8 lg:px-10">

          {/* Hero */}
          <h1 className="font-poppins text-[1.875rem] font-semibold leading-tight text-txt-black-900 sm:text-[2rem] mb-2">
            Query Builder
          </h1>
          <p className="mb-12 flex items-center gap-1.5 text-body-sm text-txt-black-500">
            <SparklesIcon className="h-4 w-4 shrink-0" />
            {queryCount !== null
              ? `${numFormat(queryCount, "standard")} queries built so far`
              : "..."}
          </p>

          {/* ── Step 1: Ask AI ── */}
          <section className="mb-12">
            <StepLabel n={1} label="Ask AI to build your query" />
            <p className="mb-4 max-w-2xl text-body-sm text-txt-black-700">
              Why waste time writing SQL? Copy the prompt we&apos;ve prepared for you, paste it into
              the AI tool of your choice, and just ask your question directly. It should be able to
              generate the SQL needed for you to get an answer, if the data contains it.
            </p>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-otl-gray-200 bg-white px-4 py-2 text-body-sm font-medium text-txt-black-700 transition-colors hover:bg-black-50"
              onClick={() => {}}
            >
              Copy Prompt
            </button>
          </section>

          {/* ── Step 2: Run your Query ── */}
          <section className="mb-12">
            <StepLabel n={2} label="Run your Query" />
            <div className="flex flex-col gap-4" onKeyDown={handleEditorKeyDown}>

              {/* Dataset chips */}
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(DATASETS) as DatasetKey[]).map(key => (
                  <button
                    key={key}
                    onClick={() => handleDatasetClick(key)}
                    className={clx(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                      activeDataset === key
                        ? "border-danger-600 bg-danger-600 text-white"
                        : "border-otl-gray-200 bg-white text-txt-black-700 hover:border-danger-600 hover:text-danger-600"
                    )}
                  >
                    <span
                      className={clx(
                        "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                        activeDataset === key ? "bg-white" : "bg-txt-black-400"
                      )}
                    />
                    {DATASET_LABELS[key]}
                  </button>
                ))}
                <span className="hidden text-[11px] text-txt-black-500 sm:inline">
                  — {DATASET_DESCRIPTIONS[activeDataset]}
                </span>
              </div>

              {/* Editor card */}
              <div className="overflow-hidden rounded-xl border border-otl-gray-200 bg-white">
                {/* Editor header — label left, copy button right */}
                <div className="flex items-center justify-between border-b border-otl-gray-200 bg-black-50 px-4 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-500">
                    SQL Editor
                  </span>
                  <button
                    onClick={handleCopy}
                    disabled={!queryText.trim()}
                    title={copyState === "copied" ? "Copied!" : "Copy SQL"}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-txt-black-500 transition-colors hover:bg-black-100 disabled:opacity-40"
                  >
                    {copyState === "copied" ? (
                      <>
                        <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* CodeMirror */}
                <div className="[&_.cm-editor.cm-focused]:outline-none [&_.cm-editor]:font-mono [&_.cm-editor]:text-[13px] [&_.cm-focused]:outline-none">
                  <CodeMirror
                    value={queryText}
                    onChange={setQueryText}
                    extensions={extensions}
                    theme="light"
                    minHeight="180px"
                    maxHeight="380px"
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLineGutter: true,
                      foldGutter: false,
                      dropCursor: false,
                      indentOnInput: true,
                      bracketMatching: true,
                      closeBrackets: true,
                      autocompletion: true,
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

                {/* Action bar */}
                <div className="flex items-center justify-between gap-2 border-t border-otl-gray-200 bg-black-50 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleFormat}
                      disabled={!queryText.trim()}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-txt-black-700 transition-colors hover:bg-black-100 disabled:opacity-40"
                    >
                      <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
                      Format
                    </button>
                    <button
                      onClick={handleShare}
                      disabled={!queryText.trim()}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-txt-black-700 transition-colors hover:bg-black-100 disabled:opacity-40"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      {shareState === "copied" ? "Link copied!" : "Share"}
                    </button>
                  </div>
                  <button
                    onClick={runQuery}
                    disabled={!db || initializing || running || !queryText.trim()}
                    className={clx(
                      "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12px] font-semibold transition-colors",
                      "bg-danger-600 text-white hover:bg-danger-700",
                      "disabled:cursor-not-allowed disabled:opacity-50"
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

              {/* Status bar — plain text, no monospace */}
              <p className={clx("px-1 text-[11px]", status.cls)}>{status.text}</p>

              {/* Query error */}
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

              {/* Results table */}
              {result && !queryError && (
                <>
                  {/* Metadata row above the table */}
                  <p className="px-1 text-[12px] text-txt-black-500">
                    {result.truncated
                      ? `${MAX_DISPLAY_ROWS.toLocaleString()}+ rows (capped at ${MAX_DISPLAY_ROWS})`
                      : `${result.totalRows.toLocaleString()} row${result.totalRows !== 1 ? "s" : ""}`}
                    {" · "}
                    {result.columns.length} col{result.columns.length !== 1 ? "s" : ""}
                    {" · "}
                    {result.executionTime < 1000
                      ? `${Math.round(result.executionTime)} ms`
                      : `${(result.executionTime / 1000).toFixed(2)} s`}
                  </p>

                  <div className="overflow-hidden rounded-xl border border-otl-gray-200">
                    {/* Results header */}
                    <div className="flex items-center border-b border-otl-gray-200 bg-black-50 px-4 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-500">
                        Results
                      </span>
                    </div>

                    {result.rows.length === 0 ? (
                      <div className="bg-white px-4 py-10 text-center text-[13px] text-txt-black-400">
                        Query returned no rows.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[13px]">
                          <thead>
                            <tr className="bg-black-50">
                              {result.columns.map((col, ci) => (
                                <th
                                  key={col}
                                  className={clx(
                                    "whitespace-nowrap border-b border-otl-gray-200 px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-wider text-txt-black-400",
                                    columnTypes[ci] === "numeric" ? "text-right" : "text-left"
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
                                className="border-b border-otl-gray-100 last:border-0 transition-colors hover:bg-black-50/60"
                              >
                                {row.map((cell, ci) => (
                                  <td
                                    key={ci}
                                    className={clx(
                                      "whitespace-nowrap px-3 py-1.5 font-mono text-[13px] text-txt-black-800",
                                      columnTypes[ci] === "numeric"
                                        ? "text-right tabular-nums"
                                        : "text-left",
                                      columnTypes[ci] === "date" && "text-txt-black-600",
                                      (cell === null || cell === undefined) &&
                                        "italic text-txt-black-300"
                                    )}
                                  >
                                    {formatCell(cell, result.fieldTypes[ci])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* DuckDB attribution */}
                  <p className="px-1 text-[11px] text-txt-black-400">
                    Powered by <span className="font-semibold text-txt-black-500">DuckDB WASM</span> — all queries run in your browser
                  </p>
                </>
              )}
            </div>
          </section>

          {/* ── Step 3: Visualise ── */}
          <section className="mb-12">
            <StepLabel n={3} label="Visualise" />
            <div className="rounded-xl border border-dashed border-otl-gray-300 bg-black-50 px-6 py-16 text-center text-body-sm text-txt-black-400">
              Coming soon
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
