import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import type { Haunt, HauntId } from "../models/haunt";

interface HauntRow {
  id: string;
  name: string;
  short_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: HauntRow): Haunt {
  return {
    id: row.id as HauntId,
    name: row.name,
    shortName: row.short_name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface HauntRepository {
  getAll(): Promise<Haunt[]>;
  getById(id: EntityId): Promise<Haunt | null>;
}

/**
 * The haunts the archive covers.
 *
 * They are seeded by migration 0008 and read-only from the app: a haunt is
 * not a record a user creates, and nothing here is a plugin mechanism for
 * adding a third one from the UI.
 */
export function createHauntRepository(db: SqlExecutor): HauntRepository {
  async function getAll(): Promise<Haunt[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<HauntRow[]>("SELECT * FROM haunts ORDER BY name ASC");
      return rows.map(mapRow);
    });
  }

  async function getById(id: EntityId): Promise<Haunt | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<HauntRow[]>("SELECT * FROM haunts WHERE id = ?", [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    });
  }

  return { getAll, getById };
}
