import { FunctionComponent, useCallback, useRef, useState } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { useApiKey } from "@hooks/useApiKey";

hljs.registerLanguage("json", json);

interface Sample {
  label: string;
  slug: string;
  state: string;
  type: "parlimen" | "dun";
}

const SAMPLES: Sample[] = [
  { label: "P.001 Padang Besar", slug: "p001-padang-besar-perlis", state: "Perlis", type: "parlimen" },
  { label: "P.121 Lembah Pantai", slug: "p121-lembah-pantai-wp-kuala-lumpur", state: "W.P. Kuala Lumpur", type: "parlimen" },
  { label: "N.01 Titi Tinggi", slug: "n01-titi-tinggi-perlis", state: "Perlis", type: "dun" },
];

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

const SeatsCurrentApiTester: FunctionComponent = () => {
  const { apiKey, setApiKey } = useApiKey();

  const [slug, setSlug] = useState(SAMPLES[0].slug);
  const [lineage, setLineage] = useState(false);
  const [activeSample, setActiveSample] = useState(0);

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const { copy, isCopied } = useCopyToClipboard();
  const sendGenerationRef = useRef(0);
  const inFlightRef = useRef<AbortController | null>(null);

  const handleSelectSample = (i: number) => {
    setSlug(SAMPLES[i].slug);
    setActiveSample(i);
    setResponse(null);
  };

  const constructedUrl = `https://api.electiondata.my/v1/seats-current/results?slug=${encodeURIComponent(slug)}${lineage ? "&lineage=true" : ""}`;

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
      <div className="border-b border-otl-gray-200 bg-bg-washed px-4 py-3">
        <p className="text-body-xs font-semibold uppercase tracking-widest text-txt-black-400">
          Try it
        </p>
      </div>

      <div className="divide-y divide-otl-gray-200">
        {/* Sample cards */}
        <div className="space-y-2 px-4 py-4">
          <p className="text-body-xs text-txt-black-400">Pick a sample to populate the fields:</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s, i) => (
              <button
                key={s.slug}
                onClick={() => handleSelectSample(i)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  activeSample === i
                    ? "border-otl-danger-200 bg-bg-danger-50 text-txt-danger"
                    : "border-otl-gray-200 bg-bg-white text-txt-black-700 hover:border-otl-danger-200 hover:bg-bg-danger-50 hover:text-txt-danger"
                }`}
              >
                <p className="font-mono text-body-xs font-semibold">{s.label}</p>
                <p className="text-body-2xs opacity-75">{s.state} · {s.type}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <label className="w-16 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">slug</label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setActiveSample(-1); setResponse(null); }}
              placeholder="e.g. p001-padang-besar-perlis"
              className="flex-1 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 font-mono text-body-xs text-txt-black-900 outline-none transition focus:border-txt-danger focus:ring-1 focus:ring-txt-danger"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-16 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">lineage</label>
            <div className="flex gap-2">
              {([false, true] as const).map(val => (
                <button
                  key={String(val)}
                  onClick={() => { setLineage(val); setResponse(null); }}
                  className={`rounded-md border px-3 py-1.5 font-mono text-body-xs font-semibold transition ${
                    lineage === val
                      ? "border-otl-danger-200 bg-bg-danger-50 text-txt-danger"
                      : "border-otl-gray-200 bg-bg-white text-txt-black-500 hover:border-otl-danger-200 hover:bg-bg-danger-50 hover:text-txt-danger"
                  }`}
                >
                  {String(val)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-16 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">Bearer</label>
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

export default SeatsCurrentApiTester;
