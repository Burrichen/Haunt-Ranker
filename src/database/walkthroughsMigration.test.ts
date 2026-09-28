// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";
import type { SqlExecutor } from "./types";

/**
 * 0014 takes scare zones, shows and every other non-walk-through record out
 * of the archive, after moving what the person wrote about them into
 * `legacy_personal_data`. The whole-archive behaviour, and the backup
 * upgrade that does the same to an older file, are checked against the
 * real HHN archive in hhnMigrationRegression.test.ts; these are the edges.
 */
describe("0014_walkthroughs_only", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  const ids = async (sql: string) =>
    (await db.select<Array<{ id: string }>>(sql)).map((row) => row.id);

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(13));
    await db.execute(
      `INSERT INTO event_years (id, haunt_id, calendar_year, name) VALUES
         ('hhn-2024', 'hhn', 2024, 'Halloween Horror Nights 2024'),
         ('ksf-2024', 'knotts-scary-farm', 2024, 'Knott''s Scary Farm 2024')`,
    );
    await db.execute(
      `INSERT INTO experience_types (id, haunt_id, category, label_one, label_many) VALUES
         ('ksf:type:show', 'knotts-scary-farm', 'show', 'Show', 'Shows')`,
    );
    for (const [id, season, type, typeId] of [
      ["h1", "hhn-2024", "house", "hhn:type:house"],
      ["h2", "hhn-2024", "house", "hhn:type:house"],
      ["z1", "hhn-2024", "scare_zone", "hhn:type:scare-zone"],
      ["m1", "ksf-2024", "house", "knotts-scary-farm:type:maze"],
      ["s1", "ksf-2024", "show", "ksf:type:show"],
    ]) {
      await db.execute(
        `INSERT INTO attractions (id, event_year_id, attraction_type, experience_type_id, name, slug)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, season, type, typeId, `Name ${id}`, id],
      );
      await db.execute("INSERT INTO attraction_parks (attraction_id, park_id) VALUES (?, ?)", [
        id,
        season === "hhn-2024" ? "orlando" : "knotts-berry-farm",
      ]);
    }
  });

  it("removes every record that isn't a walk-through, and nothing else", async () => {
    migrateTo(14);

    expect(await ids("SELECT id FROM attractions ORDER BY id")).toEqual(["h1", "h2", "m1"]);
    expect(await ids("SELECT attraction_id AS id FROM attraction_parks ORDER BY id")).toEqual([
      "h1",
      "h2",
      "m1",
    ]);
  });

  it("removes the vocabulary for the retired categories", async () => {
    migrateTo(14);

    expect(await ids("SELECT id FROM experience_types ORDER BY id")).toEqual([
      "hhn:type:house",
      "knotts-scary-farm:type:maze",
    ]);
  });

  it("preserves a zone's rating, note and ranking positions whole", async () => {
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear, created_at, updated_at) VALUES ('r-z1', 'z1', 1, 2.5, 3, '2026-01-01', '2026-01-02')",
    );
    await db.execute(
      "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n-z1', 'z1', 'Foggy.')",
    );
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k-z1', 'hhn:scare_zones:all', 'z1', 0)",
    );

    migrateTo(14);

    expect(await db.select("SELECT COUNT(*) AS count FROM user_ratings")).toEqual([{ count: 0 }]);
    const legacy = await db.select<Array<Record<string, unknown>>>(
      `SELECT id, kind, original_id, attraction_id, attraction_name, attraction_type,
              haunt_id, season_id, calendar_year, payload, reason
       FROM legacy_personal_data ORDER BY id`,
    );
    expect(legacy.map((row) => row.id)).toEqual(["note:n-z1", "ranking:k-z1", "rating:r-z1"]);
    expect(legacy[2]).toMatchObject({
      kind: "rating",
      original_id: "r-z1",
      attraction_id: "z1",
      attraction_name: "Name z1",
      attraction_type: "scare_zone",
      haunt_id: "hhn",
      season_id: "hhn-2024",
      calendar_year: 2024,
      reason: "retired-category",
    });
    expect(JSON.parse(String(legacy[2].payload))).toEqual({
      id: "r-z1",
      attraction_id: "z1",
      theme: 1,
      fun: 2.5,
      fear: 3,
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    });
    expect(JSON.parse(String(legacy[0].payload)).note).toBe("Foggy.");
    expect(JSON.parse(String(legacy[1].payload)).scope).toBe("hhn:scare_zones:all");
  });

  it("leaves every walk-through rating, note and ranking exactly where it was", async () => {
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('r-h1', 'h1', 4, 4, 4)",
    );
    await db.execute(
      "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n-m1', 'm1', 'Great.')",
    );
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k-h1', 'hhn:houses:all', 'h1', 0)",
    );

    migrateTo(14);

    expect(await db.select("SELECT id, attraction_id, total FROM user_ratings")).toEqual([
      { id: "r-h1", attraction_id: "h1", total: 12 },
    ]);
    expect(await db.select("SELECT id, note FROM user_notes")).toEqual([
      { id: "n-m1", note: "Great." },
    ]);
    expect(await ids("SELECT id FROM user_rankings")).toEqual(["k-h1"]);
    expect(await db.select("SELECT COUNT(*) AS count FROM legacy_personal_data")).toEqual([
      { count: 0 },
    ]);
  });

  it("gives an All Attractions order a houses-only copy where no house list exists", async () => {
    for (const [id, position] of [
      ["h2", 0],
      ["z1", 1],
      ["h1", 5],
    ] as const) {
      await db.execute(
        "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES (?, 'hhn:attractions:all', ?, ?)",
        [`all-${id}`, id, position],
      );
    }

    migrateTo(14);

    expect(
      await db.select(
        "SELECT attraction_id, position FROM user_rankings WHERE scope = 'hhn:houses:all' ORDER BY position",
      ),
    ).toEqual([
      { attraction_id: "h2", position: 0 },
      { attraction_id: "h1", position: 1 },
    ]);
    // The All Attractions rows themselves stay, less the zone.
    expect(
      await ids(
        "SELECT attraction_id AS id FROM user_rankings WHERE scope = 'hhn:attractions:all' ORDER BY position",
      ),
    ).toEqual(["h2", "h1"]);
  });

  it("never overwrites a house list the person already made", async () => {
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('mine', 'houses:all', 'h1', 0)",
    );
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('all-h2', 'attractions:all', 'h2', 0)",
    );

    migrateTo(14);

    expect(
      await ids("SELECT attraction_id AS id FROM user_rankings WHERE scope = 'houses:all'"),
    ).toEqual(["h1"]);
  });

  it("drops a source only a retired record cited, and keeps a shared one", async () => {
    await db.execute(
      `INSERT INTO sources (id, source_type, title) VALUES
         ('only-zone', 'article', 'Zone only'),
         ('shared', 'article', 'Both'),
         ('season', 'article', 'Season and zone'),
         ('unused', 'article', 'Cited by nothing, before or after')`,
    );
    for (const [attraction, source] of [
      ["z1", "only-zone"],
      ["z1", "shared"],
      ["h1", "shared"],
      ["s1", "season"],
    ]) {
      await db.execute("INSERT INTO attraction_sources (attraction_id, source_id) VALUES (?, ?)", [
        attraction,
        source,
      ]);
    }
    await db.execute(
      "INSERT INTO event_year_sources (event_year_id, source_id) VALUES ('ksf-2024', 'season')",
    );

    migrateTo(14);

    // A source nothing cited before the migration isn't this migration's to remove.
    expect(await ids("SELECT id FROM sources ORDER BY id")).toEqual(["season", "shared", "unused"]);
  });

  it("removes what belonged to a retired record: characters, media, relations, appearances", async () => {
    await db.execute("INSERT INTO characters (id, attraction_id, name) VALUES ('c1', 'z1', 'Fog')");
    await db.execute(
      "INSERT INTO characters (id, attraction_id, name) VALUES ('c2', 'h1', 'Host')",
    );
    await db.execute(
      "INSERT INTO media (id, attraction_id, media_type, url, distribution) VALUES ('md1', 's1', 'poster', 'https://example.invalid/a.jpg', 'reference')",
    );
    await db.execute(
      "INSERT INTO attraction_relations (id, attraction_id, related_attraction_id, relation_type) VALUES ('rel1', 'h1', 'z1', 'related_concept')",
    );
    await db.execute(
      "INSERT OR IGNORE INTO season_appearances (attraction_id, season_id) VALUES ('z1', 'hhn-2024'), ('h1', 'hhn-2024')",
    );

    migrateTo(14);

    expect(await ids("SELECT id FROM characters")).toEqual(["c2"]);
    expect(await ids("SELECT id FROM media")).toEqual([]);
    expect(await ids("SELECT id FROM attraction_relations")).toEqual([]);
    expect(await ids("SELECT attraction_id AS id FROM season_appearances")).toEqual(["h1"]);
  });
});
