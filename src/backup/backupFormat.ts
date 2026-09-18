import {
  BACKUP_FORMAT_VERSION,
  type BackupData,
  type BackupFile,
  type BackupPreferences,
  type BackupTableKey,
} from "../models/backup";
import { BACKUP_TABLES, type BackupColumn, type BackupTableSpec } from "./backupTables";

/** How many problems to report before it stops being useful to read. */
const MAX_REPORTED_ERRORS = 12;

export interface BackupTableCount {
  key: BackupTableKey;
  label: string;
  count: number;
}

/**
 * What the user sees before agreeing to replace their data. Deliberately
 * counts every table rather than a headline number: "1,204 rows" tells you
 * nothing about whether your ratings are in there.
 */
export interface BackupSummary {
  formatVersion: number;
  appVersion: string;
  schemaVersion: number;
  exportedAt: string;
  counts: BackupTableCount[];
  totalRows: number;
}

export type BackupReadResult =
  { ok: true; backup: BackupFile; summary: BackupSummary } | { ok: false; errors: string[] };

/**
 * An upgrade from one backup format version to the next, keyed by the
 * version it upgrades *from*.
 *
 * Empty while the format is still on its first version. When the format
 * changes, the old shape gets an entry here rather than the reader growing
 * branches: `upgradeBackup` walks the chain until the file is current, and a
 * missing link is reported honestly instead of being read as though nothing
 * had changed.
 */
export type BackupUpgrade = (raw: Record<string, unknown>) => Record<string, unknown>;

export const BACKUP_UPGRADES: Record<number, BackupUpgrade> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Brings an older file up to the current format, or explains why it can't
 * be. `upgrades` is a parameter so the mechanism can be tested without
 * inventing a format change.
 */
export function upgradeBackup(
  raw: Record<string, unknown>,
  upgrades: Record<number, BackupUpgrade> = BACKUP_UPGRADES,
): { ok: true; raw: Record<string, unknown> } | { ok: false; error: string } {
  let current = raw;
  let version = current.formatVersion;
  let steps = 0;

  while (typeof version === "number" && version < BACKUP_FORMAT_VERSION) {
    const upgrade = upgrades[version];
    if (!upgrade) {
      return {
        ok: false,
        error:
          `This backup uses format version ${version}, which this version of ` +
          "Haunt Ranker can no longer read.",
      };
    }
    current = upgrade(current);
    current.formatVersion = version + 1;
    version = current.formatVersion;

    // A malformed upgrade table could otherwise spin forever.
    steps += 1;
    if (steps > BACKUP_FORMAT_VERSION) {
      return { ok: false, error: "This backup could not be upgraded to the current format." };
    }
  }

  return { ok: true, raw: current };
}

function describeKind(column: BackupColumn): string {
  if (column.values) {
    return `one of ${column.values.join(", ")}`;
  }
  return column.kind === "flag" ? "0 or 1" : column.kind;
}

function validateValue(value: unknown, column: BackupColumn): string | null {
  if (value === null || value === undefined) {
    return column.nullable ? null : "must not be empty";
  }

  if (column.kind === "text") {
    if (typeof value !== "string") {
      return `should be text, got ${typeof value}`;
    }
    if (column.values && !column.values.includes(value)) {
      return `should be ${describeKind(column)}, got "${value}"`;
    }
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `should be a number, got ${typeof value}`;
  }
  if (column.kind === "int" && !Number.isInteger(value)) {
    return `should be a whole number, got ${value}`;
  }
  if (column.kind === "flag" && value !== 0 && value !== 1) {
    return `should be 0 or 1, got ${value}`;
  }
  if (column.check && !column.check(value)) {
    return `is out of range: ${value}`;
  }
  return null;
}

/** Keeps only the columns the format knows about, so unknown extras can't reach SQL. */
function pickColumns(row: Record<string, unknown>, spec: BackupTableSpec): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const name of Object.keys(spec.columns)) {
    picked[name] = row[name] ?? null;
  }
  return picked;
}

function validateTable(
  value: unknown,
  spec: BackupTableSpec,
  errors: string[],
): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    errors.push(`"${spec.key}" is missing or is not a list of rows.`);
    return [];
  }

  const rows: Array<Record<string, unknown>> = [];

  value.forEach((row, index) => {
    if (!isRecord(row)) {
      errors.push(`${spec.key}[${index}] is not a record.`);
      return;
    }

    const picked = pickColumns(row, spec);
    for (const [name, column] of Object.entries(spec.columns)) {
      const problem = validateValue(picked[name], column);
      if (problem) {
        errors.push(`${spec.key}[${index}].${name} ${problem}.`);
      }
    }

    const rowProblem = spec.rowCheck?.(picked);
    if (rowProblem) {
      errors.push(`${spec.key}[${index}]: ${rowProblem}.`);
    }

    rows.push(picked);
  });

  return rows;
}

/**
 * Checks the backup against itself: every id a row points at has to exist in
 * the same file. The database would catch this too, but only halfway through
 * writing — which is exactly the state an import must never leave behind.
 */
