import { XMarkIcon } from "@heroicons/react/24/outline";
import { matchSorter, type MatchSorterOptions } from "match-sorter";
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";

export interface CandidateOption {
  label: string;
  value: string;
  contests?: number;
  wins?: number;
  losses?: number;
}

type Props = {
  options: CandidateOption[];
  selected?: CandidateOption | null;
  onChange: (option?: CandidateOption) => void;
  placeholder?: string;
  config?: MatchSorterOptions<CandidateOption>;
};

const CompactCandidateCombobox: FunctionComponent<Props> = ({
  options,
  selected,
  onChange,
  placeholder = "Search candidate",
  config = { keys: ["label"] } as MatchSorterOptions<CandidateOption>,
}) => {
  const [query, setQuery] = useState<string>(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 10);
    return matchSorter(options, query, config).slice(0, 50);
  }, [options, query, config]);

  const showClear = query.length > 0 || Boolean(selected);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex w-full items-center overflow-hidden rounded-md border border-otl-gray-200 bg-bg-white transition focus-within:border-txt-danger focus-within:ring-1 focus-within:ring-txt-danger">
        <input
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (!v) onChange(undefined);
            setOpen(Boolean(v));
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full truncate border-none bg-transparent px-3 py-1.5 pr-10 font-mono text-body-xs text-txt-black-900 outline-none focus:ring-0"
          autoComplete="off"
          spellCheck={false}
        />
        {showClear && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange(undefined);
              setOpen(true);
            }}
            className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-full text-txt-black-500 hover:bg-bg-black-100 hover:text-txt-black-900"
            aria-label="Clear selection"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="shadow-floating absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-otl-gray-200 bg-bg-white font-mono text-body-xs focus:outline-none">
          {filtered.length === 0 ? (
            <p className="cursor-default select-none px-3 py-2 text-txt-black-500">
              No results.
            </p>
          ) : (
            filtered.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt);
                  setQuery(opt.label);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-bg-washed",
                  selected?.value === opt.value ? "bg-bg-danger-100" : "",
                ].join(" ")}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CompactCandidateCombobox;
