import { FunctionComponent, useCallback, useRef, useState } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { useApiKey } from "@hooks/useApiKey";

hljs.registerLanguage("json", json);

type Tab = "latest" | "slot";
type Level = "parlimen" | "dun" | "dm";

const TABS: { id: Tab; label: string }[] = [
  { id: "latest", label: "Latest" },
  { id: "slot", label: "By Slot" },
];

const LEVELS: Level[] = ["parlimen", "dun", "dm"];

interface ApiResponse {
  status: number;
  latencyMs: number;
  body: string;
  highlighted: string;
}

function useCopyToClipboard(delay = 1500) {
  const [isCopied, setIsCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setIsCopied(false), delay);
    } catch {
      // clipboard not available
    }
  }, [delay]);

  return { copy, isCopied };
}

const inputClass = "flex-1 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 font-mono text-body-xs text-txt-black-900 outline-none transition focus:border-txt-danger focus:ring-1 focus:ring-txt-danger";
const labelClass = "w-16 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700";

const VtoApiTester: FunctionComponent = () => {
  const { apiKey, setApiKey } = useApiKey();

  const [activeTab, setActiveTab] = useState<Tab>("latest");
  const [election, setElection] = useState("mlk-se16");
  const [level, setLevel] = useState<Level>("dun");
  const [time, setTime] = useState("0805");

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const { copy, isCopied } = useCopyToClipboard();
  const sendGenerationRef = useRef(0);
  const inFlightRef = useRef<AbortController | null>(null);

  const constructedUrl = activeTab === "latest"
    ? `https://api.electiondata.my/v1/vto/latest?election=${encodeURIComponent(election)}`
    : `https://api.electiondata.my/v1/vto?election=${encodeURIComponent(election)}&level=${level}&time=${encodeURIComponent(time)}`;

  const handleSend = async () => {
    inFlightRef.current?.abort();
    const generation = ++sendGenerationRef.current;
    const ac = new AbortController();
    inFlightRef.current = ac;

    setLoading(true);
    setResponse(null);
    const start = Date.now();
    try {
      const res = await fetch(constructedUrl, {
        signal: ac.signal,
        cache: "no-store",
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });
      if (generation !== sendGenerationRef.current) return;
      const latencyMs = Date.now() - start;
      const text = await res.text();
      if (generation !== sendGenerationRef.current) return;
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* not json */ }
      const highlighted = hljs.highlight(pretty, { language: "json" }).value;
      setResponse({ status: res.status, latencyMs, body: pretty, highlighted });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (generation !== sendGenerationRef.current) return;
      const latencyMs = Date.now() - start;
      const body = JSON.stringify({ error: "Network error — could not reach the API." }, null, 2);
      const highlighted = hljs.highlight(body, { language: "json" }).value;
      setResponse({ status: 0, latencyMs, body, highlighted });
    } finally {
      if (generation === sendGenerationRef.current) setLoading(false);
    }
  };

  const statusColor =
    response === null ? "" :
    response.status === 0 ? "text-txt-black-500" :
    response.status >= 200 && response.status < 300 ? "text-green-600" : "text-txt-danger";

  const btnBase = "rounded-md px-3 py-1.5 text-body-xs font-semibold text-white transition bg-txt-danger hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="overflow-hidden rounded-xl border border-otl-gray-200">
      {/* Tabs */}
      <div className="flex border-b border-otl-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResponse(null); }}
            className={`px-4 py-2.5 font-mono text-body-xs font-semibold transition border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-txt-danger text-txt-danger"
                : "border-transparent text-txt-black-400 hover:text-txt-black-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-otl-gray-200">
        {/* Fields */}
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <label className={labelClass}>election</label>
            <input
              type="text"
              value={election}
              onChange={e => setElection(e.target.value)}
              placeholder="e.g. mlk-se16"
              className={inputClass}
            />
          </div>
          {activeTab === "slot" && (
            <>
              <div className="flex items-center gap-3">
                <label className={labelClass}>level</label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map(l => (
                    <button
                      key={l}
                      onClick={() => { setLevel(l); setResponse(null); }}
                      className={`rounded-md border px-3 py-1.5 font-mono text-body-xs font-semibold transition ${
                        level === l
                          ? "border-otl-danger-200 bg-bg-danger-50 text-txt-danger"
                          : "border-otl-gray-200 bg-bg-white text-txt-black-700 hover:border-otl-danger-200 hover:bg-bg-danger-50 hover:text-txt-danger"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className={labelClass}>time</label>
                <input
                  type="text"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  placeholder="HHMM, e.g. 0805"
                  className={inputClass}
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-3">
            <label className={labelClass}>Bearer</label>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Generate a key via the API Console"
              className={inputClass}
            />
          </div>
        </div>

        {/* Constructed URL */}
        <div className="flex items-center gap-3 bg-bg-washed px-4 py-3">
          <span className="shrink-0 rounded bg-bg-danger-100 px-2 py-0.5 font-mono text-body-2xs font-semibold uppercase tracking-wider text-txt-danger">
            GET
          </span>
          <code className="min-w-0 truncate font-mono text-body-xs text-txt-black-700">
            {constructedUrl}
          </code>
        </div>

        {/* Send button */}
        <div className="px-4 py-3">
          <button
            onClick={() => void handleSend()}
            disabled={loading}
            className={btnBase.replace("px-3 py-1.5", "px-4 py-2")}
          >
            {loading ? "Sending…" : "Send Request"}
          </button>
        </div>

        {/* Response */}
        {response && (
          <div>
            <div className="flex items-center justify-between border-b border-otl-gray-200 px-4 py-3">
              <div className="flex items-center gap-4">
                <span className={`font-mono text-body-xs font-semibold ${statusColor}`}>
                  {response.status === 0 ? "Error" : `${response.status}`}
                </span>
                <span className="text-body-xs text-txt-black-400">{response.latencyMs} ms</span>
              </div>
              <button
                onClick={() => void copy(response.body)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-body-xs text-txt-black-400 hover:text-txt-black-700"
              >
                {isCopied
                  ? <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                  : <DocumentDuplicateIcon className="h-3.5 w-3.5" />}
                {isCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="max-h-96 overflow-auto bg-bg-washed p-4 text-xs">
              <code
                className="hljs whitespace-pre font-mono"
                dangerouslySetInnerHTML={{ __html: response.highlighted }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VtoApiTester;
