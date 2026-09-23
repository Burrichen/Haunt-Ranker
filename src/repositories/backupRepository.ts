import { BACKUP_TABLES, columnNames } from "../backup/backupTables";
import type { BackupTableCount } from "../backup/backupFormat";
import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { BackupData } from "../models/backup";

export interface BackupRepository {
  /** Every backed-up table, exactly as stored. */
  exportData(): Promise<BackupData>;
  /** What's in the database now — for showing the user what an import would replace. */
  counts(): Promise<BackupTableCount[]>;
  /**
   * Replaces every backed-up table with the given data. Reference data —
   * haunts and venues — is added to but never emptied.
   */
  replaceAll(data: BackupData): Promise<void>;
  /** The highest applied migration version, or null where that isn't recorded. */
  appliedSchemaVersion(): Promise<number | null>;
}

export function createBackupRepository(db: SqlExecutor): BackupRepository {
  async function exportData(): Promise<BackupData> {
    return withDatabaseErrors(async () => {
      const data = {} as Record<string, unknown[]>;
      for (const spec of BACKUP_TABLES) {
        data[spec.key] = await db.select<unknown[]>(
          `SELECT ${columnNames(spec).join(", ")} FROM ${spec.table} ORDER BY ${spec.orderBy}`,
        );
      }
      return data as unknown as BackupData;
    });
  }

  async function counts(): Promise<BackupTableCount[]> {
    return withDatabaseErrors(async () => {
      const results: BackupTableCount[] = [];
      for (const spec of BACKUP_TABLES) {
        const rows = await db.select<Array<{ count: number }>>(
          `SELECT COUNT(*) as count FROM ${spec.table}`,
        );
        results.push({ key: spec.key, label: spec.label, count: rows[0]?.count ?? 0 });
      }
      return results;
    });
  }

  async function replaceAll(data: BackupData): Promise<void> {
    await withDatabaseErrors(async () => {
      // Reverse order: a table is emptied before the tables it points at,
      // so no delete ever trips a foreign key (and nothing relies on
      // cascade behaviour to do it silently).
      for (const spec of [...BACKUP_TABLES].reverse()) {
        if (spec.reference) {
          continue;
        }
        await db.execute(`DELETE FROM ${spec.table}`);
      }

      for (const spec of BACKUP_TABLES) {
        const columns = columnNames(spec);
        const placeholders = columns.map(() => "?").join(", ");
        // Reference rows are already there, seeded by a migration. A backup
        // may name one this build has never heard of, which is worth
        // keeping; it may not redefine one this build relies on.
        const verb = spec.reference ? "INSERT OR IGNORE INTO" : "INSERT INTO";
        const statement = `${verb} ${spec.table} (${columns.join(", ")}) VALUES (${placeholders})`;

        for (const row of data[spec.key] ?? []) {
          const values = columns.map(
            (name) => (row as unknown as Record<string, unknown>)[name] ?? null,
          );
          await db.execute(statement, values);
        }
      }
    });
  }

  async function appliedSchemaVersion(): Promise<number | null> {
    try {
      // The Tauri SQL plugin records applied migrations here. The test
      // executor applies the same .sql files without that bookkeeping, so a
      // missing table is a normal answer rather than a failure.
      const rows = await db.select<Array<{ version: number | null }>>(
        "SELECT MAX(version) as version FROM _sqlx_migrations",
      );
      return rows[0]?.version ?? null;
    } catch {
      return null;
    }
  }

  return { exportData, counts, replaceAll, appliedSchemaVersion };
}
