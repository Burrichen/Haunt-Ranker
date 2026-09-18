import type { EntityId, Timestamped } from "./common";

export const RATING_MIN = 0;
export const RATING_MAX = 5;
export const RATING_STEP = 0.5;
export const RATING_TOTAL_MAX = RATING_MAX * 3;

/** Every value a dimension may hold, ascending: 0, 0.5, 1 … 5. Derived, not hand-listed. */
export const RATING_VALUES: number[] = Array.from(
  { length: RATING_MAX / RATING_STEP + 1 },
  (_, index) => index * RATING_STEP,
);

/**
 * A personal rating. `total` is always Theme + Fun + Fear — the database
 * stores it as a generated column and rejects any attempt to write it
 * directly (see 0002_personal_schema.sql). An attraction with no `Rating`
 * row is genuinely unrated; never treat that as a rating of 0.
 */
export interface Rating extends Timestamped {
  id: EntityId;
  attractionId: EntityId;
  theme: number;
  fun: number;
  fear: number;
  total: number;
}

export interface RatingInput {
  theme: number;
  fun: number;
  fear: number;
}

/** 0-5 inclusive, in steps of 0.5. */
export function isValidRatingValue(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= RATING_MIN &&
    value <= RATING_MAX &&
    Math.round(value * 2) === value * 2
  );
}