function validateReferences(
  tables: Record<string, Array<Record<string, unknown>>>,
  errors: string[],
): void {
  const idsByTable = new Map<BackupTableKey, Set<string>>();

  for (const spec of BACKUP_TABLES) {
    if (!("id" in spec.columns)) {
      continue;
    }
    const ids = new Set<string>();
    for (const row of tables[spec.key] ?? []) {
      const id = row.id;
      if (typeof id !== "string") {
        continue;
      }
      if (ids.has(id)) {
        errors.push(`${spec.key} contains two rows with the id "${id}".`);
      }
      ids.add(id);
    }
    idsByTable.set(spec.key, ids);
  }

  for (const spec of BACKUP_TABLES) {
    const referencing = Object.entries(spec.columns).filter(([, column]) => column.references);
    if (referencing.length === 0) {
      continue;
    }

    (tables[spec.key] ?? []).forEach((row, index) => {
      for (const [name, column] of referencing) {
        const value = row[name];
        if (typeof value !== "string") {
          continue;
        }
        const known = idsByTable.get(column.references as BackupTableKey);
        if (known && !known.has(value)) {
          errors.push(
            `${spec.key}[${index}].${name} points at "${value}", which isn't in this backup.`,
          );
        }
      }
    });
  }
}

function validatePreferences(value: unknown, errors: string[]): BackupPreferences {
  if (value === undefined || value === null) {
    return {};
  }
  if (!isRecord(value)) {
    errors.push('"preferences" is not a record.');
    return {};
  }

  const preferences: BackupPreferences = {};
  if (typeof value.ambientEffects === "boolean") {
    preferences.ambientEffects = value.ambientEffects;
  }
  if (typeof value.motion === "string") {
    preferences.motion = value.motion;
  }
  if (typeof value.attractionViewMode === "string") {
    preferences.attractionViewMode = value.attractionViewMode;
  }
  return preferences;
}

function trimErrors(errors: string[]): string[] {
  if (errors.length <= MAX_REPORTED_ERRORS) {
    return errors;
  }
  return [
    ...errors.slice(0, MAX_REPORTED_ERRORS),
    `…and ${errors.length - MAX_REPORTED_ERRORS} more problems.`,
  ];
}

/**
 * Validates a parsed backup completely before anything is written. Nothing
 * here touches the database: a backup is either understood in full or
 * refused, never applied in part.
 */
export function validateBackup(
  value: unknown,
  upgrades: Record<number, BackupUpgrade> = BACKUP_UPGRADES,
): BackupReadResult {
  if (!isRecord(value)) {
    return { ok: false, errors: ["This file isn't a Haunt Ranker backup."] };
  }

  const rawVersion = value.formatVersion;
  if (typeof rawVersion !== "number" || !Number.isInteger(rawVersion) || rawVersion < 1) {
    return {
      ok: false,
      errors: ["This file has no backup format version, so it isn't a Haunt Ranker backup."],
    };
  }
  if (rawVersion > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      errors: [
        `This backup was made by a newer version of Haunt Ranker (format ${rawVersion}; ` +
          `this one understands up to ${BACKUP_FORMAT_VERSION}).`,
      ],
    };
  }

  const upgraded = upgradeBackup(value, upgrades);
  if (!upgraded.ok) {
    return { ok: false, errors: [upgraded.error] };
  }
  const raw = upgraded.raw;

  if (!isRecord(raw.data)) {
    return { ok: false, errors: ['This backup has no "data" section.'] };
  }

  const errors: string[] = [];
  const tables: Record<string, Array<Record<string, unknown>>> = {};
  for (const spec of BACKUP_TABLES) {
    tables[spec.key] = validateTable(raw.data[spec.key], spec, errors);
  }
  validateReferences(tables, errors);

  const preferences = validatePreferences(raw.preferences, errors);

  if (errors.length > 0) {
    return { ok: false, errors: trimErrors(errors) };
  }

  const backup: BackupFile = {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: typeof raw.appVersion === "string" ? raw.appVersion : "unknown",
    schemaVersion: typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    data: tables as unknown as BackupData,
    preferences,
  };

  return { ok: true, backup, summary: summarizeBackup(backup) };
}

/** Reads a backup file's text. Unparseable JSON is a corrupt backup, not a crash. */
export function readBackup(
  text: string,
  upgrades: Record<number, BackupUpgrade> = BACKUP_UPGRADES,
): BackupReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["This file isn't valid JSON, so it can't be a backup."] };
  }
  return validateBackup(parsed, upgrades);
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const counts = BACKUP_TABLES.map((spec) => ({
    key: spec.key,
    label: spec.label,
    count: backup.data[spec.key]?.length ?? 0,
  }));

  return {
    formatVersion: backup.formatVersion,
    appVersion: backup.appVersion,
    schemaVersion: backup.schemaVersion,
    exportedAt: backup.exportedAt,
    counts,
    totalRows: counts.reduce((total, entry) => total + entry.count, 0),
  };
}

export function buildBackupFile(options: {
  data: BackupData;
  preferences: BackupPreferences;
  appVersion: string;
  schemaVersion: number;
  exportedAt?: string;
}): BackupFile {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: options.appVersion,
    schemaVersion: options.schemaVersion,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    data: options.data,
    preferences: options.preferences,
  };
}

/** Indented on purpose: a backup should be readable, and diffable, by a human. */
export function serializeBackup(backup: BackupFile): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

/** e.g. `haunt-ranker-backup-2026-09-18-1432.json` — sorts chronologically. */
export function suggestedBackupFileName(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `haunt-ranker-backup-${stamp}.json`;
}
