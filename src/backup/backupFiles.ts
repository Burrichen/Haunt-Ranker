import { appDataDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

/** Safety copies live inside the app's own data directory, beside the database. */
export const SAFETY_BACKUP_DIRECTORY = "backups";

const JSON_FILTER = [{ name: "Haunt Ranker backup", extensions: ["json"] }];

/**
 * Asks where to save, then writes the backup there. Returns the chosen path,
 * or `null` if the dialog was dismissed.
 *
 * The path comes from the system dialog, which is what grants write access to
 * it — the app never gets blanket permission to write anywhere on disk.
 */
export async function saveBackupFile(
  contents: string,
  suggestedName: string,
): Promise<string | null> {
  const path = await save({ defaultPath: suggestedName, filters: JSON_FILTER });
  if (!path) {
    return null;
  }
  await writeTextFile(path, contents);
  return path;
}

export interface OpenedBackupFile {
  path: string;
  text: string;
}

/** Asks for a backup file and reads it. Returns `null` if the dialog was dismissed. */
export async function openBackupFile(): Promise<OpenedBackupFile | null> {
  const selected = await open({ multiple: false, directory: false, filters: JSON_FILTER });
  if (typeof selected !== "string") {
    return null;
  }
  return { path: selected, text: await readTextFile(selected) };
}

/** `before-import-2026-09-18-1432.json` — chronological, and says what it's for. */
export function safetyBackupFileName(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `before-import-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.json`
  );
}

/**
 * Writes the current data to the app's own backup directory before an import
 * replaces it, and returns where it went.
 *
 * This is the promise behind "your data is replaced": the user is told the
 * path, so the previous state is always recoverable by importing that file —
 * no undo stack required, and nothing leaves the machine.
 */
export async function writeSafetyBackup(
  contents: string,
  fileName: string = safetyBackupFileName(),
): Promise<string> {
  const directory = await join(await appDataDir(), SAFETY_BACKUP_DIRECTORY);
  await mkdir(directory, { recursive: true });
  const path = await join(directory, fileName);
  await writeTextFile(path, contents);
  return path;
}
