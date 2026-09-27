import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { HauntId } from "../models/haunt";
import {
  DEFAULT_VENUE_ICON,
  isVenueIcon,
  type Park,
  type ParkId,
  type ParkInput,
} from "../models/park";

interface ParkRow {
  id: string;
  name: string;
  haunt_id: string;
  icon: string | null;
  sort_order: number;
  pack_id: string | null;
}

function mapRow(row: ParkRow): Park {
  return {
    id: row.id as ParkId,
    name: row.name,
    hauntId: (row.haunt_id ?? "hhn") as HauntId,
    icon: isVenueIcon(row.icon) ? row.icon : DEFAULT_VENUE_ICON,
    sortOrder: row.sort_order,
    packId: row.pack_id,
  };
}

export interface ParkRepository {
  getAll(): Promise<Park[]>;
  getByHaunt(hauntId: HauntId): Promise<Park[]>;
  /** Writes a venue a pack describes. The only way a new one appears. */
  save(input: ParkInput): Promise<Park>;
}

/**
 * Venues. Seeded for the haunts the app ships with, and otherwise written
 * by a Haunt Pack — never by hand, because a venue with no haunt and no
 * attractions is not something a reader can do anything with.
 */
export function createParkRepository(db: SqlExecutor): ParkRepository {
  async function getAll(): Promise<Park[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<ParkRow[]>(
        "SELECT * FROM parks ORDER BY sort_order ASC, name ASC",
      );
      return rows.map(mapRow);
    });
  }

  async function getByHaunt(hauntId: HauntId): Promise<Park[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<ParkRow[]>(
        "SELECT * FROM parks WHERE haunt_id = ? ORDER BY sort_order ASC, name ASC",
        [hauntId],
      );
      return rows.map(mapRow);
    });
  }

  async function save(input: ParkInput): Promise<Park> {
    return withDatabaseErrors(async () => {
      await db.execute(
        `INSERT INTO parks (id, name, haunt_id, icon, sort_order, pack_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           haunt_id = excluded.haunt_id,
           icon = excluded.icon,
           sort_order = excluded.sort_order,
           pack_id = excluded.pack_id`,
        [
          input.id,
          input.name,
          input.hauntId,
          input.icon ?? DEFAULT_VENUE_ICON,
          input.sortOrder ?? 100,
          input.packId ?? null,
        ],
      );

      const rows = await db.select<ParkRow[]>("SELECT * FROM parks WHERE id = ?", [input.id]);
      if (!rows[0]) {
        throw new Error(`Venue "${input.id}" could not be saved.`);
      }
      return mapRow(rows[0]);
    });
  }

  return { getAll, getByHaunt, save };
}
