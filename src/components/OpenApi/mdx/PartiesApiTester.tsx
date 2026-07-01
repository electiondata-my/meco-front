import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { useApiKey } from "@hooks/useApiKey";
import CompactCandidateCombobox, { type CandidateOption } from "./CompactCandidateCombobox";

hljs.registerLanguage("json", json);

interface PartyOption {
  type: "party" | "coalition";
  uid: string;
  maps_to: string;
  acronym: string;
  name_en: string;
  name_bm: string;
}

interface ApiResponse {
  status: number;
  latencyMs: number;
  body: string;
  highlighted: string;
}

type DropdownStatus = "idle" | "loading" | "error" | "success";
type Tab = "dropdown" | "results";
type ElectionType = "parlimen" | "dun";

const TABS: { id: Tab; label: string }[] = [
  { id: "dropdown", label: "Dropdown" },
  { id: "results", label: "Results" },
];

const AGGREGATE_STATES = ["Malaysia", "Semenanjung"];
const REGULAR_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
  "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
  "Terengganu", "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
];
const STATES = [...AGGREGATE_STATES, ...REGULAR_STATES];

const DUN_INVALID = new Set(["Malaysia", "Semenanjung", "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya"]);

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

const PartiesApiTester: FunctionComponent = () => {
  const { apiKey, setApiKey } = useApiKey();

  const [activeTab, setActiveTab] = useState<Tab>("dropdown");
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [dropdownStatus, setDropdownStatus] = useState<DropdownStatus>("idle");
  const [dropdownError, setDropdownError] = useState("");
  const [selectedUid, setSelectedUid] = useState("");
  const [selectedType, setSelectedType] = useState<"party" | "coalition">("party");
  const [state, setState] = useState("Selangor");
  const [electionType, setElectionType] = useState<ElectionType>("parlimen");
  const [stateOpen, setStateOpen] = useState(false);
  const stateMenuRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const { copy, isCopied } = useCopyToClipboard();
  const sendGenerationRef = useRef(0);
  const inFlightRef = useRef<AbortController | null>(null);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (!stateOpen) return;
    const handler = (e: MouseEvent) => {
      if (stateMenuRef.current && !stateMenuRef.current.contains(e.target as Node)) {
        setStateOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [stateOpen]);

  const partyOptions: CandidateOption[] = useMemo(
    () => parties.map(p => ({
      label: `${p.acronym} — ${p.name_en} (${p.type})`,
      value: p.uid,
    })),
    [parties],
  );

  const selectedOption = useMemo(
    () => partyOptions.find(o => o.value === selectedUid) ?? null,
    [partyOptions, selectedUid],
  );

  const handleLoadParties = async () => {
    if (!apiKey || dropdownStatus === "loading") return;
    setDropdownStatus("loading");
    setDropdownError("");
    try {
      const res = await fetch(
        "https://api.electiondata.my/v1/parties/dropdown",
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
      const r = raw as Record<string, unknown>;
      const data: PartyOption[] = Array.isArray(r?.data) ? (r.data as PartyOption[]) : [];
      setParties(data);
      setDropdownStatus("success");
    } catch {
      setDropdownError("Network error — could not reach the API.");
      setDropdownStatus("error");
    }
  };

  const selectedParty = useMemo(
    () => parties.find(p => p.uid === selectedUid) ?? null,
    [parties, selectedUid],
  );

  const queryUid = selectedParty?.maps_to ?? selectedUid;

  useEffect(() => {
    if (parties.length > 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      const first = parties.find(p => p.acronym === "AMANAH") ?? parties[0];
      if (first) {
        setSelectedUid(first.uid);
        setSelectedType(first.type);
      }
    }
  }, [parties]);

  const handleSelectParty = (opt?: CandidateOption) => {
    const uid = opt?.value ?? "";
    setSelectedUid(uid);
    const found = parties.find(p => p.uid === uid);
    if (found) setSelectedType(found.type);
    setResponse(null);
  };

  const constructedUrl = activeTab === "dropdown"
    ? "https://api.electiondata.my/v1/parties/dropdown"
    : `https://api.electiondata.my/v1/parties/results?type=${encodeURIComponent(selectedType)}&uid=${encodeURIComponent(queryUid)}&state=${encodeURIComponent(state)}&election_type=${encodeURIComponent(electionType)}`;

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
      if (activeTab === "dropdown" && res.status >= 200 && res.status < 300 && dropdownStatus !== "success") {
        try {
          const r = JSON.parse(text) as Record<string, unknown>;
          const data: PartyOption[] = Array.isArray(r?.data) ? (r.data as PartyOption[]) : [];
          if (data.length > 0) { setParties(data); setDropdownStatus("success"); }
        } catch { /* ignore */ }
      }
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
  const toggleBtn = (active: boolean) =>
    `rounded-md border px-3 py-1.5 font-mono text-body-xs transition ${
      active
        ? "border-otl-danger-200 bg-bg-danger-50 text-txt-danger"
        : "border-otl-gray-200 bg-bg-white text-txt-black-500 hover:border-otl-danger-200 hover:bg-bg-danger-50 hover:text-txt-danger"
    }`;

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
        <div className="space-y-3 px-4 py-4">
          {activeTab !== "dropdown" && (
            <>
              {/* Party picker */}
              <div className="flex items-start gap-3">
                <label className="mt-2 w-28 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">party</label>
                <div className="min-w-0 flex-1">
                  {dropdownStatus !== "success" ? (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => void handleLoadParties()}
                        disabled={!apiKey || dropdownStatus === "loading"}
                        className={btnBase}
                      >
                        {dropdownStatus === "loading" ? "Loading parties…" :
                         dropdownStatus === "error" ? "Retry" : "Load Parties"}
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
                    <CompactCandidateCombobox
                      options={partyOptions}
                      selected={selectedOption}
                      placeholder="Search party or coalition"
                      onChange={handleSelectParty}
                    />
                  )}
                </div>
              </div>

              {/* uid — read-only, shows maps_to */}
              <div className="flex items-center gap-3">
                <label className="w-28 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">uid</label>
                <input
                  type="text"
                  readOnly
                  value={queryUid}
                  placeholder={
                    dropdownStatus === "success"
                      ? "Select a party above"
                      : "Auto-filled once you load the parties"
                  }
                  className="flex-1 cursor-default rounded-md border border-otl-gray-200 bg-bg-washed px-3 py-1.5 font-mono text-body-xs text-txt-black-500 outline-none"
                />
              </div>

              {/* type — read-only */}
              <div className="flex items-center gap-3">
                <label className="w-28 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">type</label>
                <input
                  type="text"
                  readOnly
                  value={selectedUid ? selectedType : ""}
                  placeholder="Auto-filled from selection"
                  className="flex-1 cursor-default rounded-md border border-otl-gray-200 bg-bg-washed px-3 py-1.5 font-mono text-body-xs text-txt-black-500 outline-none"
                />
              </div>

              {/* state */}
              <div className="flex items-start gap-3">
                <label className="mt-1.5 w-28 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">state</label>

                {/* Mobile: custom dropdown */}
                <div ref={stateMenuRef} className="relative flex-1 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setStateOpen(o => !o)}
                    className="flex w-full select-none items-center gap-1.5 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 text-start font-mono text-body-xs text-txt-black-900 outline-none hover:border-bg-black-400 active:bg-bg-black-100"
                  >
                    <span className="grow truncate">{state}</span>
                    <svg className="-mx-[5px] h-5 w-5 shrink-0 text-txt-black-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {stateOpen && (
                    <ul className="absolute left-0 top-full z-50 mt-1 max-h-60 min-w-full overflow-y-auto rounded-md bg-bg-white shadow-floating ring-1 ring-otl-gray-200">
                      {STATES.map(s => (
                        <li key={s}>
                          <button
                            type="button"
                            onClick={() => {
                              setState(s);
                              if (DUN_INVALID.has(s)) setElectionType("parlimen");
                              setResponse(null);
                              setStateOpen(false);
                            }}
                            className={`flex w-full select-none items-center whitespace-nowrap px-4 py-2 text-left font-mono text-body-xs hover:bg-bg-black-100 ${state === s ? "font-medium text-txt-danger" : "text-txt-black-900"}`}
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Desktop: button grid */}
                <div className="hidden sm:flex flex-wrap gap-1.5">
                  {AGGREGATE_STATES.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setState(s);
                        if (DUN_INVALID.has(s)) setElectionType("parlimen");
                        setResponse(null);
                      }}
                      className={toggleBtn(state === s)}
                    >
                      {s}
                    </button>
                  ))}
                  <div className="w-full" />
                  {REGULAR_STATES.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setState(s);
                        if (DUN_INVALID.has(s)) setElectionType("parlimen");
                        setResponse(null);
                      }}
                      className={toggleBtn(state === s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* election_type */}
              <div className="flex items-center gap-3">
                <label className="w-28 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">election_type</label>
                <div className="flex gap-2">
                  {(["parlimen", "dun"] as const).map(val => {
                    const disabled = val === "dun" && DUN_INVALID.has(state);
                    return (
                      <button
                        key={val}
                        disabled={disabled}
                        onClick={() => { setElectionType(val); setResponse(null); }}
                        className={disabled
                          ? "rounded-md border border-otl-gray-200 px-3 py-1.5 font-mono text-body-xs text-txt-black-300 cursor-not-allowed opacity-40"
                          : toggleBtn(electionType === val)
                        }
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Bearer */}
          <div className="flex items-center gap-3">
            <label className="w-28 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">Bearer</label>
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

export default PartiesApiTester;
