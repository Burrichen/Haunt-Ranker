import { useCallback, useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import type { SqlExecutor } from "../database/types";

export interface SampleDataState {
  /**
   * Only ever true in a development build. The fictional dataset is a tool
   * for building the app, and a shipped build has no business offering to
   * write invented attractions into someone's archive.
   */
  isAvailable: boolean;
  isLoading: boolean;
  isBusy: boolean;
  hasSampleData: boolean;
  error: string | null;
  message: string | null;
  reseed: () => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * Loads the fictional dataset's module, and only in a development build.
 *
 * The import is dynamic and sits behind a check on `import.meta.env.DEV`,
 * which Vite replaces with a literal `false` when building for production —
 * so the whole module, sample attractions and all, is dropped from the
 * shipped bundle rather than merely going unused in it.
 */
async function devSampleData() {
  if (!import.meta.env.DEV) {
    throw new Error("Sample data is only available in a development build.");
  }
  return import("../database/devSampleData");
}

export function useSampleData(): SampleDataState {
  const isAvailable = import.meta.env.DEV;
  const [isLoading, setIsLoading] = useState(isAvailable);
  const [isBusy, setIsBusy] = useState(false);
  const [hasSampleData, setHasSampleData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const readPresence = useCallback(async () => {
    const { hasDevSampleData } = await devSampleData();
    return hasDevSampleData(await getDatabase());
  }, []);

  useEffect(() => {
    if (!isAvailable) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const present = await readPresence();
        if (!cancelled) {
          setHasSampleData(present);
        }
      } catch {
        // A failure here only means the indicator is unknown; the buttons
        // still report their own errors.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isAvailable, readPresence]);

  const run = useCallback(
    async (action: (db: SqlExecutor) => Promise<string>) => {
      setError(null);
      setMessage(null);
      setIsBusy(true);
      try {
        setMessage(await action(await getDatabase()));
        setHasSampleData(await readPresence());
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "That didn't work.");
      } finally {
        setIsBusy(false);
      }
    },
    [readPresence],
  );

  const reseed = useCallback(
    () =>
      run(async (db) => {
        const { resetDevSampleData } = await devSampleData();
        const summary = await resetDevSampleData(db);
        return `Sample data recreated — ${summary.eventYears} event years and ${summary.attractions} attractions.`;
      }),
    [run],
  );

  const clear = useCallback(
    () =>
      run(async (db) => {
        const { clearDevSampleData } = await devSampleData();
        await clearDevSampleData(db);
        return "Sample data removed. Anything not marked as sample data was left alone.";
      }),
    [run],
  );

  return {
    isAvailable,
    isLoading,
    isBusy,
    hasSampleData,
    error,
    message,
    reseed,
    clear,
  };
}
