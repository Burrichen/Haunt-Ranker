import Database from "@tauri-apps/plugin-sql";
import type { SqlExecutor } from "./types";

/**
 * Must match the db url the migrations are registered against in
 * `src-tauri/src/lib.rs`. Schema and seed migrations run automatically the
 * first time this connection is opened.
 */
export const DATABASE_URL = "sqlite:haunt-ranker.db";

let connection: Promise<SqlExecutor> | null = null;

/**
 * Lazily opens (or reuses) the app's SQLite connection via the Tauri SQL
 * plugin. Repositories should go through this instead of opening their
 * own connections — `Database` already satisfies `SqlExecutor`
 * structurally, so no adapter is needed here.
 */
export function getDatabase(): Promise<SqlExecutor> {
  if (!connection) {
    connection = Database.load(DATABASE_URL);
  }
  return connection;
}
