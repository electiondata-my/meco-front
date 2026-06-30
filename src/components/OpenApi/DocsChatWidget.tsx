import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HttpAgent, type AgentSubscriber, type Message } from "@ag-ui/client";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type TranscriptItem =
  | { id: string; type: "message"; role: "user" | "assistant"; content: string }
  | {
      id: string;
      type: "tool";
      name: string;
      status: "running" | "complete";
      args?: Record<string, unknown>;
    }
  | {
      id: string;
      type: "activity";
      activityType: string;
      content: Record<string, unknown>;
    }
  | { id: string; type: "error"; content: string };

interface DocsChatWidgetProps {
  apiUrl: string;
}

const STARTER_PROMPTS = [
  "Show me the recent election history for Padang Besar",
  "Which parties contested Selangor seats recently?",
  "Summarise the latest election stats",
];

const TOOL_LABELS: Record<string, string> = {
  search_candidates: "Searching candidates",
  get_candidate_results: "Loading candidate results",
  search_seats: "Searching seats",
  get_seat_results: "Loading seat results",
  get_contest_result: "Loading contest result",
  search_parties: "Searching parties",
  get_party_results: "Loading party results",
  search_elections: "Searching elections",
  get_election_party_summary: "Loading party summary",
  get_election_seat_results: "Loading seat results",
  get_election_stats: "Loading election stats",
  get_byelections: "Loading byelections",
  show_ui: "Preparing result view",
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toAgentMessages(items: TranscriptItem[]): Message[] {
  return items
    .filter(
      (item): item is Extract<TranscriptItem, { type: "message" }> =>
        item.type === "message",
    )
    .map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
    }));
}

function updateItem(
  items: TranscriptItem[],
  id: string,
  updater: (item: TranscriptItem) => TranscriptItem,
) {
  return items.map((item) => (item.id === id ? updater(item) : item));
}

function parseActivityContent(content: Record<string, unknown>) {
  const normalized = normalizeActivityContent(content);
  const title =
    typeof normalized.title === "string" ? normalized.title : undefined;
  const description =
    typeof normalized.description === "string"
      ? normalized.description
      : typeof normalized.body === "string"
        ? normalized.body
        : undefined;

  return { title, description };
}

function normalizeActivityContent(content: Record<string, unknown>) {
  if (
    content.props &&
    typeof content.props === "object" &&
    !Array.isArray(content.props)
  ) {
    return { ...content, ...(content.props as Record<string, unknown>) };
  }
  return content;
}

type TableColumn = {
  key: string;
  title: string;
};

function getTableColumns(columns: unknown[]): TableColumn[] {
  return columns
    .map((column) => {
      if (typeof column === "string") return { key: column, title: column };
      if (column && typeof column === "object") {
        const value = column as Record<string, unknown>;
        const key =
          typeof value.key === "string"
            ? value.key
            : typeof value.field === "string"
              ? value.field
              : undefined;
        const title = typeof value.title === "string" ? value.title : key;
        if (key && title) return { key, title };
      }
      return null;
    })
    .filter((column): column is TableColumn => Boolean(column))
    .slice(0, 6);
}

function getTableShape(content: Record<string, unknown>) {
  const normalized = normalizeActivityContent(content);
  const rawColumns = Array.isArray(normalized.columns)
    ? normalized.columns
    : [];
  const rawRows = Array.isArray(normalized.rows)
    ? normalized.rows
    : Array.isArray(normalized.data)
      ? normalized.data
      : [];

  return {
    columns: getTableColumns(rawColumns),
    rows: rawRows
      .filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === "object",
      )
      .slice(0, 8),
  };
}

