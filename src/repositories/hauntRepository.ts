import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import {
  DEFAULT_HAUNT_ACCENT,
  isHauntAccent,
  type Haunt,
  type HauntId,
  type HauntInput,
} from "../models/haunt";

interface HauntRow {
  id: string;
  name: string;
  short_name: string;
  description: string | null;
  tagline: string | null;
  accent: string | null;
  venues_label: string | null;
  sort_order: number;
  pack_id: string | null;
  pack_version: string | null;
  pack_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: HauntRow): Haunt {
  return {
    id: row.id as HauntId,
    name: row.name,
    shortName: row.short_name,
    description: row.description,
    tagline: row.tagline,
    accent: isHauntAccent(row.accent) ? row.accent : DEFAULT_HAUNT_ACCENT,
    venuesLabel: row.venues_label,
    sortOrder: row.sort_order,
    packId: row.pack_id,
    packVersion: row.pack_version,
    packUpdatedAt: row.pack_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface HauntRepository {
  getAll(): Promise<Haunt[]>;
  getById(id: EntityId): Promise<Haunt | null>;
  /**
   * Writes a haunt a pack describes, creating it or correcting it.
   *
   * The only way a new haunt reaches the database — there is no UI for
   * inventing one, because a haunt without seasons, venues and vocabulary
   * would be a half-built collection.
   */
  save(input: HauntInput): Promise<Haunt>;
}

export function createHauntRepository(db: SqlExecutor): HauntRepository {
  async function getAll(): Promise<Haunt[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<HauntRow[]>(
        "SELECT * FROM haunts ORDER BY sort_order ASC, name ASC",
      );
      return rows.map(mapRow);
    });
  }

  async function getById(id: EntityId): Promise<Haunt | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<HauntRow[]>("SELECT * FROM haunts WHERE id = ?", [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    });
  }

  async function save(input: HauntInput): Promise<Haunt> {
    return withDatabaseErrors(async () => {
      await db.execute(
        `INSERT INTO haunts (
           id, name, short_name, description, tagline, accent, venues_label, sort_order,
           pack_id, pack_version, pack_updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           short_name = excluded.short_name,
           description = excluded.description,
           tagline = excluded.tagline,
           accent = excluded.accent,
           venues_label = excluded.venues_label,
           sort_order = excluded.sort_order,
           pack_id = excluded.pack_id,
           pack_version = excluded.pack_version,
           pack_updated_at = excluded.pack_updated_at,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        [
          input.id,
          input.name,
          input.shortName,
          input.description ?? null,
          input.tagline ?? null,
          input.accent ?? DEFAULT_HAUNT_ACCENT,
          input.venuesLabel ?? null,
          input.sortOrder ?? 100,
          input.packId ?? null,
          input.packVersion ?? null,
        ],
      );
      const saved = await getById(input.id);
      if (!saved) {
        throw new Error(`Haunt "${input.id}" could not be saved.`);
      }
      return saved;
    });
  }

  return { getAll, getById, save };
}
