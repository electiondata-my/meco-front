import { useEffect, useState } from "react";

// Module-level singleton so we only init once per page load
let dbSingleton: any = null;
let initPromise: Promise<any> | null = null;

export interface UseDuckDBResult {
  db: any | null;
  initializing: boolean;
  error: string | null;
}

export function useDuckDB(): UseDuckDBResult {
  const [db, setDb] = useState<any | null>(dbSingleton);
  const [initializing, setInitializing] = useState(!dbSingleton);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dbSingleton) {
      setDb(dbSingleton);
      setInitializing(false);
      return;
    }

    if (!initPromise) {
      initPromise = (async () => {
        const duckdb = await import("@duckdb/duckdb-wasm");
        const BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(BUNDLES);

        const workerUrl = URL.createObjectURL(
          new Blob([`importScripts("${bundle.mainWorker}");`], {
            type: "text/javascript",
          })
        );
        const worker = new Worker(workerUrl);
        const logger = new duckdb.ConsoleLogger();
        const instance = new duckdb.AsyncDuckDB(logger, worker);
        await instance.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(workerUrl);
        dbSingleton = instance;
        return instance;
      })();
    }

    initPromise
      .then((instance) => {
        setDb(instance);
        setInitializing(false);
      })
      .catch((err) => {
        setError(
          `Failed to initialise DuckDB: ${err instanceof Error ? err.message : String(err)}`
        );
        setInitializing(false);
        initPromise = null;
      });
  }, []);

  return { db, initializing, error };
}
