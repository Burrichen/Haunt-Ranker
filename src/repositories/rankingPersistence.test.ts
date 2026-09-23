// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { allTimeScope, rankingGroupScope } from "../models/ranking";
import { createFixtureEventYear } from "../test/fixtures";
import { openTestDatabaseFile, type FileTestDatabase } from "../test/createTestDatabase";
import { buildCalculatedRanking, buildManualRanking, type RankingRow } from "../utils/rankings";
import { createAttractionRepository } from "./attractionRepository";
import { createEventYearRepository } from "./eventYearRepository";
import { createRankingRepository } from "./rankingRepository";
import { createRatingRepository } from "./ratingRepository";

/**
 * A manual ranking is pure user intent — nothing can regenerate it — so
 * these tests close the database connection entirely and reopen the same
 * file, the closest a test gets to quitting and relaunching the app.
 */
describe("ranking persistence", () => {
  let directory: string;
  let filePath: string;
  let open: FileTestDatabase | null;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "haunt-ranker-rankings-"));
    filePath = join(directory, "haunt-ranker.db");
    open = null;
  });

  afterEach(() => {
    open?.close();
    rmSync(directory, { recursive: true, force: true });
  });

  /** Reopens the same file the way a relaunched app would, schema already in place. */
  function restart(): SqlExecutor {
    open?.close();
    open = openTestDatabaseFile(filePath, { migrate: false });
    return open.db;
  }

  interface Seeded {
    best: string;
    middle: string;
    worst: string;
    zone: string;
  }

  async function seed(): Promise<Seeded> {
    const session = openTestDatabaseFile(filePath);
    const eventYear = await createFixtureEventYear(session.db);
    const attractions = createAttractionRepository(session.db);
    const ratings = createRatingRepository(session.db);

    const best = await attractions.create({
      eventYearId: eventYear.id,
      attractionType: "house",
      name: "Best House",
      slug: "best-house",
      parkIds: ["hollywood"],
    });
    const middle = await attractions.create({
      eventYearId: eventYear.id,
      attractionType: "house",
      name: "Middle House",
      slug: "middle-house",
      parkIds: ["hollywood"],
    });
    const worst = await attractions.create({
      eventYearId: eventYear.id,
      attractionType: "house",
      name: "Worst House",
      slug: "worst-house",
      parkIds: ["hollywood"],
    });
    const zone = await attractions.create({
      eventYearId: eventYear.id,
      attractionType: "scare_zone",
      name: "A Scare Zone",
      slug: "a-scare-zone",
      parkIds: ["orlando"],
    });

    // Deliberately short of a perfect 15, so a later re-rate can clearly
    // overtake it rather than tying and falling back to the name tie-break.
    await ratings.upsert(best.id, { theme: 5, fun: 5, fear: 4 });
    await ratings.upsert(middle.id, { theme: 3, fun: 3, fear: 3 });
    await ratings.upsert(worst.id, { theme: 1, fun: 1, fear: 1 });

    session.close();
    return { best: best.id, middle: middle.id, worst: worst.id, zone: zone.id };
  }

  /** Rebuilds the rows the Rankings page would render, straight from the database. */
  async function loadHouseRows(db: SqlExecutor): Promise<RankingRow[]> {
    const attractions = await createAttractionRepository(db).getAll();
    const years = await createEventYearRepository(db).getAll();
    const ratings = await createRatingRepository(db).getAll();
    const yearsById = new Map(years.map((year) => [year.id, year]));
    const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));

    return attractions
      .filter((attraction) => attraction.attractionType === "house")
      .map((attraction) => ({
        attraction,
        eventYear: yearsById.get(attraction.eventYearId) ?? null,
        rating: ratingByAttraction.get(attraction.id) ?? null,
      }));
  }

  it("a manual order is still there after the database is closed and reopened", async () => {
    const { best, middle, worst } = await seed();
    const scope = rankingGroupScope("houses");

    const first = restart();
    await createRankingRepository(first).setScope(scope, [worst, best, middle]);

    const second = restart();
    const entries = await createRankingRepository(second).getScope(scope);

    expect(entries.map((entry) => entry.attractionId)).toEqual([worst, best, middle]);
    expect(entries.map((entry) => entry.position)).toEqual([0, 1, 2]);
  });

  it("a manual order does not revert when the scores behind it change", async () => {
    const { best, middle, worst } = await seed();
    const scope = rankingGroupScope("houses");

    const first = restart();
    // The user ranks worst-first, deliberately against the scores.
    await createRankingRepository(first).setScope(scope, [worst, middle, best]);

    // Later, they re-rate the middle house to a perfect score, which would
    // put it top of the calculated order.
    const second = restart();
    await createRatingRepository(second).upsert(middle, { theme: 5, fun: 5, fear: 5 });

    const third = restart();
    const rows = await loadHouseRows(third);
    const orderedIds = (await createRankingRepository(third).getScope(scope)).map(
      (entry) => entry.attractionId,
    );

    const calculated = buildCalculatedRanking(rows);
    const manual = buildManualRanking(rows, orderedIds);

    // The calculated view reflects the new score...
    expect(calculated.ranked[0].attraction.id).toBe(middle);
    // ...while the user's own order is untouched by it.
    expect(manual.ranked.map((row) => row.attraction.id)).toEqual([worst, middle, best]);
  });

  it("an attraction rated after the ranking was saved stays out of it until it's added", async () => {
    const { best, middle, worst } = await seed();
    const scope = rankingGroupScope("houses");

    const first = restart();
    await createRankingRepository(first).setScope(scope, [best, middle]);

    // `worst` was already rated but never placed.
    const second = restart();
    const rows = await loadHouseRows(second);
    const orderedIds = (await createRankingRepository(second).getScope(scope)).map(
      (entry) => entry.attractionId,
    );

    const manual = buildManualRanking(rows, orderedIds);
    expect(manual.ranked.map((row) => row.attraction.id)).toEqual([best, middle]);
    expect(manual.unplaced.map((row) => row.attraction.id)).toEqual([worst]);

    // Adding it appends to the end of the saved order, and that survives too.
    const third = restart();
    await createRankingRepository(third).setScope(scope, [...orderedIds, worst]);

    const fourth = restart();
    const reloaded = (await createRankingRepository(fourth).getScope(scope)).map(
      (entry) => entry.attractionId,
    );
    expect(reloaded).toEqual([best, middle, worst]);
  });

  it("resetting to the calculated ranking clears it permanently", async () => {
    const { best, middle } = await seed();
    const scope = rankingGroupScope("houses");

    const first = restart();
    await createRankingRepository(first).setScope(scope, [middle, best]);

    const second = restart();
    await createRankingRepository(second).clearScope(scope);

    const third = restart();
    await expect(createRankingRepository(third).getScope(scope)).resolves.toEqual([]);
  });

  it("keeps each group's ranking independent of the others", async () => {
    const { best, middle, zone } = await seed();

    const first = restart();
    const rankings = createRankingRepository(first);
    await rankings.setScope(rankingGroupScope("houses"), [middle, best]);
    await rankings.setScope(rankingGroupScope("scare_zones"), [zone]);
    await rankings.setScope(rankingGroupScope("all"), [best, zone, middle]);

    const second = restart();
    const reloaded = createRankingRepository(second);

    expect(
      (await reloaded.getScope(rankingGroupScope("houses"))).map((e) => e.attractionId),
    ).toEqual([middle, best]);
    expect(
      (await reloaded.getScope(rankingGroupScope("scare_zones"))).map((e) => e.attractionId),
    ).toEqual([zone]);
    expect((await reloaded.getScope(rankingGroupScope("all"))).map((e) => e.attractionId)).toEqual([
      best,
      zone,
      middle,
    ]);
  });

  it("keeps each haunt's ranking independent of the others and of All Haunts", async () => {
    const { best, middle, zone } = await seed();

    const first = restart();
    const rankings = createRankingRepository(first);
    await rankings.setScope(rankingGroupScope("houses", "all"), [best, middle]);
    await rankings.setScope(rankingGroupScope("houses", "hhn"), [middle, best]);
    await rankings.setScope(rankingGroupScope("houses", "knotts-scary-farm"), [best]);
    await rankings.setScope(rankingGroupScope("scare_zones", "hhn"), [zone]);

    const second = restart();
    const reloaded = createRankingRepository(second);
    const idsIn = async (scope: string) =>
      (await reloaded.getScope(scope)).map((entry) => entry.attractionId);

    // Ranking one haunt's houses leaves the other haunt's list, and the All
    // Haunts list, exactly as they were.
    expect(await idsIn(rankingGroupScope("houses", "all"))).toEqual([best, middle]);
    expect(await idsIn(rankingGroupScope("houses", "hhn"))).toEqual([middle, best]);
    expect(await idsIn(rankingGroupScope("houses", "knotts-scary-farm"))).toEqual([best]);
    expect(await idsIn(rankingGroupScope("scare_zones", "hhn"))).toEqual([zone]);
    expect(await idsIn(rankingGroupScope("scare_zones", "knotts-scary-farm"))).toEqual([]);
  });

  it("leaves a ranking saved before there was a second haunt as the All Haunts list", async () => {
    // Existing installs hold rows under the unprefixed scopes. Those are
    // the All Haunts lists, not orphans to be migrated or dropped.
    expect(rankingGroupScope("houses", "all")).toBe("houses:all");
    expect(rankingGroupScope("all", "all")).toBe("attractions:all");
    expect(rankingGroupScope("houses", "hhn")).toBe("hhn:houses:all");

    const { best, middle } = await seed();
    const first = restart();
    await createRankingRepository(first).setScope("houses:all", [middle, best]);

    const second = restart();
    expect(
      (await createRankingRepository(second).getScope(rankingGroupScope("houses"))).map(
        (entry) => entry.attractionId,
      ),
    ).toEqual([middle, best]);
  });

  it("shares a scope with the attraction browser's Personal Ranking sort", async () => {
    // Both read the same saved order, so ranking houses on this page is what
    // the browser's "Personal Ranking" sort picks up.
    expect(rankingGroupScope("houses")).toBe(allTimeScope("house"));
    expect(rankingGroupScope("scare_zones")).toBe(allTimeScope("scare_zone"));

    const { best, middle } = await seed();
    const first = restart();
    await createRankingRepository(first).setScope(rankingGroupScope("houses"), [middle, best]);

    const second = restart();
    const viaBrowserScope = await createRankingRepository(second).getScope(allTimeScope("house"));
    expect(viaBrowserScope.map((entry) => entry.attractionId)).toEqual([middle, best]);
  });

  it("drops a deleted attraction from the saved order without disturbing the rest", async () => {
    const { best, middle, worst } = await seed();
    const scope = rankingGroupScope("houses");

    const first = restart();
    await createRankingRepository(first).setScope(scope, [worst, middle, best]);
    await first.execute("DELETE FROM attractions WHERE id = ?", [middle]);

    const second = restart();
    const entries = await createRankingRepository(second).getScope(scope);
    expect(entries.map((entry) => entry.attractionId)).toEqual([worst, best]);
  });
});
