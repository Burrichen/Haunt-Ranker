import { useCallback, useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import {
  applyPackImport,
  PackImportError,
  preparePackImport,
  type PackPlanResult,
} from "../packs/importHauntPack";
import { openHauntPackFile } from "../packs/packFiles";
import type { PackPreview } from "../packs/planPackImport";
import type { PackImportRecord } from "../packs/packState";
import { createArchiveImportRepository } from "../repositories/archiveImportRepository";
import { createHauntPackRepository } from "../repositories/hauntPackRepository";
import { generateId } from "../repositories/id";

export interface PackImportRefusal {
  /** One line saying what happened, in the pack's terms. */
  message: string;
  /** Everything wrong with it, listed rather than summarised. */
  problems: string[];
}

export interface HauntPackImportState {
  /** The pasted or opened pack text, which stays editable until it imports. */
  text: string;
  setText: (value: string) => void;
  /** Where the text came from, when it came from a file. */
  sourcePath: string | null;
  isBusy: boolean;
  /** What importing the checked pack would do. Nothing is written to show this. */
  pending: PackPlanResult | null;
  /** What the last completed import did. */
  result: PackPreview | null;
  refusal: PackImportRefusal | null;
  /** Every pack this installation has imported, newest first. */
  history: PackImportRecord[];

  chooseFile: () => Promise<void>;
  check: () => Promise<void>;
  confirm: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

function refuse(error: unknown): PackImportRefusal {
  if (error instanceof PackImportError) {
    return { message: error.message, problems: error.problems };
  }
  return {
    message: "That Haunt Pack couldn't be imported.",
    problems: [error instanceof Error ? error.message : String(error)],
  };
}

/**
 * Admin Mode → Import Haunt Pack.
 *
 * The order is the point, and it is the same order as a backup import:
 *
 *  1. the pack is read and validated *completely*, on its own terms and then
 *     against what the archive already holds — an invalid pack never reaches
 *     SQLite at all;
 *  2. the person is shown what would change, including every warning and
 *     every conflict, and can walk away without anything having happened;
 *  3. only on confirmation are the writes applied, through the archive
 *     importer's undo log, so a failure part way through leaves the archive
 *     exactly as it was.
 *
 * Nothing here can touch a rating, a note or a ranking: a pack has no way to
 * describe one, and the planner never builds an operation against those
 * tables.
 *
 * @param onImported Called once an import lands, so the interface can pick up
 *   a haunt, a venue or a vocabulary that didn't exist a moment ago.
 */
export function useHauntPackImport(onImported?: () => void | Promise<void>): HauntPackImportState {
  const [text, setTextValue] = useState("");
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [pending, setPending] = useState<PackPlanResult | null>(null);
  const [result, setResult] = useState<PackPreview | null>(null);
  const [refusal, setRefusal] = useState<PackImportRefusal | null>(null);
  const [history, setHistory] = useState<PackImportRecord[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const packs = createHauntPackRepository(await getDatabase());
      setHistory(await packs.listImports());
    } catch {
      // The list of past imports is context, not the feature. Failing to read
      // it must not stop someone importing a pack.
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const packs = createHauntPackRepository(await getDatabase());
        const imports = await packs.listImports();
        if (!cancelled) {
          setHistory(imports);
        }
      } catch {
        // As above: the list is context, not the feature.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Editing the text invalidates whatever was checked — a preview must never
  // outlive the pack it describes.
  const setText = useCallback((value: string) => {
    setTextValue(value);
    setPending(null);
    setRefusal(null);
    setResult(null);
  }, []);

  const chooseFile = useCallback(async () => {
    setRefusal(null);
    try {
      const opened = await openHauntPackFile();
      if (!opened) {
        return;
      }
      setText(opened.text);
      setSourcePath(opened.path);
    } catch (error) {
      setRefusal(refuse(error));
    }
  }, [setText]);

  const check = useCallback(async () => {
    setIsBusy(true);
    setRefusal(null);
    setResult(null);
    try {
      const packs = createHauntPackRepository(await getDatabase());
      setPending(preparePackImport(text, await packs.readState()));
    } catch (error) {
      setPending(null);
      setRefusal(refuse(error));
    } finally {
      setIsBusy(false);
    }
  }, [text]);

  const confirm = useCallback(async () => {
    if (!pending) {
      return;
    }
    setIsBusy(true);
    setRefusal(null);
    try {
      const db = await getDatabase();
      const packs = createHauntPackRepository(db);
      const preview = await applyPackImport(pending, {
        archive: createArchiveImportRepository(db),
        packs,
        newId: generateId,
      });
      setResult(preview);
      setPending(null);
      setTextValue("");
      setSourcePath(null);
      await loadHistory();
      await onImported?.();
    } catch (error) {
      setRefusal(refuse(error));
    } finally {
      setIsBusy(false);
    }
  }, [pending, loadHistory, onImported]);

  const cancel = useCallback(() => setPending(null), []);

  const reset = useCallback(() => {
    setTextValue("");
    setSourcePath(null);
    setPending(null);
    setRefusal(null);
    setResult(null);
  }, []);

  return {
    text,
    setText,
    sourcePath,
    isBusy,
    pending,
    result,
    refusal,
    history,
    chooseFile,
    check,
    confirm,
    cancel,
    reset,
  };
}
