import {
  memo,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useDeferredValue,
} from "react";
import { Transition } from "@headlessui/react";
import { clx, numFormat } from "@lib/helpers";
import { sql as sqlLang, StandardSQL } from "@codemirror/lang-sql";
import { format as formatSql } from "sql-formatter";
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  ClipboardIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  PencilSquareIcon,
} from "@heroicons/react/20/solid";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import CodeMirror from "@uiw/react-codemirror";

import {
  DATASETS,
  DATASET_LABELS,
  DATASET_DESCRIPTIONS,
  type DatasetKey,
} from "@tools/query-builder/datasets";
import {
  INTERESTING_QUESTIONS,
  type InterestingQuestion,
} from "@tools/query-builder/samples";
import {
  encodeQuery,
  decodeQuery,
} from "@tools/query-builder/codec";
import copyPrompt from "@tools/query-builder/copy-prompt.md?raw";
import { prepareQuery } from "@tools/query-builder/validator";
import { trackQueryRun } from "@tools/query-builder/trackQueryRun";
import { useDuckDB } from "@tools/query-builder/useDuckDB";
import {
  VirtualDuckDBTable,
  MAX_DISPLAY_ROWS,
  type DuckDBQueryResult as QueryResult,
} from "@tools/query-builder/VirtualDuckDBTable";

// Persists for the page session — avoids re-downloading non-lazy datasets on every query.
const fileBufferCache = new Map<string, Uint8Array>();

const QUERY_SHORTENER_URL = "https://querybuilder.electiondata.my";
const QUERY_SHORTENER_ALLOWED_ORIGINS = ["https://electiondata.my", "https://staging.electiondata.my"];

type ColType = "numeric" | "date" | "text";
type QuerySource = "workspace" | DatasetKey;
type NumericFormatOptions = {
  columnName?: string;
  decimalPlaces?: number;
};

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

function isYearColumn(columnName: string = ""): boolean {
  return columnName.toLowerCase().includes("year");
}

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

function getDecimalPlaces(value: number): number {
  if (!Number.isFinite(value) || Number.isInteger(value)) return 0;

  const normalized = value.toString().toLowerCase();
  if (normalized.includes("e")) {
    const [mantissa, exponent] = normalized.split("e");
    const mantissaDecimals = (mantissa.split(".")[1] ?? "").length;
    return Math.max(0, mantissaDecimals - Number(exponent));
  }

  return (normalized.split(".")[1] ?? "").length;
}

function formatCell(
  value: any,
  fieldType: string = "",
  options: NumericFormatOptions = {},
): string {
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

  if (isYearColumn(options.columnName)) return String(value);

  if (typeof value === "bigint") return value.toLocaleString("en-GB");
  if (typeof value === "number") {
    const dp = options.decimalPlaces != null && options.decimalPlaces > 0 ? 2 : 0;
    return value.toLocaleString("en-GB", {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    });
  }
  return String(value);
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/u.test(value)) {
    return `"${value.replace(/"/gu, '""')}"`;
  }
  return value;
}

