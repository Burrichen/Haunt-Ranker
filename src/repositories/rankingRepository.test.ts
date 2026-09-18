// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { allTimeScope } from "../models/ranking";
import { createFixtureAttraction, createFixtureEventYear } from "../test/fixtures";
import { createTestDatabase } from "../test/createTestDatabase";
import { createRankingRepository, type RankingRepository } from "./rankingRepository";

describe("RankingRepository", () => {
  let db: SqlExecutor;
  let rankings: RankingRepository;
  let houseIds: string[];

  beforeEach(async () => {
    db = createTestDatabase();
    rankings = createRankingRepository(db);
    const eventYear = await createFixtureEventYear(db);
    houseIds = await Promise.all(
      ["House A", "House B", "House C"].map(
        async (name, index) =>
          (
            await createFixtureAttraction(db, eventYear.id, {
              name,
              slug: `house-${index}`,
            })
          ).id,
      ),
    );
  });

  it("is empty for a scope that has never been set", async () => {
    await expect(rankings.getScope(allTimeScope("house"))).resolves.toEqual([]);
  });

  it("stores manual order and returns it back in the same order with dense positions", async () => {
    const scope = allTimeScope("house");
    const [a, b, c] = houseIds;

    await rankings.setScope(scope, [c, a, b]);
    const entries = await rankings.getScope(scope);

    expect(entries.map((entry) => entry.attractionId)).toEqual([c, a, b]);
    expect(entries.map((entry) => entry.position)).toEqual([0, 1, 2]);
  });

  it("replaces the prior order entirely on a second call, without leaving stale rows", async () => {
    const scope = allTimeScope("house");
    const [a, b, c] = houseIds;

    await rankings.setScope(scope, [a, b, c]);
    await rankings.setScope(scope, [c, a]);

    const entries = await rankings.getScope(scope);
    expect(entries.map((entry) => entry.attractionId)).toEqual([c, a]);
  });

  it("keeps independent scopes from interfering with each other", async () => {
    const [a, b] = houseIds;

    await rankings.setScope("houses:all", [a, b]);
    await rankings.setScope("houses:year:2024", [b, a]);

    expect((await rankings.getScope("houses:all")).map((e) => e.attractionId)).toEqual([a, b]);
    expect((await rankings.getScope("houses:year:2024")).map((e) => e.attractionId)).toEqual([
      b,
      a,
    ]);
  });

  it("reports the position of a single attraction, or null if it has none", async () => {
    const scope = allTimeScope("house");
    const [a, b] = houseIds;
    await rankings.setScope(scope, [b, a]);

    await expect(rankings.getPosition(scope, a)).resolves.toBe(1);
    await expect(rankings.getPosition(scope, "not-in-scope")).resolves.toBeNull();
  });

  it("clears a scope entirely", async () => {
    const scope = allTimeScope("house");
    await rankings.setScope(scope, houseIds);
    await rankings.clearScope(scope);

    await expect(rankings.getScope(scope)).resolves.toEqual([]);
  });

  it("removes an attraction's ranking entry when the attraction is deleted", async () => {
    const scope = allTimeScope("house");
    await rankings.setScope(scope, houseIds);

    await db.execute("DELETE FROM attractions WHERE id = ?", [houseIds[0]]);

    const entries = await rankings.getScope(scope);
    expect(entries.map((entry) => entry.attractionId)).not.toContain(houseIds[0]);
    expect(entries).toHaveLength(2);
  });
});
