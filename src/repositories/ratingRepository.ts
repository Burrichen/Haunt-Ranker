import { ConstraintViolationError, NotFoundError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import { isValidRatingValue, type Rating, type RatingInput } from "../models/rating";
import { generateId } from "./id";

interface RatingRow {
  id: string;
  attraction_id: string;
  theme: number;
  fun: number;
  fear: number;
  total: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: RatingRow): Rating {
  return {
    id: row.id,
    attractionId: row.attraction_id,
    theme: row.theme,
    fun: row.fun,
    fear: row.fear,
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Fails fast with a clear message rather than waiting on the DB's CHECK constraint. */
function assertValidRatingInput(input: RatingInput): void {
  for (const [field, value] of Object.entries(input) as Array<[keyof RatingInput, number]>) {
    if (!isValidRatingValue(value)) {
      throw new ConstraintViolationError(
        `"${field}" must be between 0 and 5 in increments of 0.5 (got ${value})`,
        "check",
      );
    }
  }
}

export interface RatingRepository {
  /** `null` means genuinely unrated — never treat that as a rating of 0. */
  getForAttraction(attractionId: EntityId): Promise<Rating | null>;
  /** Every rating that exists — for browsers/listings that need the values, not just presence. */
  getAll(): Promise<Rating[]>;
  /** Every attraction id that currently has a rating — for summary counts, never for showing a "0". */
  getRatedAttractionIds(): Promise<EntityId[]>;
  /** Creates or replaces the rating for this attraction. `total` is derived — it is never a parameter. */
  upsert(attractionId: EntityId, input: RatingInput): Promise<Rating>;
  delete(attractionId: EntityId): Promise<void>;
}

export function createRatingRepository(db: SqlExecutor): RatingRepository {
  async function getForAttraction(attractionId: EntityId): Promise<Rating | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<RatingRow[]>(
        "SELECT * FROM user_ratings WHERE attraction_id = ?",
        [attractionId],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    });
  }

  async function getAll(): Promise<Rating[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<RatingRow[]>("SELECT * FROM user_ratings");
      return rows.map(mapRow);
    });
  }

  async function getRatedAttractionIds(): Promise<EntityId[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<Array<{ attraction_id: string }>>(
        "SELECT attraction_id FROM user_ratings",
      );
      return rows.map((row) => row.attraction_id);
    });
  }

  async function upsert(attractionId: EntityId, input: RatingInput): Promise<Rating> {
    assertValidRatingInput(input);

    const existing = await getForAttraction(attractionId);

    if (existing) {
      await withDatabaseErrors(() =>
        db.execute(
          `UPDATE user_ratings
           SET theme = ?, fun = ?, fear = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE attraction_id = ?`,
          [input.theme, input.fun, input.fear, attractionId],
        ),
      );
    } else {
      const id = generateId();
      await withDatabaseErrors(() =>
        db.execute(
          "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES (?, ?, ?, ?, ?)",
          [id, attractionId, input.theme, input.fun, input.fear],
        ),
      );
    }

    const updated = await getForAttraction(attractionId);
    if (!updated) {
      throw new NotFoundError("Rating", attractionId);
    }
    return updated;
  }

  async function deleteRating(attractionId: EntityId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute("DELETE FROM user_ratings WHERE attraction_id = ?", [attractionId]),
    );
  }

  return { getForAttraction, getAll, getRatedAttractionIds, upsert, delete: deleteRating };
}
