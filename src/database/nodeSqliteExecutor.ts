import type { DatabaseSync } from "node:sqlite";
import type { QueryResult, SqlExecutor } from "./types";

/** What node:sqlite's StatementSync accepts as a bind value. */
type SqliteBindValue = null | number | bigint | string | NodeJS.ArrayBufferView;

function toSqliteBindValue(value: unknown): SqliteBindValue {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "string"
  ) {
    return value;
  }
  throw new TypeError(`Unsupported SQL bind value of type ${typeof value}`);
}

/**
 * Wraps `node:sqlite`'s synchronous `DatabaseSync` so it satisfies the same
 * `SqlExecutor` contract repositories use in production against
 * `@tauri-apps/plugin-sql`. Used by the Vitest test database
 * (`src/test/createTestDatabase.ts`, an in-memory database) and by
 * `scripts/dev-db.ts` (the real on-disk dev database) — never by the
 * browser/Tauri bundle itself, so `node:sqlite` never ships to users.
 */
export class NodeSqliteExecutor implements SqlExecutor {
  constructor(private readonly db: DatabaseSync) {}

  // Deliberately `async`, even though node:sqlite is synchronous under the
  // hood: it ensures a thrown SQLite error becomes a rejected promise
  // (matching `@tauri-apps/plugin-sql`'s real async behavior) instead of a
  // synchronous throw at the call site.
  async execute(query: string, bindValues: unknown[] = []): Promise<QueryResult> {
    const info = this.db.prepare(query).run(...bindValues.map(toSqliteBindValue));
    return {
      rowsAffected: Number(info.changes),
      lastInsertId: Number(info.lastInsertRowid),
    };
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    const rows = this.db.prepare(query).all(...bindValues.map(toSqliteBindValue));
    return rows as T;
  }
}
