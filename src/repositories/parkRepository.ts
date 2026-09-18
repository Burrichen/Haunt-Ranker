import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { Park, ParkId } from "../models/park";

interface ParkRow {
  id: string;
  name: string;
}

function mapRow(row: ParkRow): Park {
  return { id: row.id as ParkId, name: row.name };
}

export interface ParkRepository {
  getAll(): Promise<Park[]>;
}

/** Parks are fixed, seeded reference data (see 0003_seed_reference_data.sql) — read-only from the app. */
export function createParkRepository(db: SqlExecutor): ParkRepository {
  async function getAll(): Promise<Park[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<ParkRow[]>("SELECT * FROM parks ORDER BY name ASC");
      return rows.map(mapRow);
    });
  }

  return { getAll };
}
