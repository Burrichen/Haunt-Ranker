import { useCallback, useEffect, useState } from "react";
import { openBackupFile, saveBackupFile, writeSafetyBackup } from "../backup/backupFiles";
import {
  buildBackupFile,
  readBackup,
  serializeBackup,
  suggestedBackupFileName,
  type BackupSummary,
  type BackupTableCount,
} from "../backup/backupFormat";
import { importBackupFile } from "../backup/importBackup";
import { getDatabase } from "../database/client";
import { SCHEMA_VERSION } from "../database/schemaVersion";
import type { BackupFile } from "../models/backup";
import {
  applyTransferablePreferences,
  collectTransferablePreferences,
} from "../preferences/localPreferences";
import { createBackupRepository } from "../repositories/backupRepository";
import { APP_VERSION } from "../version";

export interface PendingImport {
  /** Where the file came from, so the user can see they picked the right one. */
  path: string;
  backup: BackupFile;
  summary: BackupSummary;
}

export interface ImportResult {
  summary: BackupSummary;
  /** Where the pre-import copy of the previous data was written. */
  safetyBackupPath: string;
}

export interface BackupState {
  isLoading: boolean;
  /** An export or import is in progress; the controls stay disabled meanwhile. */
  isBusy: boolean;
  /** What's in the database right now — what an import would replace. */
  currentCounts: BackupTableCount[];
  currentTotal: number;
  appliedSchemaVersion: number | null;
  /** Something went wrong. */
  error: string | null;
  /** Why a chosen file was refused, in the file's own terms. */
  validationErrors: string[];
  /** A completed action worth confirming. */
  message: string | null;
  exportedPath: string | null;
  pendingImport: PendingImport | null;
  importResult: ImportResult | null;
  exportBackup: () => Promise<void>;
  chooseImportFile: () => Promise<void>;
  confirmImport: () => Promise<void>;
  cancelImport: () => void;
  dismissMessages: () => void;
}

function describe(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Everything Settings → Data does.
 *
 * The shape of an import is deliberate, and the order matters:
 *
 *  1. the chosen file is validated *completely* before anything is written —
 *     an invalid backup never reaches the database;
 *  2. the user is shown what it contains next to what they already have, and
 *     has to agree;
 *  3. the current data is written to a safety copy inside the app's own data
 *     directory first, and the user is told where;
 *  4. only then are the tables replaced — and if that fails part-way, the
 *     snapshot held in memory is written straight back (`importBackupFile`).
 *
 * Nothing here talks to a network. A backup is a file on this machine.
 */
export function useBackup(): BackupState {
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [currentCounts, setCurrentCounts] = useState<BackupTableCount[]>([]);
  const [appliedSchemaVersion, setAppliedSchemaVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [exportedPath, setExportedPath] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const readCounts = useCallback(async () => {
    const repository = createBackupRepository(await getDatabase());
    const [counts, schemaVersion] = await Promise.all([
      repository.counts(),
      repository.appliedSchemaVersion(),
    ]);
    return { counts, schemaVersion };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { counts, schemaVersion } = await readCounts();
        if (cancelled) {
          return;
        }
        setCurrentCounts(counts);
        setAppliedSchemaVersion(schemaVersion);
      } catch (caught) {
        if (!cancelled) {
          setError(describe(caught, "Couldn't read what's currently stored."));
        }
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
  }, [readCounts]);

  const dismissMessages = useCallback(() => {
    setError(null);
    setValidationErrors([]);
    setMessage(null);
    setExportedPath(null);
    setImportResult(null);
  }, []);

  const exportBackup = useCallback(async () => {
    dismissMessages();
    setIsBusy(true);
    try {
      const repository = createBackupRepository(await getDatabase());
      const backup = buildBackupFile({
        data: await repository.exportData(),
        preferences: collectTransferablePreferences(),
        appVersion: APP_VERSION,
        schemaVersion: SCHEMA_VERSION,
      });

      const path = await saveBackupFile(serializeBackup(backup), suggestedBackupFileName());
      if (path) {
        setExportedPath(path);
        setMessage("Backup saved.");
      }
    } catch (caught) {
      setError(describe(caught, "Couldn't write the backup file."));
    } finally {
      setIsBusy(false);
    }
  }, [dismissMessages]);

  const chooseImportFile = useCallback(async () => {
    dismissMessages();
    setPendingImport(null);
    setIsBusy(true);
    try {
      const opened = await openBackupFile();
      if (!opened) {
        return;
      }

      const result = readBackup(opened.text);
      if (!result.ok) {
        setValidationErrors(result.errors);
        return;
      }

      setPendingImport({ path: opened.path, backup: result.backup, summary: result.summary });
    } catch (caught) {
      setError(describe(caught, "Couldn't read that file."));
    } finally {
      setIsBusy(false);
    }
  }, [dismissMessages]);

  const cancelImport = useCallback(() => {
    setPendingImport(null);
  }, []);

  const confirmImport = useCallback(async () => {
    if (!pendingImport) {
      return;
    }

    setError(null);
    setIsBusy(true);
    try {
      const { safetyBackupPath } = await importBackupFile(pendingImport.backup, {
        repository: createBackupRepository(await getDatabase()),
        writeSafetyBackup,
        appVersion: APP_VERSION,
        schemaVersion: SCHEMA_VERSION,
        preferences: collectTransferablePreferences(),
      });

      applyTransferablePreferences(pendingImport.backup.preferences);
      setImportResult({ summary: pendingImport.summary, safetyBackupPath });
      setPendingImport(null);

      const { counts, schemaVersion } = await readCounts();
      setCurrentCounts(counts);
      setAppliedSchemaVersion(schemaVersion);
    } catch (caught) {
      setError(describe(caught, "Couldn't import that backup."));
    } finally {
      setIsBusy(false);
    }
  }, [pendingImport, readCounts]);

  return {
    isLoading,
    isBusy,
    currentCounts,
    currentTotal: currentCounts.reduce((total, entry) => total + entry.count, 0),
    appliedSchemaVersion,
    error,
    validationErrors,
    message,
    exportedPath,
    pendingImport,
    importResult,
    exportBackup,
    chooseImportFile,
    confirmImport,
    cancelImport,
    dismissMessages,
  };
}