function buildCsv(result: QueryResult): string {
  const header = result.columns.map(escapeCsvCell).join(",");
  const rows = result.rows.map((row) =>
    row
      .map((cell, ci) =>
        escapeCsvCell(
          cell === null || cell === undefined
            ? ""
            : formatCell(cell, result.fieldTypes[ci], {
                columnName: result.columns[ci],
              }),
        ),
      )
      .join(","),
  );

  return [header, ...rows].join("\n");
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
        <a
          href="https://t.me/myelectiondata"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onMobileClose}
          className="group flex items-center gap-2 rounded-lg border border-otl-gray-200 px-3 py-2 text-body-sm font-medium text-txt-black-700 transition-colors hover:border-otl-danger-200 hover:bg-bg-danger-50 hover:text-txt-danger"
        >
          <ChatBubbleLeftRightIcon className="text-txt-black-400 h-4 w-4 shrink-0 transition-colors group-hover:text-txt-danger" />
          Get help: User group
        </a>
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
                        ? "border-otl-danger-200 bg-bg-danger-50 text-txt-black-900"
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
      <Transition
        show={mobileOpen}
        as="div"
        className="fixed inset-0 z-50 lg:hidden"
      >
        <Transition.Child
          as="div"
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="bg-black/40 absolute inset-0"
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
          className="shadow-lg absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-otl-gray-200 bg-bg-white px-3 pb-10 pt-6 sm:px-4"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="font-poppins text-body-sm font-semibold text-txt-black-900">
              Query Builder
            </span>
            <button
              onClick={onMobileClose}
              className="text-txt-black-400 rounded-md p-1 hover:text-txt-black-700"
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
  onCopyCsv,
  csvCopyState,
}: {
  result: QueryResult;
  onCopyCsv: () => void;
  csvCopyState: "idle" | "copied";
}) {
  const columnMeta = useMemo<
    Record<number, { type: ColType; decimalPlaces?: number }>
  >(() => {
    return result.columns.reduce(
      (acc, column, ci) => {
        const values = result.rows
          .map((row) => row[ci])
          .filter((value) => value !== null && value !== undefined);
        const sample = values[0];
        const type = isYearColumn(column)
          ? "text"
          : getColType(result.fieldTypes[ci] ?? "", sample);

        acc[ci] = {
          type,
          decimalPlaces:
            type === "numeric"
              ? values.reduce<number>((max, value) => {
                  if (typeof value !== "number") return max;
                  return Math.max(max, getDecimalPlaces(value));
                }, 0)
              : undefined,
        };
        return acc;
      },
      {} as Record<number, { type: ColType; decimalPlaces?: number }>,
    );
  }, [result]);

  return (
    <div className="overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-white">
      <div className="flex items-end justify-between gap-3 border-b border-otl-gray-200 px-4 py-2">
        <p className="flex items-center gap-1.5 text-[12px] text-txt-black-500">
          <CheckCircleIcon className="text-green-600 h-3.5 w-3.5 shrink-0" />
          <span>
            {result.truncated
              ? `${MAX_DISPLAY_ROWS.toLocaleString()}+ rows (capped at 10k)`
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
          title={csvCopyState === "copied" ? "Copied!" : "Copy results as CSV"}
        >
          {csvCopyState === "copied" ? (
            <>
              <ClipboardDocumentCheckIcon className="text-green-600 h-3.5 w-3.5" />
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
        <div className="text-txt-black-400 bg-bg-white px-4 py-10 text-center text-[13px]">
          Query returned no rows.
        </div>
      ) : (
        <VirtualDuckDBTable
          result={result}
          isRightAligned={result.columns.map((_, ci) => columnMeta[ci]?.type === "numeric")}
          renderCell={(cell, ci) =>
            formatCell(cell, result.fieldTypes[ci], {
              columnName: result.columns[ci],
              decimalPlaces: columnMeta[ci]?.decimalPlaces,
            })
          }
          cellClassName={(_, ci) =>
            columnMeta[ci]?.type === "date" ? "text-txt-black-600" : undefined
          }
        />
      )}
    </div>
  );
});

// ── Main dashboard ──────────────────────────────────────────────────────────

