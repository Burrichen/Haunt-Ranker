import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { Setting } from "../models/settings";

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

function mapRow<T>(row: SettingRow): Setting<T> {
  return { key: row.key, value: JSON.parse(row.value) as T, updatedAt: row.updated_at };
}

export interface SettingsRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<Setting<T>>;
  getAll(): Promise<Setting[]>;
  delete(key: string): Promise<void>;
}

export function createSettingsRepository(db: SqlExecutor): SettingsRepository {
  async function get<T>(key: string): Promise<T | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<SettingRow[]>("SELECT * FROM user_settings WHERE key = ?", [
        key,
      ]);
      return rows[0] ? (JSON.parse(rows[0].value) as T) : null;
    });
  }

  async function set<T>(key: string, value: T): Promise<Setting<T>> {
    const json = JSON.stringify(value);
    await withDatabaseErrors(() =>
      db.execute(
        `INSERT INTO user_settings (key, value, updated_at)
         VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, json],
      ),
    );
    const rows = await withDatabaseErrors(() =>
      db.select<SettingRow[]>("SELECT * FROM user_settings WHERE key = ?", [key]),
    );
    return mapRow<T>(rows[0]);
  }

  async function getAll(): Promise<Setting[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<SettingRow[]>("SELECT * FROM user_settings ORDER BY key ASC");
      return rows.map((row) => mapRow(row));
    });
  }

  async function deleteKey(key: string): Promise<void> {
    await withDatabaseErrors(() => db.execute("DELETE FROM user_settings WHERE key = ?", [key]));
  }

  return { get, set, getAll, delete: deleteKey };
}
