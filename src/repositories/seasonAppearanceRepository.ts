import { ConstraintViolationError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import type { SeasonAppearance, SeasonAppearanceInput } from "../models/seasonAppearance";

interface SeasonAppearanceRow {
  attraction_id: string;
  season_id: string;
  notes: string | null;
  created_at: string;
}

function mapRow(row: SeasonAppearanceRow): SeasonAppearance {
  return {
    attractionId: row.attraction_id,
    seasonId: row.season_id,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export interface SeasonAppearanceRepository {
  /** Every appearance in the archive. Small enough to read in one go. */
  getAll(): Promise<SeasonAppearance[]>;
  /** Every season this attraction ran in, oldest first. */
  getByAttraction(attractionId: EntityId): Promise<SeasonAppearance[]>;
  /** Everything that ran in this season. */
  getBySeason(seasonId: EntityId): Promise<SeasonAppearance[]>;
  /** Records an appearance. Recording the same one twice is not an error. */
  add(input: SeasonAppearanceInput): Promise<SeasonAppearance>;
  remove(attractionId: EntityId, seasonId: EntityId): Promise<void>;
}

/**
 * Which seasons an attraction appeared in.
 *
 * An appearance is a fact about the archive, so removing one never touches
 * the rating or the note — those belong to the canonical attraction, which
 * outlives any single season.
 */
export function createSeasonAppearanceRepository(db: SqlExecutor): SeasonAppearanceRepository {
  async function getAll(): Promise<SeasonAppearance[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<SeasonAppearanceRow[]>(
        "SELECT * FROM season_appearances ORDER BY attraction_id ASC, season_id ASC",
      );
      return rows.map(mapRow);
    });
  }

  async function getByAttraction(attractionId: EntityId): Promise<SeasonAppearance[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<SeasonAppearanceRow[]>(
        `SELECT a.* FROM season_appearances a
         JOIN event_years y ON y.id = a.season_id
         WHERE a.attraction_id = ?
         ORDER BY y.calendar_year ASC`,
        [attractionId],
      );
      return rows.map(mapRow);
    });
  }

  async function getBySeason(seasonId: EntityId): Promise<SeasonAppearance[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<SeasonAppearanceRow[]>(
        "SELECT * FROM season_appearances WHERE season_id = ? ORDER BY attraction_id ASC",
        [seasonId],
      );
      return rows.map(mapRow);
    });
  }

  async function get(attractionId: EntityId, seasonId: EntityId): Promise<SeasonAppearance | null> {
    const rows = await db.select<SeasonAppearanceRow[]>(
      "SELECT * FROM season_appearances WHERE attraction_id = ? AND season_id = ?",
      [attractionId, seasonId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async function add(input: SeasonAppearanceInput): Promise<SeasonAppearance> {
    if (!input.attractionId || !input.seasonId) {
      throw new ConstraintViolationError(
        "An appearance needs both an attraction and a season",
        "foreign_key",
      );
    }

    return withDatabaseErrors(async () => {
      await db.execute(
        `INSERT INTO season_appearances (attraction_id, season_id, notes)
         VALUES (?, ?, ?)
         ON CONFLICT (attraction_id, season_id) DO UPDATE SET notes = excluded.notes`,
        [input.attractionId, input.seasonId, input.notes ?? null],
      );
      const stored = await get(input.attractionId, input.seasonId);
      if (!stored) {
        throw new ConstraintViolationError("That appearance could not be saved", "foreign_key");
      }
      return stored;
    });
  }

  async function remove(attractionId: EntityId, seasonId: EntityId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute("DELETE FROM season_appearances WHERE attraction_id = ? AND season_id = ?", [
        attractionId,
        seasonId,
      ]),
    );
  }

  return { getAll, getByAttraction, getBySeason, add, remove };
}
