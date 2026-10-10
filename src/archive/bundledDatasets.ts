import type { SqlExecutor } from "../database/types";
import type { ArchiveDataset } from "../models/archiveDataset";
import { createArchiveImportRepository } from "../repositories/archiveImportRepository";
import { createSettingsRepository } from "../repositories/settingsRepository";
import { importArchiveDataset } from "./importDataset";
import type { ArchiveImportReport } from "./importOperations";
import { validateDataset } from "./validateDataset";

/**
 * The archive datasets that ship inside the app. On launch, any that is newer
 * than the version this database last took is applied — so installing an
 * update is all it takes to get its seasons, mazes, fixes and artwork records,
 * with no commands to run.
 *
 * Applying uses the same importer as `npm run data:import`: additive and
 * corrective, never writing a rating, note or ranking. A safety copy of the
 * whole database is written first, and the run refuses to finish quietly if
 * any personal row changed.
 */
export interface BundledDataset {
  /** Settings key suffix, and how the run reports it. */
  key: string;
  load(): Promise<unknown>;
}

export const BUNDLED_DATASETS: BundledDataset[] = [
  {
    key: "hhn",
    load: () => import("../../data/hhn-archive.json").then((module) => module.default),
  },
  {
    key: "knotts",
    load: () => import("../../data/knotts-archive.json").then((module) => module.default),
  },
];

/** Where the applied version is recorded — in user_settings, so it travels with backups. */
export const appliedVersionKey = (key: string) => `archive.datasetVersion.${key}`;

/**
 * Dotted numeric versions ("2026.10.1"), compared part by part. A dataset is
 * applied only when strictly newer, so an older build never rolls back
 * corrections a newer one made.
 */
export function compareDatasetVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return Math.sign(difference);
    }
  }
  return 0;
}

export interface AppliedDataset {
  key: string;
  version: string;
  report: ArchiveImportReport;
}

export interface BundledUpdateResult {
  applied: AppliedDataset[];
  /** Where the database was copied before anything was written; null when nothing was due. */
  safetyBackupPath: string | null;
}

export interface BundledUpdateDependencies {
  db: SqlExecutor;
  /** Writes a full backup of the current data and returns its path. */
  writeSafetyCopy(): Promise<string>;
  datasets?: BundledDataset[];
  /** Told once, before the first write, which datasets are about to be applied. */
  onStart?(due: Array<{ key: string; version: string }>): void;
}

const PERSONAL_TABLES = ["user_ratings", "user_notes", "user_rankings"] as const;

async function personalCounts(db: SqlExecutor): Promise<string> {
  const counts: string[] = [];
  for (const table of PERSONAL_TABLES) {
    const [{ count }] = await db.select<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM ${table}`,
    );
    counts.push(`${table} ${count}`);
  }
  return counts.join(", ");
}

export async function applyBundledDatasets({
  db,
  writeSafetyCopy,
  datasets = BUNDLED_DATASETS,
  onStart,
}: BundledUpdateDependencies): Promise<BundledUpdateResult> {
  const settings = createSettingsRepository(db);

  const due: Array<{ key: string; version: string; dataset: ArchiveDataset }> = [];
  for (const bundled of datasets) {
    const validation = validateDataset(await bundled.load());
    if (!validation.ok) {
      throw new Error(
        `The ${bundled.key} archive shipped with this version is invalid: ${validation.errors[0]}`,
      );
    }
    const version = validation.dataset.datasetVersion;
    if (!version) {
      throw new Error(`The ${bundled.key} archive shipped with this version has no version.`);
    }
    const applied = await settings.get<string>(appliedVersionKey(bundled.key));
    if (applied === null || compareDatasetVersions(version, applied) > 0) {
      due.push({ key: bundled.key, version, dataset: validation.dataset });
    }
  }

  if (due.length === 0) {
    return { applied: [], safetyBackupPath: null };
  }

  onStart?.(due.map(({ key, version }) => ({ key, version })));
  const safetyBackupPath = await writeSafetyCopy();
  const before = await personalCounts(db);

  const applied: AppliedDataset[] = [];
  for (const { key, version, dataset } of due) {
    const report = await importArchiveDataset(dataset, createArchiveImportRepository(db));
    await settings.set(appliedVersionKey(key), version);
    applied.push({ key, version, report });
  }

  const after = await personalCounts(db);
  if (after !== before) {
    throw new Error(
      `Updating the archive changed personal data, which it must never do (${before} → ${after}). ` +
        `Your data from before the update is in ${safetyBackupPath}.`,
    );
  }

  return { applied, safetyBackupPath };
}
