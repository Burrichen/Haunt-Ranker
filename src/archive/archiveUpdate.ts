import { writeSafetyBackup } from "../backup/backupFiles";
import { buildBackupFile, serializeBackup } from "../backup/backupFormat";
import { getDatabase } from "../database/client";
import { SCHEMA_VERSION } from "../database/schemaVersion";
import { syncArtwork } from "../media/artworkSync";
import { collectTransferablePreferences, readPreference } from "../preferences/localPreferences";
import { createBackupRepository } from "../repositories/backupRepository";
import { APP_VERSION } from "../version";
import { applyBundledDatasets, type BundledUpdateResult } from "./bundledDatasets";

/** `before-archive-update-2026-10-10-1432.json`, beside the other safety copies. */
function safetyCopyName(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `before-archive-update-${date.getFullYear()}-${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`
  );
}

export interface ArchiveUpdateOutcome {
  result: BundledUpdateResult | null;
  error: string | null;
}

let lastOutcome: ArchiveUpdateOutcome | null = null;
let running: Promise<ArchiveUpdateOutcome> | null = null;

/** What the launch-time update did, for Settings. Null before it has run. */
export function getLastArchiveUpdate(): ArchiveUpdateOutcome | null {
  return lastOutcome;
}

/** Whether the artwork downloads by itself after an update. On unless turned off. */
export function isAutoArtworkEnabled(): boolean {
  return readPreference("autoDownloadArtwork") !== "false";
}

/**
 * Brings this installation's archive up to the datasets shipped with the
 * app, then starts saving any artwork it doesn't hold yet in the background.
 * Runs once per launch, however many times it's called. Never throws: a
 * failure is reported, and the app opens on the archive as it was.
 */
export function runArchiveUpdate(onUpdating: () => void): Promise<ArchiveUpdateOutcome> {
  running ??= (async () => {
    let outcome: ArchiveUpdateOutcome;
    try {
      const db = await getDatabase();
      const result = await applyBundledDatasets({
        db,
        onStart: onUpdating,
        writeSafetyCopy: async () =>
          writeSafetyBackup(
            serializeBackup(
              buildBackupFile({
                data: await createBackupRepository(db).exportData(),
                preferences: collectTransferablePreferences(),
                appVersion: APP_VERSION,
                schemaVersion: SCHEMA_VERSION,
              }),
            ),
            safetyCopyName(),
          ),
      });
      outcome = { result, error: null };
      if (isAutoArtworkEnabled()) {
        void syncArtwork(db);
      }
    } catch (error) {
      outcome = {
        result: null,
        error: error instanceof Error ? error.message : "The archive couldn't be updated.",
      };
    }
    lastOutcome = outcome;
    return outcome;
  })();
  return running;
}
