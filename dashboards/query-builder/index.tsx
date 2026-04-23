import {
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useDeferredValue,
} from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Transition } from "@headlessui/react";
import { clx, numFormat } from "@lib/helpers";
import { sql as sqlLang, StandardSQL } from "@codemirror/lang-sql";
import { format as formatSql } from "sql-formatter";
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
} from "@heroicons/react/20/solid";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

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

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
});

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
type QuerySource = "workspace" | DatasetKey;

function getColType(fieldType: string, sample: any): ColType {
  const ft = fieldType.toLowerCase();
  if (
    ft.includes("date") ||
    ft.includes("timestamp") ||
    ft.includes("time") ||
    sample instanceof Date
  ) {
    return "date";
  }
  if (typeof sample === "number" || typeof sample === "bigint")
    return "numeric";
  return "text";
}

function formatCell(value: any, fieldType: string = ""): string {
  if (value === null || value === undefined) return "—";

  if (value instanceof Date) {
    const hasTime =
      value.getUTCHours() !== 0 ||
      value.getUTCMinutes() !== 0 ||
      value.getUTCSeconds() !== 0;
    return hasTime
      ? value.toLocaleString("en-GB")
      : value.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  }

  // Arrow DATE32 columns sometimes arrive as plain integers (days since epoch in ms)
  const ft = fieldType.toLowerCase();
  if (
    (ft.includes("date") || ft.includes("timestamp")) &&
    typeof value === "number"
  ) {
    const d = new Date(value);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
      <h2 className="font-poppins text-[1.25rem] font-semibold text-txt-black-900">
        {label}
      </h2>
    </div>
  );
}

