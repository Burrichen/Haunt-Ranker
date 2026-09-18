import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { NodeSqliteExecutor } from "../database/nodeSqliteExecutor";
import type { SqlExecutor } from "../database/types";

const currentDir = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(currentDir, "..", "..", "src-tauri", "migrations");

/**
 * Reads every migration file straight off disk (rather than a hardcoded
 * list) so adding a new `NNNN_*.sql` file is automatically picked up here
 * too — there's no separate list to remember to update.
 */
function readMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function applyMigrations(db: DatabaseSync, upToVersion?: number): void {
  for (const file of readMigrationFiles()) {
    if (upToVersion !== undefined && migrationVersion(file) > upToVersion) {
      return;
    }
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
}

/** `0003_seed_reference_data.sql` → 3. */
function migrationVersion(fileName: string): number {
  return Number.parseInt(fileName.slice(0, 4), 10);
}

/**
 * A database migrated only as far as `version`, for testing that a later
 * migration upgrades existing data correctly rather than only that it
 * produces the right schema from scratch.
 */
export function createTestDatabaseAtVersion(version: number): {
  db: SqlExecutor;
  /** Applies one further migration, by version number. */
  migrateTo: (nextVersion: number) => void;
} {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON;");
  applyMigrations(raw, version);

  return {
    db: new NodeSqliteExecutor(raw),
    migrateTo: (nextVersion: number) => {
      const file = readMigrationFiles().find((name) => migrationVersion(name) === nextVersion);
      if (!file) {
        throw new Error(`No migration found for version ${nextVersion}`);
      }
      raw.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    },
  };
}

/**
 * Creates a fresh in-memory SQLite database with the real migrations
 * (read from `src-tauri/migrations/`, the same files the Tauri app runs)
 * applied, for use in repository tests.
 */
export function createTestDatabase(): SqlExecutor {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  applyMigrations(db);
  return new NodeSqliteExecutor(db);
}

export interface FileTestDatabase {
  db: SqlExecutor;
  close(): void;
}

/**
 * Opens a file-backed database, for tests that need data to outlive the
 * connection itself — i.e. to prove something survives an app restart
 * rather than just a query within one session.
 *
 * Pass `migrate: false` when reopening a file that already has the schema:
 * the migration files use plain `CREATE TABLE`, so running them twice
 * against the same file fails.
 */
export function openTestDatabaseFile(
  filePath: string,
  { migrate = true }: { migrate?: boolean } = {},
): FileTestDatabase {
  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA foreign_keys = ON;");
  if (migrate) {
    applyMigrations(db);
  }
  return {
    db: new NodeSqliteExecutor(db),
    close: () => db.close(),
  };
}
