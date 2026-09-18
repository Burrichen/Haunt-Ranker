// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { ConstraintViolationError } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import { RATING_TOTAL_MAX, RATING_VALUES } from "../models/rating";
import { createFixtureAttraction, createFixtureEventYear } from "../test/fixtures";
import { createTestDatabase } from "../test/createTestDatabase";
import { createRatingRepository, type RatingRepository } from "./ratingRepository";

describe("RatingRepository", () => {
  let db: SqlExecutor;
  let ratings: RatingRepository;
  let attractionId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    ratings = createRatingRepository(db);
    const eventYear = await createFixtureEventYear(db);
    attractionId = (await createFixtureAttraction(db, eventYear.id)).id;
  });

  it("is null for an attraction that has never been rated — never zero", async () => {
    await expect(ratings.getForAttraction(attractionId)).resolves.toBeNull();
  });

  it("derives total as Theme + Fun + Fear and never stores it as an input", async () => {
    const rating = await ratings.upsert(attractionId, { theme: 4, fun: 3.5, fear: 2 });

    expect(rating.total).toBe(9.5);
    expect(rating.theme).toBe(4);
    expect(rating.fun).toBe(3.5);
    expect(rating.fear).toBe(2);
  });

  it("supports the maximum possible total", async () => {
    const rating = await ratings.upsert(attractionId, { theme: 5, fun: 5, fear: 5 });
    expect(rating.total).toBe(RATING_TOTAL_MAX);
    expect(rating.total).toBe(15);
  });

  it("supports the minimum possible rating (all zeros) as distinct from unrated", async () => {
    const rating = await ratings.upsert(attractionId, { theme: 0, fun: 0, fear: 0 });
    expect(rating.total).toBe(0);

    // Still a real row — distinct from "never rated" (null).
    await expect(ratings.getForAttraction(attractionId)).resolves.not.toBeNull();
  });

  it("upsert on an already-rated attraction updates in place rather than duplicating", async () => {
    await ratings.upsert(attractionId, { theme: 1, fun: 1, fear: 1 });
    const second = await ratings.upsert(attractionId, { theme: 5, fun: 5, fear: 5 });

    expect(second.total).toBe(15);

    const rows = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM user_ratings WHERE attraction_id = ?",
      [attractionId],
    );
    expect(rows[0].count).toBe(1);
  });

  it.each(RATING_VALUES.map((value) => [value] as const))(
    "accepts %s as a valid half-step score in every dimension",
    async (value) => {
      const rating = await ratings.upsert(attractionId, {
        theme: value,
        fun: value,
        fear: value,
      });

      expect(rating.theme).toBe(value);
      expect(rating.fun).toBe(value);
      expect(rating.fear).toBe(value);
      expect(rating.total).toBe(value * 3);
    },
  );

  it("stores a mix of half and whole scores exactly as given", async () => {
    const rating = await ratings.upsert(attractionId, { theme: 0.5, fun: 4, fear: 2.5 });

    expect(rating).toMatchObject({ theme: 0.5, fun: 4, fear: 2.5, total: 7 });
  });

  it.each([
    ["below the minimum", { theme: -0.5, fun: 1, fear: 1 }],
    ["above the maximum", { theme: 1, fun: 5.5, fear: 1 }],
    ["not a 0.5 increment", { theme: 1, fun: 1, fear: 1.25 }],
    ["a third of a point", { theme: 1 / 3, fun: 1, fear: 1 }],
    ["not a number", { theme: Number.NaN, fun: 1, fear: 1 }],
    ["infinite", { theme: 1, fun: Number.POSITIVE_INFINITY, fear: 1 }],
  ])("rejects a theme/fun/fear value that is %s", async (_label, input) => {
    const error = await ratings.upsert(attractionId, input).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConstraintViolationError);
    expect((error as ConstraintViolationError).constraint).toBe("check");
  });

  it("the database itself rejects an out-of-range rating, independent of the repository's own guard", async () => {
    // Bypasses RatingRepository entirely to prove the CHECK constraint is a
    // real backstop, not just app-level validation.
    await expect(
      db.execute(
        "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES (?, ?, ?, ?, ?)",
        ["raw-insert", attractionId, 99, 0, 0],
      ),
    ).rejects.toThrow(/CHECK constraint failed/i);
  });

  it("the database rejects writing to the generated total column directly", async () => {
    await expect(
      db.execute(
        "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear, total) VALUES (?, ?, ?, ?, ?, ?)",
        ["raw-insert", attractionId, 1, 1, 1, 999],
      ),
    ).rejects.toThrow(/generated column/i);
  });

  it("getAll returns every rating with its values", async () => {
    await expect(ratings.getAll()).resolves.toEqual([]);

    await ratings.upsert(attractionId, { theme: 3, fun: 2.5, fear: 1 });

    const all = await ratings.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ attractionId, theme: 3, fun: 2.5, fear: 1, total: 6.5 });
  });

  it("getRatedAttractionIds lists only attractions that have a rating", async () => {
    await expect(ratings.getRatedAttractionIds()).resolves.toEqual([]);

    await ratings.upsert(attractionId, { theme: 2, fun: 2, fear: 2 });

    await expect(ratings.getRatedAttractionIds()).resolves.toEqual([attractionId]);
  });

  it("becomes unrated again after deletion", async () => {
    await ratings.upsert(attractionId, { theme: 2, fun: 2, fear: 2 });
    await ratings.delete(attractionId);

    await expect(ratings.getForAttraction(attractionId)).resolves.toBeNull();
  });

  it("clearing leaves no row behind — unrated, not a stored zero", async () => {
    await ratings.upsert(attractionId, { theme: 2, fun: 2, fear: 2 });
    await ratings.delete(attractionId);

    const rows = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM user_ratings WHERE attraction_id = ?",
      [attractionId],
    );
    expect(rows[0].count).toBe(0);
    await expect(ratings.getRatedAttractionIds()).resolves.toEqual([]);
  });

  it("clearing an attraction that was never rated is a no-op", async () => {
    await expect(ratings.delete(attractionId)).resolves.toBeUndefined();
    await expect(ratings.getForAttraction(attractionId)).resolves.toBeNull();
  });

  it("a rejected invalid value leaves any existing rating untouched", async () => {
    await ratings.upsert(attractionId, { theme: 3, fun: 3, fear: 3 });

    await expect(
      ratings.upsert(attractionId, { theme: 3, fun: 7, fear: 3 }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(ratings.getForAttraction(attractionId)).resolves.toMatchObject({
      theme: 3,
      fun: 3,
      fear: 3,
      total: 9,
    });
  });

  it("is removed automatically when the attraction itself is deleted", async () => {
    await ratings.upsert(attractionId, { theme: 2, fun: 2, fear: 2 });

    await db.execute("DELETE FROM attractions WHERE id = ?", [attractionId]);

    const rows = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM user_ratings WHERE attraction_id = ?",
      [attractionId],
    );
    expect(rows[0].count).toBe(0);
  });
});