interface QueryBuilderSidebarProps {
  groupedQuestions: Array<{
    group: InterestingQuestion["group"];
    questions: InterestingQuestion[];
  }>;
  activeSample: string | null;
  loadQuestion: (question: InterestingQuestion) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function QueryBuilderSidebar({
  groupedQuestions,
  activeSample,
  loadQuestion,
  mobileOpen,
  onMobileClose,
}: QueryBuilderSidebarProps) {
  const sidebarContent = (
    <>
      <div className="mb-5 flex flex-col gap-2">
        <Link
          href="https://t.me/myelectiondata"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onMobileClose}
          className="group flex items-center gap-2 rounded-lg border border-otl-gray-200 px-3 py-2 text-body-sm font-medium text-txt-black-700 transition-colors hover:border-otl-danger-200 hover:bg-bg-danger-50 hover:text-txt-danger"
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4 shrink-0 text-txt-black-400 transition-colors group-hover:text-txt-danger" />
          Get help: User group
        </Link>
      </div>

      <div className="mb-4 border-t border-otl-gray-200" />

      <div className="mb-4">
        <p className="text-txt-black-800 mb-1.5 text-[15px] font-semibold leading-6">
          Sample Queries
        </p>
        <p className="text-[13px] leading-5 text-txt-black-500">
          Get a feel for how to build queries and answer a question
        </p>
      </div>
      <div className="space-y-4">
        {groupedQuestions.map(({ group, questions }) => (
          <div key={group}>
            <p className="text-txt-black-400 mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              {getQuestionGroupLabel(group)}
            </p>
            <ul className="space-y-1">
              {questions.map((q) => (
                <li key={q.question}>
                  <button
                    onClick={() => {
                      loadQuestion(q);
                      onMobileClose();
                    }}
                    className={clx(
                      "group w-full rounded-xl border px-3 py-2 text-left transition-colors",
                      activeSample === q.question
                        ? "bg-black-50 border-otl-danger-200 text-txt-black-900"
                        : "border-transparent text-txt-black-700 hover:border-otl-gray-200 hover:bg-bg-black-50 hover:text-txt-black-900",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={clx(
                          "pt-0.5 text-[14px] leading-5 transition-colors",
                          activeSample === q.question
                            ? "text-danger-600"
                            : "text-txt-black-300 group-hover:text-txt-black-500",
                        )}
                      >
                        &rarr;
                      </span>
                      <p
                        className={clx(
                          "text-[14px] font-normal leading-5",
                          activeSample === q.question
                            ? "text-txt-black-900"
                            : "text-inherit",
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
        ))}
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 self-stretch border-r border-otl-gray-200 lg:block">
        <div className="hide-scrollbar sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto pb-10 pr-4 pt-8">
          {sidebarContent}
        </div>
      </aside>
      <Transition show={mobileOpen} as="div" className="fixed inset-0 z-50 lg:hidden">
        <Transition.Child
          as="div"
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="absolute inset-0 bg-black/40"
          onClick={onMobileClose}
        />
        <Transition.Child
          as="aside"
          enter="transition-transform duration-300 ease-out"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition-transform duration-300 ease-in"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
          className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-otl-gray-200 bg-bg-white px-3 pb-10 pt-6 shadow-lg sm:px-4"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="font-poppins text-body-sm font-semibold text-txt-black-900">
              Query Builder
            </span>
            <button
              onClick={onMobileClose}
              className="rounded-md p-1 text-txt-black-400 hover:text-txt-black-700"
              aria-label="Close sample queries"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {sidebarContent}
        </Transition.Child>
      </Transition>
    </>
  );
}

function getQuestionGroupLabel(group: InterestingQuestion["group"]) {
  return group === "Seats" ? "Seats & Contests" : group;
}

function compactFormattedSql(sql: string) {
  const lines = sql.split("\n").map((line) => line.replace(/\s+$/u, ""));
  const compacted: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "CASE") {
      const parts = ["CASE"];
      let endIndex = i + 1;

      while (endIndex < lines.length) {
        const nextTrimmed = lines[endIndex].trim();
        parts.push(nextTrimmed);
        if (nextTrimmed === "END") break;
        endIndex += 1;
      }

      if (parts[parts.length - 1] === "END") {
        const compactCase = parts.join(" ");
        if (compactCase.length <= 100) {
          compacted.push(`${line.match(/^\s*/u)?.[0] ?? ""}${compactCase}`);
          i = endIndex;
          continue;
        }
      }
    }

    if (compacted.length > 0) {
      const prev = compacted[compacted.length - 1];
      const prevTrimmed = prev.trimEnd();
      const currentTrimmed = trimmed;

      if (
        prevTrimmed.endsWith("(") &&
        /^(CASE\b|[A-Za-z_"][\w."']*|\d|\()/u.test(currentTrimmed) &&
        !/^(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|UNION|JOIN)\b/u.test(
          currentTrimmed,
        )
      ) {
        compacted[compacted.length - 1] = `${prevTrimmed}${currentTrimmed}`;
        continue;
      }
    }

    compacted.push(line);
  }

  return compacted.join("\n").replace(/\n{3,}/gu, "\n\n");
}

const QueryResults = memo(function QueryResults({
  result,
}: {
  result: QueryResult;
}) {
  const columnTypes = useMemo<Record<number, ColType>>(() => {
    return result.columns.reduce(
      (acc, _, ci) => {
        const sample = result.rows.find(
          (r) => r[ci] !== null && r[ci] !== undefined,
        )?.[ci];
        acc[ci] = getColType(result.fieldTypes[ci] ?? "", sample);
        return acc;
      },
      {} as Record<number, ColType>,
    );
  }, [result]);

  return (
    <>
      <p className="flex items-center gap-1.5 px-1 text-[12px] text-txt-black-500">
        <CheckCircleIcon className="text-green-600 h-3.5 w-3.5 shrink-0" />
        <span>
          {result.truncated
            ? `${MAX_DISPLAY_ROWS.toLocaleString()}+ rows (capped at ${MAX_DISPLAY_ROWS})`
            : `${result.totalRows.toLocaleString()} row${result.totalRows !== 1 ? "s" : ""}`}
          {" · "}
          {result.columns.length} col{result.columns.length !== 1 ? "s" : ""}
          {" · "}
          {result.executionTime < 1000
            ? `${Math.round(result.executionTime)} ms`
            : `${(result.executionTime / 1000).toFixed(2)} s`}
        </span>
      </p>

      <div className="overflow-hidden rounded-xl border border-otl-gray-200">
        {result.rows.length === 0 ? (
          <div className="text-txt-black-400 bg-white px-4 py-10 text-center text-[13px]">
            Query returned no rows.
          </div>
        ) : (
          <div className="max-h-[24rem] overflow-auto sm:max-h-[28rem] lg:max-h-[36rem]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-black-50">
                  {result.columns.map((col, ci) => (
                    <th
                      key={col}
                      className={clx(
                        "text-txt-black-400 sticky top-0 z-10 whitespace-nowrap border-b border-otl-gray-200 bg-white px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-wider",
                        columnTypes[ci] === "numeric"
                          ? "text-right"
                          : "text-left",
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
                    className="border-otl-gray-100 hover:bg-black-50/60 border-b transition-colors last:border-0"
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={clx(
                          "text-txt-black-800 whitespace-nowrap px-3 py-1.5 font-mono text-[13px]",
                          columnTypes[ci] === "numeric"
                            ? "text-right tabular-nums"
                            : "text-left",
                          columnTypes[ci] === "date" && "text-txt-black-600",
                          (cell === null || cell === undefined) &&
                            "text-txt-black-300 italic",
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
    </>
  );
});

// ── Main dashboard ──────────────────────────────────────────────────────────

export default function QueryBuilderDashboard() {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { db, initializing, error: dbError } = useDuckDB();
  const defaultQuestion = INTERESTING_QUESTIONS[0];
  const hasAppliedSharedQueryRef = useRef(false);
  const shouldAutoRunSharedQueryRef = useRef(false);

  const [queryText, setQueryText] = useState(defaultQuestion.sql);
  const [activeDataset, setActiveDataset] = useState<DatasetKey>(
    defaultQuestion.dataset,
  );
  const [activeSource, setActiveSource] = useState<QuerySource>("workspace");
  const [activeSample, setActiveSample] = useState<string | null>(
    defaultQuestion.question,
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [queryCount, setQueryCount] = useState<number | null>(null);
  const [hasHydratedSharedQuery, setHasHydratedSharedQuery] = useState(false);
  const deferredQueryText = useDeferredValue(queryText);
  const getDatasetPreviewQuery = useCallback(
    (dataset: DatasetKey) => `SELECT *\nFROM ${dataset}\nLIMIT 30`,
    [],
  );
  const activeQueryText = useMemo(
    () =>
      activeSource === "workspace"
        ? queryText
        : getDatasetPreviewQuery(activeSource),
    [activeSource, getDatasetPreviewQuery, queryText],
  );

  const encodedQuery = useMemo(() => {
    const trimmedQuery = activeQueryText.trim();
    return trimmedQuery ? encodeQuery(activeQueryText) : "";
  }, [activeQueryText]);

  const shareUrl = useMemo(() => {
    if (!router.isReady) return "";

    const basePath = router.asPath.split("?")[0] || router.pathname;
    if (typeof window === "undefined") {
      return encodedQuery ? `${basePath}?query=${encodedQuery}` : basePath;
    }

    const baseUrl = `${window.location.origin}${basePath}`;
    return encodedQuery ? `${baseUrl}?query=${encodedQuery}` : baseUrl;
  }, [encodedQuery, router.asPath, router.isReady, router.pathname]);

  const groupedQuestions = useMemo(() => {
    const groupOrder: InterestingQuestion["group"][] = [
      "Seats",
      "Parties",
      "Candidates",
    ];

    return groupOrder.map((group) => ({
      group,
      questions: INTERESTING_QUESTIONS.filter(
        (question) => question.group === group,
      ),
    }));
  }, []);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_TINYBIRD_TOKEN;
    fetch(
      `https://api.us-west-2.aws.tinybird.co/v0/pipes/views_by_page.json?token=${token}&page_id=/query-run`,
    )
      .then((r) => r.json())
      .then((d) => setQueryCount(d?.data?.[0]?.hits ?? null))
      .catch(() => setQueryCount(null));
  }, []);

  // Decode shared query from URL on mount
  useEffect(() => {
    if (!router.isReady || hasAppliedSharedQueryRef.current) return;
    hasAppliedSharedQueryRef.current = true;

    const { query: qp } = router.query;
    if (typeof qp === "string" && qp) {
      try {
        setQueryText(decodeQuery(qp));
        setActiveSource("workspace");
        setActiveSample(null);
        shouldAutoRunSharedQueryRef.current = true;
      } catch {
        // malformed share link — ignore
      }
    }
    setHasHydratedSharedQuery(true);
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!router.isReady || !hasHydratedSharedQuery) return;

    const currentQuery =
      typeof router.query.query === "string" ? router.query.query : "";
    if (currentQuery === (encodedQuery || "")) return;

    void router.replace(
      {
        pathname: router.pathname,
        query: encodedQuery ? { query: encodedQuery } : {},
      },
      undefined,
      { shallow: true },
    );
  }, [encodedQuery, hasHydratedSharedQuery, router]);

  const extensions = useMemo(
    () => [
      sqlLang({
        dialect: StandardSQL,
        schema: Object.fromEntries(
          (Object.keys(DATASETS) as DatasetKey[]).map((key) => [key, []]),
        ),
        defaultTable: activeDataset,
      }),
    ],
    [activeDataset],
  );

  const loadQuestion = useCallback((q: InterestingQuestion) => {
    setQueryText(q.sql);
    setActiveDataset(q.dataset);
    setActiveSource("workspace");
    setActiveSample(q.question);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQueryText(value);
    setActiveSource("workspace");
    setActiveSample(null);
  }, []);

  const handleFormat = useCallback(() => {
    if (!activeQueryText.trim()) return;
    try {
      setQueryText(
        compactFormattedSql(
          formatSql(activeQueryText, {
            language: "duckdb",
            tabWidth: 2,
            keywordCase: "upper",
            logicalOperatorNewline: "before",
            expressionWidth: 200,
          }),
        ),
      );
      setActiveSource("workspace");
      setActiveSample(null);
    } catch {}
  }, [activeQueryText]);

  const handleCopy = useCallback(async () => {
    if (!activeQueryText.trim()) return;
    await navigator.clipboard.writeText(activeQueryText);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  }, [activeQueryText]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareState("copied");
    setTimeout(() => setShareState("idle"), 2000);
  }, [shareUrl]);

  const runQuery = useCallback(
    async (queryOverride?: string) => {
      const sqlToRun = (queryOverride ?? activeQueryText).trim();
      if (!db || running || !sqlToRun) return;
      setRunning(true);
      setQueryError(null);
      setResult(null);

      trackQueryRun();
      setQueryCount((prev) => (prev !== null ? prev + 1 : 1));

      try {
        const prepared = prepareQuery(sqlToRun);
        const start = performance.now();
        const conn = await db.connect();
        const arrowResult = await conn.query(prepared);
        const elapsed = performance.now() - start;
        const columns: string[] = arrowResult.schema.fields.map(
          (f: any) => f.name,
        );
        const fieldTypes: string[] = arrowResult.schema.fields.map(
          (f: any) => f.type?.toString() ?? "",
        );
        const allRows = arrowResult.toArray();
        const rows: any[][] = allRows
          .slice(0, MAX_DISPLAY_ROWS)
          .map((row: any) => columns.map((col) => row[col]));
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
    },
    [activeQueryText, db, running],
  );

  const handleDatasetClick = useCallback((key: DatasetKey) => {
    setActiveDataset(key);
    setActiveSource(key);
    setActiveSample(null);
  }, []);

  useEffect(() => {
    if (
      !shouldAutoRunSharedQueryRef.current ||
      !db ||
      initializing ||
      running ||
      !deferredQueryText.trim()
    ) {
      return;
    }

    shouldAutoRunSharedQueryRef.current = false;
    void runQuery();
  }, [db, deferredQueryText, initializing, runQuery, running]);

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runQuery();
      }
    },
    [runQuery],
  );

  const status = (() => {
    if (dbError)
      return { text: `DuckDB error: ${dbError}`, cls: "text-danger-600" };
    if (initializing)
      return { text: "Initialising DuckDB WASM…", cls: "text-txt-black-500" };
    if (running) return { text: "Running query…", cls: "text-txt-black-500" };
    if (queryError) return { text: queryError, cls: "text-danger-600" };
    if (result) return null;
    return null;
  })();

  return (
    <div className="px-3 sm:px-4.5 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-screen-xl">
        <QueryBuilderSidebar
          groupedQuestions={groupedQuestions}
          activeSample={activeSample}
          loadQuestion={loadQuestion}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* ── Main content ─────────────────────────────────── */}
        <main className="min-w-0 flex-1 px-2 pb-24 pt-8 sm:px-6 lg:px-10">
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center gap-1.5 text-body-sm text-txt-black-600 hover:text-txt-black-900"
              aria-label="Open sample queries"
            >
              <Bars3Icon className="h-5 w-5" />
              Sample Queries
            </button>
          </div>

          {/* Hero */}
          <h1 className="mb-2 font-poppins text-[1.875rem] font-semibold leading-tight text-txt-black-900 sm:text-[2rem]">
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
            <StepLabel n={1} label="Ask AI to build your Query" />
            <p className="mb-4 max-w-2xl text-body-sm text-txt-black-700">
              Why waste time writing SQL? Copy the prompt we&apos;ve prepared
              for you, paste it into the AI tool of your choice, and just ask
              your question directly. It should be able to generate the SQL
              needed for you to get an answer, if the data contains it.
            </p>
            <button
              className="hover:bg-black-50 inline-flex items-center gap-2 rounded-lg border border-otl-gray-200 bg-white px-4 py-2 text-body-sm font-medium text-txt-black-700 transition-colors"
              onClick={() => {}}
            >
              Copy Prompt
            </button>
          </section>

          {/* ── Step 2: Run your Query ── */}
          <section className="mb-12">
            <StepLabel n={2} label="Run your Query" />
            <div
              className="flex flex-col gap-4"
              onKeyDown={handleEditorKeyDown}
            >
              <div className="space-y-3">
                <p className="max-w-2xl text-body-sm text-txt-black-700">
                  Start writing your own custom query, or pick a dataset to inspect.
                </p>

                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
                  <button
                    onClick={() => setActiveSource("workspace")}
                    className={clx(
                      "rounded-xl border px-3 py-2.5 text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600/30",
                      activeSource === "workspace"
                        ? "border-danger-200 bg-bg-danger-50 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.08)]"
                        : "hover:bg-black-50 border-otl-gray-200 bg-white hover:border-otl-danger-200",
                    )}
                  >
                    <p className="truncate text-[13px] font-semibold leading-5 text-txt-black-900">
                      My Workspace
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-txt-black-500">
                      Write any SQL query from scratch
                    </p>
                  </button>

                  {(Object.keys(DATASETS) as DatasetKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => void handleDatasetClick(key)}
                      className={clx(
                        "rounded-xl border px-3 py-2.5 text-left transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600/30",
                        activeSource === key
                          ? "border-danger-200 bg-bg-danger-50 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.08)]"
                          : "hover:bg-black-50 border-otl-gray-200 bg-white hover:border-otl-danger-200",
                      )}
                    >
                      <p className="truncate text-[13px] font-semibold leading-5 text-txt-black-900">
                        {DATASET_LABELS[key]}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-txt-black-500">
                        {DATASET_DESCRIPTIONS[key]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-otl-gray-200 bg-white">
                <div className="bg-black-50 flex items-center justify-between border-b border-otl-gray-200 px-4 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-500">
                    SQL Editor
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleFormat}
                      disabled={!activeQueryText.trim()}
                      className="hover:bg-black-100 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-txt-black-700 transition-colors disabled:opacity-40"
                    >
                      <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
                      Format
                    </button>
                    <button
                      onClick={handleCopy}
                      disabled={!activeQueryText.trim()}
                      title={copyState === "copied" ? "Copied!" : "Copy SQL"}
                      className="hover:bg-black-100 flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-txt-black-500 transition-colors disabled:opacity-40"
                    >
                      {copyState === "copied" ? (
                        <>
                          <ClipboardDocumentCheckIcon className="text-green-600 h-3.5 w-3.5" />
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
                </div>

                <div className="relative overflow-hidden border-b border-otl-gray-200 bg-white [&_.cm-editor.cm-focused]:outline-none [&_.cm-editor]:font-mono [&_.cm-editor]:text-[13px] [&_.cm-focused]:outline-none [&_.cm-scroller]:overflow-hidden">
                  <CodeMirror
                    value={activeQueryText}
                    onChange={handleQueryChange}
                    extensions={extensions}
                    theme="light"
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLineGutter: true,
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

                <div className="bg-black-50 flex items-center justify-between gap-2 border-t border-otl-gray-200 px-3 py-2">
                  <p className="text-[12px] text-txt-black-500">
                    We do not store your queries. Thanks to{" "}
                    <span className="font-semibold text-txt-black-500">
                      DuckDB WASM
                    </span>
                    , everything runs privately in your browser.
                  </p>
                  <button
                    onClick={() => void runQuery()}
                    disabled={
                      !db || initializing || running || !activeQueryText.trim()
                    }
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

              {/* Status bar — plain text, no monospace */}
              {status ? (
                <p className={clx("px-1 text-[11px]", status.cls)}>
                  {status.text}
                </p>
              ) : null}

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
              {result && !queryError && <QueryResults result={result} />}
            </div>
          </section>

          {/* ── Step 3: Share your Query ── */}
          <section className="mb-12">
            <StepLabel n={3} label="Share your Query" />
            <p className="mb-4 max-w-2xl text-body-sm text-txt-black-700">
              Want to send your work to someone else or save it for later?
              Use this shareable link that encodes the current SQL in your workspace, 
              so anyone opening it lands straight in the editor with the
              query ready to run. We do not store your generated link; your work
              is as private as you want it to be.
            </p>
            <div className="bg-black-50 mb-4 max-w-2xl rounded-lg border border-otl-gray-200 px-3 py-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-txt-black-500">
                Shareable link preview
              </p>
              <p className="break-all font-mono text-[12px] leading-5 text-txt-black-700">
                {shareUrl}
              </p>
            </div>
            <button
              onClick={handleShare}
              disabled={!shareUrl}
              className={clx(
                "hover:bg-black-50 inline-flex items-center gap-2 rounded-lg border border-otl-gray-200 bg-white px-4 py-2 text-body-sm font-medium text-txt-black-700 transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {shareState === "copied" ? "Copied!" : "Copy Link"}
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
