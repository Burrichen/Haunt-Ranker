/**
 * The result shape returned by a write (`execute`). Mirrors
 * `@tauri-apps/plugin-sql`'s `QueryResult` exactly so its `Database` class
 * satisfies `SqlExecutor` with no adapter needed.
 */
export interface QueryResult {
  rowsAffected: number;
  lastInsertId?: number;
}

/**
 * The only surface repositories are allowed to depend on. This keeps
 * repositories decoupled from the Tauri SQL plugin specifically — in
 * production `getDatabase()` resolves to a real `@tauri-apps/plugin-sql`
 * `Database`; in tests it resolves to a `node:sqlite`-backed executor (see
 * `src/test/createTestDatabase.ts`) running the same migration files
 * against a real embedded SQLite engine.
 */
export interface SqlExecutor {
  execute(query: string, bindValues?: unknown[]): Promise<QueryResult>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}
