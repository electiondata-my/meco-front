"use client";
import { FunctionComponent } from "react";
import Link from "next/link";
import { useApiKey } from "@dashboards/openapi/ApiKeyContext";

const TokenInput: FunctionComponent = () => {
  const { apiKey, setApiKey } = useApiKey();

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-otl-gray-200">
      <div className="border-b border-otl-gray-200 bg-bg-washed px-4 py-3">
        <p className="text-body-xs font-semibold uppercase tracking-widest text-txt-black-400">
          Your API Key
        </p>
      </div>
      <div className="flex items-center gap-3 px-4 py-4">
        <label className="w-24 shrink-0 font-mono text-body-xs font-semibold text-txt-black-700">
          API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Paste your API key here"
          className="flex-1 rounded-md border border-otl-gray-200 bg-bg-white px-3 py-1.5 font-mono text-body-xs text-txt-black-900 outline-none transition focus:border-txt-danger focus:ring-1 focus:ring-txt-danger"
        />
      </div>
      {!apiKey && (
        <div className="border-t border-otl-gray-200 px-4 py-3">
          <p className="text-body-xs text-txt-black-500">
            Don&apos;t have a key yet?{" "}
            <Link
              href="/console"
              className="text-txt-danger underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Generate one from the API Console
            </Link>
            {" "}— it takes under a minute.
          </p>
        </div>
      )}
    </div>
  );
};

export default TokenInput;