function ActivityRenderer({
  item,
}: {
  item: Extract<TranscriptItem, { type: "activity" }>;
}) {
  const { title, description } = parseActivityContent(item.content);

  if (item.activityType === "ui:table") {
    const { columns, rows } = getTableShape(item.content);

    return (
      <div className="overflow-hidden rounded-lg border border-otl-gray-200 bg-bg-white">
        {(title || description) && (
          <div className="border-b border-otl-gray-200 px-3 py-2">
            {title && (
              <p className="text-body-xs font-semibold text-txt-black-900">
                {title}
              </p>
            )}
            {description && (
              <p className="mt-0.5 text-[11px] leading-4 text-txt-black-500">
                {description}
              </p>
            )}
          </div>
        )}
        {columns.length > 0 && rows.length > 0 ? (
          <div className="max-h-56 overflow-auto">
            <table className="w-full min-w-max text-left text-[11px]">
              <thead className="sticky top-0 bg-bg-washed text-txt-black-500">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="border-b border-otl-gray-200 px-3 py-2 font-semibold"
                    >
                      {column.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-otl-gray-200 last:border-b-0"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="max-w-40 px-3 py-2 text-txt-black-700"
                      >
                        <span className="line-clamp-2">
                          {String(row[column.key] ?? "-")}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <JsonFallback content={item.content} />
        )}
      </div>
    );
  }

  if (item.activityType === "ui:card" || item.activityType === "ui:alert") {
    return (
      <div className="rounded-lg border border-otl-gray-200 bg-bg-white px-3 py-2">
        {title && (
          <p className="text-body-xs font-semibold text-txt-black-900">
            {title}
          </p>
        )}
        {description && (
          <p className="text-txt-black-600 mt-1 text-body-xs leading-5">
            {description}
          </p>
        )}
      </div>
    );
  }

  return <JsonFallback content={item.content} />;
}

function JsonFallback({ content }: { content: Record<string, unknown> }) {
  return (
    <pre className="text-txt-black-600 max-h-48 overflow-auto rounded-lg border border-otl-gray-200 bg-bg-washed p-3 text-[11px] leading-5">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}

function ToolMarker({
  item,
}: {
  item: Extract<TranscriptItem, { type: "tool" }>;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-txt-black-500">
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-otl-gray-200 bg-bg-white">
        {item.status === "running" ? (
          <ArrowPathIcon className="h-3 w-3 animate-spin" />
        ) : (
          <CheckIcon className="h-3 w-3 text-txt-danger" />
        )}
      </span>
      <span>{TOOL_LABELS[item.name] ?? item.name.replaceAll("_", " ")}</span>
    </div>
  );
}

function MessageBubble({
  item,
}: {
  item: Extract<TranscriptItem, { type: "message" }>;
}) {
  const isUser = item.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-lg px-3 py-2 text-body-xs leading-5 ${
          isUser
            ? "bg-txt-black-900 text-bg-white"
            : "border border-otl-gray-200 bg-bg-white text-txt-black-700"
        }`}
      >
        {isUser ? (
          item.content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: (props) => <p className="mb-2 last:mb-0" {...props} />,
              a: (props) => (
                <a
                  className="text-txt-danger underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                  {...props}
                />
              ),
              ul: (props) => (
                <ul className="mb-2 list-disc pl-4 last:mb-0" {...props} />
              ),
              ol: (props) => (
                <ol className="mb-2 list-decimal pl-4 last:mb-0" {...props} />
              ),
              code: (props) => (
                <code
                  className="rounded bg-bg-washed px-1 py-0.5 font-mono text-[11px]"
                  {...props}
                />
              ),
              table: (props) => (
                <div className="mb-2 max-w-full overflow-x-auto rounded-md border border-otl-gray-200 last:mb-0">
                  <table
                    className="w-full min-w-max text-left text-[11px]"
                    {...props}
                  />
                </div>
              ),
              th: (props) => (
                <th
                  className="text-txt-black-600 border-b border-otl-gray-200 bg-bg-washed px-2 py-1.5 font-semibold"
                  {...props}
                />
              ),
              td: (props) => (
                <td
                  className="border-b border-otl-gray-200 px-2 py-1.5"
                  {...props}
                />
              ),
            }}
          >
            {item.content || " "}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col justify-end gap-3 p-4">
      <div>
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-bg-danger-50 text-txt-danger">
          <SparklesIcon className="h-4 w-4" />
        </div>
        <p className="text-body-sm font-semibold text-txt-black-900">
          Ask Meco
        </p>
        <p className="mt-1 text-body-xs leading-5 text-txt-black-500">
          Query candidates, seats, parties, elections, byelections, and result
          summaries from the API.
        </p>
      </div>
      <div className="space-y-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPrompt(prompt)}
            className="text-txt-black-600 block w-full rounded-lg border border-otl-gray-200 bg-bg-white px-3 py-2 text-left text-[11px] leading-4 transition hover:border-txt-danger hover:text-txt-danger"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DocsChatWidget({ apiUrl }: DocsChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [threadId] = useState(() => createId("thread"));
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeAgentRef = useRef<HttpAgent | null>(null);

  const canSend = input.trim().length > 0 && !isStreaming;
  const agentUrl = useMemo(() => apiUrl.trim(), [apiUrl]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [items, isStreaming]);

  useEffect(() => {
    return () => activeAgentRef.current?.abortRun();
  }, []);

  async function submitMessage(text: string) {
    const cleanText = text.trim();
    if (!cleanText || isStreaming) return;

    const userItem: TranscriptItem = {
      id: createId("user"),
      type: "message",
      role: "user",
      content: cleanText,
    };
    const nextItems = [...items, userItem];

    setItems(nextItems);
    setInput("");
    setIsOpen(true);
    setIsStreaming(true);

    const agent = new HttpAgent({ url: agentUrl, threadId });
    activeAgentRef.current = agent;
    agent.setMessages(toAgentMessages(nextItems));

    const subscriber: AgentSubscriber = {
      onTextMessageStartEvent: ({ event }) => {
        setItems((current) => [
          ...current,
          {
            id: event.messageId,
            type: "message",
            role: "assistant",
            content: "",
          },
        ]);
      },
      onTextMessageContentEvent: ({ event, textMessageBuffer }) => {
        const content = textMessageBuffer + event.delta;
        setItems((current) =>
          updateItem(current, event.messageId, (item) =>
            item.type === "message" ? { ...item, content } : item,
          ),
        );
      },
      onToolCallStartEvent: ({ event }) => {
        setItems((current) => [
          ...current,
          {
            id: event.toolCallId,
            type: "tool",
            name: event.toolCallName,
            status: "running",
          },
        ]);
      },
      onToolCallArgsEvent: ({ event, partialToolCallArgs }) => {
        setItems((current) =>
          updateItem(current, event.toolCallId, (item) =>
            item.type === "tool"
              ? { ...item, args: partialToolCallArgs }
              : item,
          ),
        );
      },
      onToolCallEndEvent: ({ event }) => {
        setItems((current) =>
          updateItem(current, event.toolCallId, (item) =>
            item.type === "tool" ? { ...item, status: "complete" } : item,
          ),
        );
      },
      onActivitySnapshotEvent: ({ event }) => {
        setItems((current) => [
          ...current,
          {
            id: event.messageId,
            type: "activity",
            activityType: event.activityType,
            content: event.content,
          },
        ]);
      },
      onRunErrorEvent: ({ event }) => {
        setItems((current) => [
          ...current,
          { id: createId("error"), type: "error", content: event.message },
        ]);
      },
      onRunFailed: ({ error }) => {
        setItems((current) => [
          ...current,
          {
            id: createId("error"),
            type: "error",
            content:
              error.message || "The docs assistant could not be reached.",
          },
        ]);
      },
      onRunFinalized: () => {
        setIsStreaming(false);
        activeAgentRef.current = null;
      },
    };

    try {
      await agent.runAgent({}, subscriber);
    } catch (error) {
      setItems((current) => [
        ...current,
        {
          id: createId("error"),
          type: "error",
          content:
            error instanceof Error
              ? error.message
              : "The docs assistant could not be reached.",
        },
      ]);
      setIsStreaming(false);
      activeAgentRef.current = null;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
      {isOpen && (
        <section
          role="dialog"
          aria-label="Meco docs assistant"
          className="shadow-2xl mb-3 flex h-[min(620px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-white"
        >
          <header className="flex items-center justify-between border-b border-otl-gray-200 px-4 py-3">
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-txt-black-900">
                Meco
              </p>
              <p className="text-[11px] text-txt-black-500">
                Uses the public API tools
              </p>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-txt-black-500 transition hover:bg-bg-washed hover:text-txt-black-900"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-bg-washed/50"
          >
            {items.length === 0 ? (
              <EmptyState onPrompt={submitMessage} />
            ) : (
              <div className="space-y-3 p-4">
                {items.map((item) => {
                  if (item.type === "message")
                    return <MessageBubble key={item.id} item={item} />;
                  if (item.type === "tool")
                    return <ToolMarker key={item.id} item={item} />;
                  if (item.type === "activity")
                    return <ActivityRenderer key={item.id} item={item} />;
                  return (
                    <div
                      key={item.id}
                      className="border-red-200 bg-red-50 text-red-700 rounded-lg border px-3 py-2 text-body-xs"
                    >
                      {item.content}
                    </div>
                  );
                })}
                {isStreaming && (
                  <div className="flex items-center gap-2 text-[11px] text-txt-black-500">
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                    Working
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-otl-gray-200 bg-bg-white p-3"
          >
            <div className="flex items-end gap-2 rounded-lg border border-otl-gray-200 bg-bg-white p-2 focus-within:border-txt-danger focus-within:ring-1 focus-within:ring-txt-danger">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage(input);
                  }
                }}
                placeholder="Ask about candidates, seats, parties, or election results"
                rows={2}
                className="placeholder:text-txt-black-400 max-h-28 min-h-10 flex-1 resize-none bg-transparent text-body-xs leading-5 text-txt-black-900 outline-none"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className="disabled:text-txt-black-300 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-txt-danger text-bg-white transition hover:bg-txt-danger/90 disabled:cursor-not-allowed disabled:bg-bg-washed"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close Meco assistant" : "Open Meco assistant"}
        className="text-txt-black-800 shadow-lg flex h-11 items-center gap-2 rounded-full border border-otl-gray-200 bg-bg-white px-4 text-body-xs font-semibold transition hover:border-txt-danger hover:text-txt-danger"
      >
        <ChatBubbleLeftRightIcon className="h-5 w-5" />
        Ask API
      </button>
    </div>
  );
}