export default function QueryBuilderDashboard() {
  const yearsOfData = new Date().getFullYear() - 1955;
  const resolvedTheme = useDarkMode();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { db, initializing, error: dbError } = useDuckDB();
  const defaultQuestion = INTERESTING_QUESTIONS[0];
  const hasAppliedSharedQueryRef = useRef(false);
  const shouldAutoRunSharedQueryRef = useRef(false);
  const editorSectionRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);
  const turnstileCallbackRef = useRef<{
    resolve: (token: string) => void;
    reject: (err: Error) => void;
  } | null>(null);
  const prefetchedTokenRef = useRef<{ token: string; ts: number } | null>(null);
  const prefetchInProgressRef = useRef(false);

  // Client-side router state (replaces useRouter)
  const [isReady, setIsReady] = useState(false);
  useEffect(() => { setIsReady(true); }, []);

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
  const [promptCopyState, setPromptCopyState] = useState<"idle" | "copied">(
    "idle",
  );
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [csvCopyState, setCsvCopyState] = useState<"idle" | "copied">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [shortenState, setShortenState] = useState<"idle" | "shortening">("idle");
  const [shortenError, setShortenError] = useState<string | null>(null);
  const [shortQueryId, setShortQueryId] = useState<string | null>(null);
  const [lastSuccessfulQuery, setLastSuccessfulQuery] = useState<string | null>(null);
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
    if (!isReady) return "";
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    if (shortQueryId) return `${baseUrl}?id=${shortQueryId}`;
    return encodedQuery ? `${baseUrl}?query=${encodedQuery}` : baseUrl;
  }, [encodedQuery, isReady, shortQueryId]);

  const hasShortShareLink = useMemo(() => {
    if (shortQueryId) return true;
    if (isReady) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("id")) return true;
    }
    return /[?&]id=[^&]+/u.test(shareUrl);
  }, [isReady, shareUrl, shortQueryId]);

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
    const token = import.meta.env.PUBLIC_TINYBIRD_TOKEN;
    fetch(
      `https://api.us-west-2.aws.tinybird.co/v0/pipes/views_by_page.json?token=${token}&page_id=/query-run`,
    )
      .then((r) => r.json())
      .then((d) => setQueryCount(d?.data?.[0]?.hits ?? null))
      .catch(() => setQueryCount(null));
  }, []);

  useEffect(() => {
    setCsvCopyState("idle");
  }, [result]);

  const handleTurnstileScriptLoad = useCallback(() => {
    if (typeof window === "undefined" || !window.turnstile) return;
    if (turnstileWidgetRef.current) return;

    // Triggers a background Turnstile challenge so a token is ready before the
    // user clicks "Shorten Link". Skips if a sync request or prefetch is already
    // in flight. Also called after each token is consumed to keep the cache warm.
    const triggerPrefetch = () => {
      if (prefetchInProgressRef.current) return;
      if (turnstileCallbackRef.current) return;
      if (!turnstileWidgetRef.current || !window.turnstile) return;
      prefetchInProgressRef.current = true;
      window.turnstile.reset(turnstileWidgetRef.current);
      window.turnstile.execute(turnstileWidgetRef.current);
    };

    turnstileWidgetRef.current = window.turnstile.render(
      "#query-builder-turnstile",
      {
        sitekey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? "",
        callback: (token: string) => {
          const cb = turnstileCallbackRef.current;
          prefetchInProgressRef.current = false;
          if (cb) {
            // A synchronous getTurnstileToken() call was waiting — resolve it,
            // then immediately warm up the next token in the background.
            turnstileCallbackRef.current = null;
            cb.resolve(token);
            setTimeout(triggerPrefetch, 0);
          } else {
            // Background prefetch completed — cache the token.
            prefetchedTokenRef.current = { token, ts: Date.now() };
          }
        },
        "error-callback": () => {
          const cb = turnstileCallbackRef.current;
          prefetchInProgressRef.current = false;
          if (cb) {
            turnstileCallbackRef.current = null;
            cb.reject(new Error("Verification failed"));
          }
          // Retry background prefetch after a short delay.
          setTimeout(triggerPrefetch, 5000);
        },
        size: "invisible",
        execution: "execute",
      },
    );

    // Start warming the token as soon as the widget is ready.
    triggerPrefetch();
  }, []);

  const getTurnstileToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!turnstileWidgetRef.current || !window.turnstile) {
        reject(new Error("Verification not available"));
        return;
      }

      // Use the pre-fetched token if it's less than 4 minutes old.
      const cached = prefetchedTokenRef.current;
      if (cached && Date.now() - cached.ts < 4 * 60 * 1000) {
        prefetchedTokenRef.current = null;
        // Start warming the next token immediately after consuming this one.
        // prefetchInProgressRef guards against double-execution inside the callback.
        prefetchInProgressRef.current = true;
        window.turnstile.reset(turnstileWidgetRef.current);
        window.turnstile.execute(turnstileWidgetRef.current);
        resolve(cached.token);
        return;
      }

      // No fresh cached token — take over the widget (cancels any prefetch in flight).
      prefetchedTokenRef.current = null;
      prefetchInProgressRef.current = false;
      turnstileCallbackRef.current = { resolve, reject };
      window.turnstile.reset(turnstileWidgetRef.current);
      window.turnstile.execute(turnstileWidgetRef.current);

      setTimeout(() => {
        if (turnstileCallbackRef.current) {
          turnstileCallbackRef.current = null;
          reject(new Error("Verification timed out"));
        }
      }, 15000);
    });
  }, []);

  // Load Turnstile script dynamically — fires handleTurnstileScriptLoad on ready
  useEffect(() => {
    if (window.turnstile) {
      handleTurnstileScriptLoad();
      return;
    }

    const existing = document.getElementById("cf-turnstile-script");
    if (existing) {
      existing.addEventListener("load", handleTurnstileScriptLoad);
      return () => existing.removeEventListener("load", handleTurnstileScriptLoad);
    }

    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = handleTurnstileScriptLoad;
    document.head.appendChild(script);
  }, [handleTurnstileScriptLoad]);

  // Decode shared query from URL on mount
  useEffect(() => {
    if (!isReady || hasAppliedSharedQueryRef.current) return;
    hasAppliedSharedQueryRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const qp = params.get("query");

    if (id) {
      fetch(`${QUERY_SHORTENER_URL}/q/${encodeURIComponent(id)}`)
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || typeof data.query !== "string") {
            throw new Error("Could not load the short query link.");
          }

          setQueryText(data.query);
          setActiveSource("workspace");
          setActiveSample(null);
          setShortQueryId(id);
          shouldAutoRunSharedQueryRef.current = true;
        })
        .catch(() => {
          setQueryError("Could not load the short query link.");
        })
        .finally(() => setHasHydratedSharedQuery(true));
      return;
    }

    if (qp) {
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
  }, [isReady]);

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

  const clearShareParamsFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("query") && !params.has("id")) return;
    params.delete("query");
    params.delete("id");
    const search = params.toString();
    history.replaceState(
      null,
      "",
      search ? `${window.location.pathname}?${search}` : window.location.pathname,
    );
  }, []);

  const scrollToEditor = useCallback(() => {
    const editorTop = editorSectionRef.current?.getBoundingClientRect().top;
    if (editorTop === undefined) return;

    const navbarOffset = 88;
    window.scrollTo({
      top: window.scrollY + editorTop - navbarOffset,
      behavior: "smooth",
    });
  }, []);

  const loadQuestion = useCallback(
    (q: InterestingQuestion) => {
      clearShareParamsFromUrl();
      setQueryText(q.sql);
      setActiveDataset(q.dataset);
      setActiveSource("workspace");
      setActiveSample(q.question);
      setShortQueryId(null);
      setShortenError(null);
      scrollToEditor();
    },
    [clearShareParamsFromUrl, scrollToEditor],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      clearShareParamsFromUrl();
      setQueryText(value);
      setActiveSource("workspace");
      setActiveSample(null);
      setShortQueryId(null);
      setShortenError(null);
    },
    [clearShareParamsFromUrl],
  );

  const handleFormat = useCallback(() => {
    if (!activeQueryText.trim()) return;
    try {
      clearShareParamsFromUrl();
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
      setShortQueryId(null);
      setShortenError(null);
    } catch {}
  }, [activeQueryText, clearShareParamsFromUrl]);

  const handleCopy = useCallback(async () => {
    if (!activeQueryText.trim()) return;
    await navigator.clipboard.writeText(activeQueryText);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  }, [activeQueryText]);

  const handleClear = useCallback(() => {
    clearShareParamsFromUrl();
    setQueryText("");
    setActiveSource("workspace");
    setActiveSample(null);
    setShortQueryId(null);
    setShortenError(null);
  }, [clearShareParamsFromUrl]);

  const handlePaste = useCallback(async () => {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) return;
    clearShareParamsFromUrl();
    setQueryText(text);
    setActiveSource("workspace");
    setActiveSample(null);
    setShortQueryId(null);
    setShortenError(null);
  }, [clearShareParamsFromUrl]);

  const handleCopyPrompt = useCallback(async () => {
    await navigator.clipboard.writeText(copyPrompt);
    setPromptCopyState("copied");
    setTimeout(() => setPromptCopyState("idle"), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareState("copied");
    setTimeout(() => setShareState("idle"), 2000);
  }, [shareUrl]);

  const handleCopyCsv = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(buildCsv(result));
    setCsvCopyState("copied");
    setTimeout(() => setCsvCopyState("idle"), 2000);
  }, [result]);

  const runQuery = useCallback(
    async (queryOverride?: string) => {
      const sqlToRun = (queryOverride ?? activeQueryText).trim();
      if (!db || running || !sqlToRun) return false;
      setRunning(true);
      setQueryError(null);
      setResult(null);

      trackQueryRun();
      setQueryCount((prev) => (prev !== null ? prev + 1 : 1));

      try {
        const { sql: prepared, registrations } = prepareQuery(sqlToRun);
        for (const { name, url, lazy } of registrations) {
          if (lazy) {
            await db.registerFileURL(name, url, 4, false);
          } else {
            if (!fileBufferCache.has(name)) {
              const buf = await fetch(url).then((r) => r.arrayBuffer());
              fileBufferCache.set(name, new Uint8Array(buf));
            }
            await db.registerFileBuffer(name, fileBufferCache.get(name)!);
          }
        }
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
        setLastSuccessfulQuery(sqlToRun);
        return true;
      } catch (err) {
        setQueryError(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        setRunning(false);
      }
    },
    [activeQueryText, db, running],
  );

  const handleDatasetClick = useCallback(
    (key: DatasetKey) => {
      clearShareParamsFromUrl();
      setActiveDataset(key);
      setActiveSource(key);
      setActiveSample(null);
      setShortQueryId(null);
      setShortenError(null);
    },
    [clearShareParamsFromUrl],
  );

  const handleShortenLink = useCallback(async () => {
    const sqlToShorten = activeQueryText.trim();
    if (
      hasShortShareLink ||
      !sqlToShorten ||
      !db ||
      running ||
      shortenState !== "idle" ||
      sqlToShorten !== lastSuccessfulQuery
    ) {
      return;
    }

    setShortenError(null);
    setShortenState("shortening");
    try {
      if (!QUERY_SHORTENER_ALLOWED_ORIGINS.includes(window.location.origin)) {
        throw new Error(
          `The link shortening service cannot be accessed from ${window.location.origin}. It only works on ${QUERY_SHORTENER_ALLOWED_ORIGINS.join(" or ")}.`,
        );
      }
      const turnstile_token = await getTurnstileToken();
      const res = await fetch(`${QUERY_SHORTENER_URL}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlToShorten, turnstile_token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.id !== "string") {
        throw new Error("Could not shorten this link. Please try again.");
      }

      setShortQueryId(data.id);
      history.replaceState(
        null,
        "",
        `${window.location.pathname}?id=${encodeURIComponent(data.id)}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "Verification not available") {
        setShortenError(
          "The query is valid, but Turnstile is not available yet. Try again shortly.",
        );
      } else if (message === "Verification timed out") {
        setShortenError(
          "The query is valid, but Turnstile verification timed out. Please try again.",
        );
      } else if (message === "Verification failed") {
        setShortenError(
          "The query is valid, but Turnstile verification failed. Please try again.",
        );
      } else if (message === "Failed to fetch") {
        setShortenError(
          "The query is valid, but the link shortening service could not be reached due to a network failure. Check your connection and try again.",
        );
      } else {
        setShortenError(
          message || "The query is valid, but the link could not be shortened.",
        );
      }
    } finally {
      setShortenState("idle");
    }
  }, [
    activeQueryText,
    db,
    getTurnstileToken,
    hasShortShareLink,
    lastSuccessfulQuery,
    running,
    shortenState,
  ]);

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
              className="text-txt-black-600 flex items-center gap-1.5 text-body-sm hover:text-txt-black-900"
              aria-label="Open sample queries"
            >
              <Bars3Icon className="h-5 w-5" />
              Sample Queries
            </button>
          </div>

          {/* Hero */}
          <h1 className="mb-2 font-poppins text-[1.875rem] font-semibold leading-tight text-txt-black-900 sm:text-[2rem]">
            Explore {yearsOfData} years of election data.<br />
            You don&apos;t need code, only a question.
          </h1>
          <p className="mb-8 flex items-center gap-1.5 text-body-sm text-txt-black-500">
            <SparklesIcon className="h-4 w-4 shrink-0" />
            {queryCount !== null
              ? `${numFormat(queryCount, "standard")} queries built and served`
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
              className="inline-flex items-center gap-2 rounded-lg border border-otl-gray-200 bg-bg-white px-4 py-2 text-body-sm font-medium text-txt-black-700 transition-colors hover:bg-bg-black-50"
              onClick={handleCopyPrompt}
              title={
                promptCopyState === "copied" ? "Prompt copied!" : "Copy prompt"
              }
            >
              {promptCopyState === "copied" ? (
                <>
                  <ClipboardDocumentCheckIcon className="text-green-600 h-4 w-4" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  Copy Prompt
                </>
              )}
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
                  Start writing your own custom query, or pick a dataset to
                  inspect.
                </p>

                <div className="flex">
                  <button
                    onClick={() => setActiveSource("workspace")}
                    className={clx(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600/30",
                      activeSource === "workspace"
                        ? "border-otl-danger-200 bg-bg-danger-50"
                        : "border-otl-gray-200 bg-bg-white hover:border-otl-danger-200 hover:bg-bg-black-50",
                    )}
                  >
                    <PencilSquareIcon className="h-4 w-4 text-txt-black-500" />
                    My Workspace
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(Object.keys(DATASETS) as DatasetKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => void handleDatasetClick(key)}
                      className={clx(
                        "min-h-[4.25rem] rounded-xl border px-3 py-2.5 text-left transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600/30",
                        activeSource === key
                          ? "border-otl-danger-200 bg-bg-danger-50"
                          : "border-otl-gray-200 bg-bg-white hover:border-otl-danger-200 hover:bg-bg-black-50",
                      )}
                    >
                      <p className="truncate text-[13px] font-semibold leading-5 text-txt-black-900">
                        {DATASET_LABELS[key]}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-txt-black-500">
                        {DATASET_DESCRIPTIONS[key]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={editorSectionRef}
                className="overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-washed"
              >
                <div className="flex items-center justify-between border-b border-otl-gray-200 px-4 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-500">
                    SQL Editor
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleFormat}
                      disabled={!activeQueryText.trim()}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-txt-black-700 transition-colors hover:bg-bg-washed-active disabled:opacity-40"
                    >
                      <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
                      Format
                    </button>
                    <button
                      onClick={handleClear}
                      disabled={!activeQueryText.trim()}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-txt-black-700 transition-colors hover:bg-bg-washed-active disabled:opacity-40"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Clear
                    </button>
                    <button
                      onClick={() => void handlePaste()}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-txt-black-700 transition-colors hover:bg-bg-washed-active"
                    >
                      <ClipboardIcon className="h-3.5 w-3.5" />
                      Paste
                    </button>
                    <button
                      onClick={() => void handleCopy()}
                      disabled={!activeQueryText.trim()}
                      title={copyState === "copied" ? "Copied!" : "Copy SQL"}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-txt-black-700 transition-colors hover:bg-bg-washed-active disabled:opacity-40"
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

                <div className="relative overflow-hidden border-b border-otl-gray-200 [&_.cm-editor.cm-focused]:outline-none [&_.cm-editor]:font-mono [&_.cm-editor]:text-[13px] [&_.cm-focused]:outline-none [&_.cm-scroller]:overflow-hidden">
                  <CodeMirror
                    value={activeQueryText}
                    onChange={handleQueryChange}
                    extensions={extensions}
                    theme={resolvedTheme === "dark" ? "dark" : "light"}
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

                <div className="flex items-center justify-between gap-2 border-t border-otl-gray-200 px-3 py-2">
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

              {/* Status bar */}
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
              {result && !queryError && (
                <QueryResults
                  result={result}
                  onCopyCsv={() => void handleCopyCsv()}
                  csvCopyState={csvCopyState}
                />
              )}
            </div>
          </section>

          {/* ── Step 3: Share your Query ── */}
          <section className="mb-12">
            <StepLabel n={3} label="Share your Query" />
            <p className="mb-4 max-w-2xl text-body-sm text-txt-black-700">
              Want to share your findings or save it for later? Use this
              shareable link that encodes your current SQL query. Anyone who
              clicks it will land on this page with the exact query ready to
              run.{!hasShortShareLink && " We do not store the generated link, so even if your research is top-secret, it remains as private as you want it to be."}
            </p>
            <div className="mb-4 max-w-2xl rounded-lg border border-otl-gray-200 bg-bg-washed px-3 py-2">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-txt-black-500">
                  Shareable link
                </p>
                <button
                  onClick={handleShare}
                  disabled={!shareUrl}
                  title={
                    shareState === "copied" ? "Copied!" : "Copy share link"
                  }
                  className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-txt-black-500 transition-colors hover:bg-bg-washed-active disabled:opacity-40"
                >
                  {shareState === "copied" ? (
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
              <p className="break-all font-mono text-[12px] leading-5 text-txt-black-700">
                {shareUrl}
              </p>
            </div>
            {!hasShortShareLink ? (
              <p className="mb-4 max-w-2xl text-body-sm text-txt-black-700">
                The link above might be a little long, depending on your query.
                Unfortunately, it has to be in order to encode the entire SQL
                query. If you want a beautiful short link to share, and don't
                mind us storing your query (probably the case for 99% of users),
                just click the 'Shorten Link' button below. All we store is the
                SQL query; we do not know or store your identity.
              </p>
            ) : null}
            <div id="query-builder-turnstile" className="hidden" />
            {shortenError ? (
              <p className="mb-3 text-body-sm text-txt-danger">
                {shortenError}
              </p>
            ) : null}
            <div>
              <button
                onClick={handleShortenLink}
                disabled={
                  !shareUrl ||
                  hasShortShareLink ||
                  !db ||
                  initializing ||
                  running ||
                  shortenState !== "idle" ||
                  activeQueryText.trim() !== lastSuccessfulQuery
                }
                className={clx(
                  "inline-flex items-center gap-2 rounded-lg border border-otl-gray-200 bg-bg-white px-4 py-2 text-body-sm font-medium text-txt-black-700 transition-colors hover:bg-bg-black-50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {shortenState === "shortening"
                  ? "Shortening..."
                  : hasShortShareLink
                    ? "Link Shortened"
                    : "Shorten Link"}
              </button>
              {!hasShortShareLink && activeQueryText.trim() !== lastSuccessfulQuery ? (
                <p className="mt-2 text-body-sm text-txt-danger">
                  Run your query to ensure it works first.
                </p>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
