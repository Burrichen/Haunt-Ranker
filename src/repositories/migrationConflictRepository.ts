import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import type { MigrationConflict } from "../models/migrationConflict";

interface MigrationConflictRow {
  id: string;
  migration: string;
  kind: string;
  subject_id: string | null;
  other_id: string | null;
  detail: string;
  resolved_at: string | null;
  created_at: string;
}

function mapRow(row: MigrationConflictRow): MigrationConflict {
  return {
    id: row.id,
    migration: row.migration,
    kind: row.kind,
    subjectId: row.subject_id,
    otherId: row.other_id,
    detail: row.detail,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export interface MigrationConflictRepository {
  getAll(): Promise<MigrationConflict[]>;
  /** Only what still needs a person — what a migration did successfully isn't a task. */
  getUnresolved(): Promise<MigrationConflict[]>;
  /** Marks one as dealt with. The report is kept; only its status changes. */
  resolve(id: EntityId): Promise<void>;
}

/**
 * Reads the migration conflict log.
 *
 * Deliberately read-and-resolve only: the app reports what a migration
 * could not decide, and never writes conflicts of its own.
 */
export function createMigrationConflictRepository(db: SqlExecutor): MigrationConflictRepository {
  async function getAll(): Promise<MigrationConflict[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<MigrationConflictRow[]>(
        "SELECT * FROM migration_conflicts ORDER BY created_at ASC, id ASC",
      );
      return rows.map(mapRow);
    });
  }

  async function getUnresolved(): Promise<MigrationConflict[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<MigrationConflictRow[]>(
        `SELECT * FROM migration_conflicts
         WHERE resolved_at IS NULL AND kind != 'cross_park_merged'
         ORDER BY created_at ASC, id ASC`,
      );
      return rows.map(mapRow);
    });
  }

  async function resolve(id: EntityId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute(
        `UPDATE migration_conflicts
         SET resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [id],
      ),
    );
  }

  return { getAll, getUnresolved, resolve };
}
