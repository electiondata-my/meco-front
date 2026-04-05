import { FunctionComponent, useEffect, useRef, useState } from "react";
import { clx } from "@lib/helpers";
import { useApiKey } from "@dashboards/openapi/ApiKeyContext";
import { GithubThemes } from "@components/CodeBlock/theme";
import { useTheme } from "next-themes";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";

hljs.registerLanguage("json", json);

interface ApiTesterProps {
  endpoint: string;
  defaultParams: Record<string, string>;
  paramDescriptions?: Record<string, string>;
}

interface ApiResponse {
  status: number;
  latencyMs: number;
  body: string;
  highlighted: string;
}

const DocApiTester: FunctionComponent<ApiTesterProps> = ({
  endpoint,
  defaultParams,
  paramDescriptions = {},
}) => {
  const { theme = "light" } = useTheme();
  const [params, setParams] = useState<Record<string, string>>(defaultParams);
  const { apiKey: contextApiKey } = useApiKey();
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setApiKey(contextApiKey);
  }, [contextApiKey]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const sendGenerationRef = useRef(0);
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const head = document.head;
    let codeTheme = document.getElementById("code-theme");
    if (!codeTheme) {
      codeTheme = document.createElement("style");
      codeTheme.setAttribute("id", "code-theme");
      head.append(codeTheme);
    }
    codeTheme.innerHTML = GithubThemes[theme as "light" | "dark"];
  }, [theme]);

  const queryString = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  const constructedUrl = `https://api.electiondata.my${endpoint}${queryString ? `?${queryString}` : ""}`;

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
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not json, use as-is
      }
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
      if (generation === sendGenerationRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCopyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.body).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const statusColor =
    response === null
      ? ""
      : response.status === 0
        ? "text-txt-black-500"
        : response.status >= 200 && response.status < 300
          ? "text-green-600"
          : "text-txt-danger";

  return (
    <div className="overflow-hidden rounded-xl border border-otl-gray-200">
      {/* Header */}
      <div className="border-b border-otl-gray-200 bg-bg-washed px-4 py-3">
        <p className="text-body-xs font-semibold uppercase tracking-widest text-txt-black-400">
          Try it
        </p>
      </div>

      <div className="divide-y divide-otl-gray-200">
        {/* Parameters */}
        <div className="space-y-3 px-4 py-4">
          {Object.entries(params).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-24 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">
                {key}
              </label>
              <input
                type="text"
                value={value}
                onChange={e =>
                  setParams(prev => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={paramDescriptions[key] ?? key}
                className="flex-1 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 font-mono text-body-xs text-txt-black-900 outline-none transition focus:border-txt-danger focus:ring-1 focus:ring-txt-danger"
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <label className="w-24 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">
              API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Generate a key via the API Console"
              className="flex-1 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 font-mono text-body-xs text-txt-black-900 outline-none transition focus:border-txt-danger focus:ring-1 focus:ring-txt-danger"
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
            className={clx(
              "rounded-md px-4 py-2 text-body-xs font-semibold text-white transition",
              "bg-txt-danger hover:bg-red-700 active:bg-red-800",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {loading ? "Sending…" : "Send Request"}
          </button>
        </div>

        {/* Response */}
        {response && (
          <div>
            <div className="flex items-center justify-between border-b border-otl-gray-200 px-4 py-3">
              <div className="flex items-center gap-4">
                <span className={clx("font-mono text-body-xs font-semibold", statusColor)}>
                  {response.status === 0 ? "Error" : `${response.status}`}
                </span>
                <span className="text-body-xs text-txt-black-400">
                  {response.latencyMs} ms
                </span>
              </div>
              <button
                onClick={handleCopyResponse}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-body-xs text-txt-black-400 hover:text-txt-black-700"
              >
                {copied ? (
                  <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="max-h-96 overflow-auto bg-bg-washed p-4 text-xs">
              <code
                className="whitespace-pre font-mono"
                dangerouslySetInnerHTML={{ __html: response.highlighted }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocApiTester;
