import type { BackupData, BackupFile, BackupPreferences } from "../models/backup";
import type { BackupRepository } from "../repositories/backupRepository";
import { buildBackupFile, serializeBackup } from "./backupFormat";

export interface ImportDependencies {
  repository: BackupRepository;
  /** Writes the pre-import copy somewhere the user can get at it, and returns where. */
  writeSafetyBackup: (contents: string) => Promise<string>;
  appVersion: string;
  schemaVersion: number;
  /** The preferences to record in the safety copy alongside the data. */
  preferences: BackupPreferences;
}

export interface ImportOutcome {
  safetyBackupPath: string;
  previousData: BackupData;
}

/**
 * Replaces the database's contents with a validated backup, safely.
 *
 * "Safely" means three specific things, in order:
 *
 *  1. the current data is read out and written to a file *before* anything is
 *     deleted, and the user is told the path;
 *  2. the same snapshot is kept in memory, so a failure part way through the
 *     replacement is put back immediately rather than left as a half-written
 *     database;
 *  3. if even that fails, the error says so plainly and names the file, which
 *     is the whole reason step 1 happens first.
 *
 * The backup must already have been validated — this function is the last
 * step, not the gate.
 */
export async function importBackupFile(
  backup: BackupFile,
  deps: ImportDependencies,
): Promise<ImportOutcome> {
  const { repository } = deps;
  const previousData = await repository.exportData();

  const safetyBackupPath = await deps.writeSafetyBackup(
    serializeBackup(
      buildBackupFile({
        data: previousData,
        preferences: deps.preferences,
        appVersion: deps.appVersion,
        schemaVersion: deps.schemaVersion,
      }),
    ),
  );

  try {
    await repository.replaceAll(backup.data);
  } catch (caught) {
    try {
      await repository.replaceAll(previousData);
    } catch (rollbackFailure) {
      throw new Error(
        "The import failed part way through, and your data could not be put back " +
          `automatically. It was saved first — import ${safetyBackupPath} to restore it.`,
        { cause: rollbackFailure },
      );
    }
    const reason = caught instanceof Error ? caught.message : "The import failed.";
    throw new Error(`${reason} Nothing was changed — your data was put back as it was.`, {
      cause: caught,
    });
  }

  return { safetyBackupPath, previousData };
}
