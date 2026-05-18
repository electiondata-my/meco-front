import { FunctionComponent, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { useApiKey } from "../useApiKey";
import CompactCandidateCombobox, { type CandidateOption } from "./CompactCandidateCombobox";

hljs.registerLanguage("json", json);

interface Candidate {
  id?: string;
  slug?: string;
  name: string;
  c: number;
  w: number;
  l: number;
}

interface ApiResponse {
  status: number;
  latencyMs: number;
  body: string;
  highlighted: string;
}

type DropdownStatus = "idle" | "loading" | "error" | "success";

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

const candidateOptionLabel = (c: Candidate) => `${c.name} (W${c.w}, L${c.l})`;
const candidateIdentifier = (c: Candidate) => c.id ?? c.slug ?? "";

const CandidatesApiTester: FunctionComponent = () => {
  const { apiKey, setApiKey } = useApiKey();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [dropdownStatus, setDropdownStatus] = useState<DropdownStatus>("idle");
  const [dropdownError, setDropdownError] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const { copy, isCopied } = useCopyToClipboard();
  const sendGenerationRef = useRef(0);
  const inFlightRef = useRef<AbortController | null>(null);
  const autoSelectedRef = useRef(false);

  const candidateOptions: CandidateOption[] = useMemo(
    () =>
      candidates.map(c => ({
        label: candidateOptionLabel(c),
        value: candidateIdentifier(c),
        contests: c.c,
        wins: c.w,
        losses: c.l,
      })),
    [candidates],
  );

  const selectedOption = useMemo(() => {
    if (!selectedCandidateId) return null;
    return candidateOptions.find(o => o.value === selectedCandidateId) ?? null;
  }, [candidateOptions, selectedCandidateId]);

  const handleLoadCandidates = async () => {
    if (!apiKey || dropdownStatus === "loading") return;
    setDropdownStatus("loading");
    setDropdownError("");
    try {
      const res = await fetch(
        "https://api.electiondata.my/v1/candidates/dropdown",
        { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" },
      );
      if (!res.ok) {
        const text = await res.text();
        let msg = `${res.status}`;
        try { msg = (JSON.parse(text) as { error?: string }).error ?? msg; } catch { /* use status */ }
        setDropdownError(msg);
        setDropdownStatus("error");
        return;
      }
      const raw: unknown = await res.json();
      const data: Candidate[] = Array.isArray(raw)
        ? (raw as Candidate[])
        : Array.isArray((raw as Record<string, unknown>)?.data)
          ? ((raw as Record<string, unknown>).data as Candidate[])
          : [];
      setCandidates(data);
      setDropdownStatus("success");
    } catch {
      setDropdownError("Network error — could not reach the API.");
      setDropdownStatus("error");
    }
  };

  useEffect(() => {
    if (candidates.length > 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setSelectedCandidateId(candidateIdentifier(candidates[0] ?? {}));
    }
  }, [candidates]);

  const constructedUrl = `https://api.electiondata.my/v1/candidates${selectedCandidateId ? `?id=${encodeURIComponent(selectedCandidateId)}` : ""}`;

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
        <div className="space-y-3 px-4 py-4">
          {/* Candidate picker */}
          <div className="flex items-start gap-3">
            <label className="mt-2 w-24 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">
              candidate
            </label>
            <div className="min-w-0 flex-1">
              {dropdownStatus !== "success" ? (
                <div className="space-y-1.5">
                  <button
                    onClick={() => void handleLoadCandidates()}
                    disabled={!apiKey || dropdownStatus === "loading"}
                    className={btnBase}
                  >
                    {dropdownStatus === "loading" ? "Loading candidates…" :
                     dropdownStatus === "error" ? "Retry" : "Load Candidates"}
                  </button>
                  {dropdownStatus === "error" && (
                    <p className="font-mono text-body-2xs text-txt-danger">Error: {dropdownError}</p>
                  )}
                  {!apiKey && dropdownStatus === "idle" && (
                    <p className="pl-0.5 text-body-2xs text-txt-black-400">
                      Paste your Bearer token to enable
                    </p>
                  )}
                </div>
              ) : (
                <div className="max-w-[727px]">
                  <CompactCandidateCombobox
                    options={candidateOptions}
                    config={{
                      keys: ["label"],
                      baseSort: (a, b) => {
                        if ((a.item.contests ?? 0) === (b.item.contests ?? 0)) {
                          return (b.item.wins ?? 0) - (a.item.wins ?? 0);
                        }
                        return (b.item.contests ?? 0) - (a.item.contests ?? 0);
                      },
                    }}
                    selected={selectedOption}
                    onChange={opt => setSelectedCandidateId(opt?.value ?? "")}
                  />
                </div>
              )}
            </div>
          </div>

          {/* id — read-only */}
          <div className="flex items-center gap-3">
            <label className="w-24 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">id</label>
            <input
              type="text"
              readOnly
              value={selectedCandidateId}
              placeholder={
                dropdownStatus === "success"
                  ? "Select a candidate above"
                  : "Auto-filled once you load the candidates"
              }
              className="flex-1 cursor-default rounded-md border border-otl-gray-200 bg-bg-washed px-3 py-1.5 font-mono text-body-xs text-txt-black-500 outline-none"
            />
          </div>

          {/* Bearer */}
          <div className="flex items-center gap-3">
            <label className="w-24 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">Bearer</label>
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

export default CandidatesApiTester;
