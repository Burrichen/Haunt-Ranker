// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { copyHhnRankingScopes } from "../backup/hhnBackupUpgrades";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";
import type { SqlExecutor } from "./types";

/**
 * 0012 gives HHN its own copy of the rankings saved before there was a
 * second haunt, and `copyHhnRankingScopes` does the same to an older backup.
 * The whole-archive behaviour is in hhnMigrationRegression.test.ts; these
 * are the edges.
 */
describe("0012_hhn_ranking_scopes", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  async function scope(name: string) {
    return db.select<Array<{ attraction_id: string; position: number }>>(
      "SELECT attraction_id, position FROM user_rankings WHERE scope = ? ORDER BY position",
      [name],
    );
  }

  async function rank(name: string, ids: string[], positions = ids.map((_, i) => i)) {
    for (const [index, id] of ids.entries()) {
      await db.execute(
        "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES (?, ?, ?, ?)",
        [`${name}-${id}`, name, id, positions[index]],
      );
    }
  }

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(11));
    await db.execute(
      `INSERT INTO event_years (id, haunt_id, calendar_year, name) VALUES
         ('hhn-2024', 'hhn', 2024, 'Halloween Horror Nights 2024'),
         ('ksf-2024', 'knotts-scary-farm', 2024, 'Knott''s Scary Farm 2024')`,
    );
    for (const [id, season, type] of [
      ["h1", "hhn-2024", "house"],
      ["h2", "hhn-2024", "house"],
      ["h3", "hhn-2024", "house"],
      ["z1", "hhn-2024", "scare_zone"],
      ["k1", "ksf-2024", "house"],
    ]) {
      await db.execute(
        "INSERT INTO attractions (id, event_year_id, attraction_type, name, slug) VALUES (?, ?, ?, ?, ?)",
        [id, season, type, id, id],
      );
    }
  });

  it("copies each saved list to HHN's own, in the same order", async () => {
    await rank("houses:all", ["h3", "h1", "h2"]);
    await rank("scare_zones:all", ["z1"]);

    migrateTo(12);

    expect(await scope("hhn:houses:all")).toEqual([
      { attraction_id: "h3", position: 0 },
      { attraction_id: "h1", position: 1 },
      { attraction_id: "h2", position: 2 },
    ]);
    expect(await scope("hhn:scare_zones:all")).toEqual([{ attraction_id: "z1", position: 0 }]);
  });

  it("keeps only HHN's attractions, and closes the gaps they leave", async () => {
    await rank("attractions:all", ["h2", "k1", "z1"], [0, 3, 7]);

    migrateTo(12);

    expect(await scope("hhn:attractions:all")).toEqual([
      { attraction_id: "h2", position: 0 },
      { attraction_id: "z1", position: 1 },
    ]);
  });

  it("leaves the All Haunts list exactly as it was", async () => {
    await rank("attractions:all", ["h2", "k1", "z1"], [0, 3, 7]);

    migrateTo(12);

    expect(await scope("attractions:all")).toEqual([
      { attraction_id: "h2", position: 0 },
      { attraction_id: "k1", position: 3 },
      { attraction_id: "z1", position: 7 },
    ]);
  });

  it("never replaces a list someone has since made on the HHN view", async () => {
    await rank("houses:all", ["h1", "h2", "h3"]);
    await rank("hhn:houses:all", ["h2"]);

    migrateTo(12);

    expect(await scope("hhn:houses:all")).toEqual([{ attraction_id: "h2", position: 0 }]);
  });

  it("does nothing when nothing was ranked", async () => {
    migrateTo(12);

    expect(await db.select("SELECT COUNT(*) AS count FROM user_rankings")).toEqual([{ count: 0 }]);
  });
});

describe("copyHhnRankingScopes (the same rule, for an older backup)", () => {
  const data = {
    eventYears: [
      { id: "hhn-2024", haunt_id: "hhn" },
      { id: "ksf-2024", haunt_id: "knotts-scary-farm" },
    ],
    attractions: [
      { id: "h1", event_year_id: "hhn-2024" },
      { id: "h2", event_year_id: "hhn-2024" },
      { id: "k1", event_year_id: "ksf-2024" },
    ],
  };
  const row = (scope: string, id: string, position: number) => ({
    id: `${scope}-${id}`,
    scope,
    attraction_id: id,
    position,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  });

  it("adds HHN's copy, HHN only, dense, and keeps the original", () => {
    const rankings = [
      row("houses:all", "h2", 0),
      row("houses:all", "k1", 1),
      row("houses:all", "h1", 4),
    ];

    const result = copyHhnRankingScopes({ ...data, rankings }).rankings as Array<
      Record<string, unknown>
    >;

    expect(result.slice(0, 3)).toEqual(rankings);
    expect(
      result
        .slice(3)
        .map(({ scope, attraction_id, position }) => ({ scope, attraction_id, position })),
    ).toEqual([
      { scope: "hhn:houses:all", attraction_id: "h2", position: 0 },
      { scope: "hhn:houses:all", attraction_id: "h1", position: 1 },
    ]);
  });

  it("leaves a backup that already has HHN's list alone", () => {
    const input = {
      ...data,
      rankings: [row("houses:all", "h1", 0), row("hhn:houses:all", "h2", 0)],
    };

    expect(copyHhnRankingScopes(input)).toBe(input);
  });
});
