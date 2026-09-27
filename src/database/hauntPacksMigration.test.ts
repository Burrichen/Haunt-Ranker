// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "./types";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";

/**
 * 0010 turns everything the source code knew about a haunt — its name, its
 * accent, its venues, its word for a walk-through — into rows, so a haunt
 * nobody has written code for can arrive as data.
 *
 * It does that by rebuilding `attractions`, which is the part worth
 * testing: a rebuild that dropped a rating would be a far worse bug than
 * anything the feature is for.
 */
describe("0010_haunt_packs", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  async function rows<T>(sql: string, args: unknown[] = []): Promise<T[]> {
    return db.select<T[]>(sql, args);
  }

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(9));

    await db.execute(
      `INSERT INTO event_years (id, haunt_id, calendar_year, name)
       VALUES ('hhn-2024', 'hhn', 2024, 'Halloween Horror Nights 2024')`,
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug, full_overview)
       VALUES ('a1', 'hhn-2024', 'house', 'The Quarry', 'the-quarry', 'A long drop.')`,
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
       VALUES ('z1', 'hhn-2024', 'scare_zone', 'Dead Man''s Wharf', 'dead-mans-wharf')`,
    );
    await db.execute(
      "INSERT INTO attraction_parks (attraction_id, park_id) VALUES ('a1', 'orlando')",
    );
    await db.execute(
      "INSERT INTO season_appearances (attraction_id, season_id) VALUES ('a1', 'hhn-2024')",
    );
    await db.execute(
      "INSERT INTO characters (id, attraction_id, name) VALUES ('c1', 'a1', 'The Foreman')",
    );
    await db.execute(
      `INSERT INTO sources (id, source_type, title) VALUES ('s1', 'youtube', 'A walkthrough')`,
    );
    await db.execute(
      "INSERT INTO attraction_sources (attraction_id, source_id, venue_id) VALUES ('a1', 's1', 'orlando')",
    );
    await db.execute(
      `INSERT INTO media (id, attraction_id, media_type, url, distribution)
       VALUES ('m1', 'a1', 'poster', 'https://example.invalid/p.jpg', 'reference')`,
    );
    await db.execute(
      `INSERT INTO attraction_venue_wiki (attraction_id, venue_id, experience_description)
       VALUES ('a1', 'orlando', 'The Orlando build added a room.')`,
    );
    await db.execute(
      `INSERT INTO attraction_relations (id, attraction_id, related_attraction_id, relation_type)
       VALUES ('r1', 'a1', 'z1', 'same_franchise')`,
    );

    // The things a rebuild must not cost anyone.
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt1', 'a1', 4.5, 4, 3)",
    );
    await db.execute(
      "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', 'a1', 'Best of the year.')",
    );
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k1', 'houses:all', 'a1', 0)",
    );
  });

  it("keeps every rating, note and ranking position through the rebuild", async () => {
    migrateTo(10);

    expect(await rows("SELECT attraction_id, total FROM user_ratings")).toEqual([
      { attraction_id: "a1", total: 11.5 },
    ]);
    expect(await rows("SELECT attraction_id, note FROM user_notes")).toEqual([
      { attraction_id: "a1", note: "Best of the year." },
    ]);
    expect(await rows("SELECT attraction_id, position FROM user_rankings")).toEqual([
      { attraction_id: "a1", position: 0 },
    ]);
  });

  it("keeps everything else that hangs off an attraction", async () => {
    migrateTo(10);

    expect(await rows("SELECT park_id FROM attraction_parks")).toEqual([{ park_id: "orlando" }]);
    expect(await rows("SELECT season_id FROM season_appearances")).toEqual([
      { season_id: "hhn-2024" },
    ]);
    expect(await rows("SELECT name FROM characters")).toEqual([{ name: "The Foreman" }]);
    expect(await rows("SELECT venue_id FROM attraction_sources")).toEqual([
      { venue_id: "orlando" },
    ]);
    expect(await rows("SELECT id FROM media")).toEqual([{ id: "m1" }]);
    expect(await rows("SELECT venue_id FROM attraction_venue_wiki")).toEqual([
      { venue_id: "orlando" },
    ]);
    expect(await rows("SELECT relation_type FROM attraction_relations")).toEqual([
      { relation_type: "same_franchise" },
    ]);
    expect(await rows("SELECT full_overview FROM attractions WHERE id = 'a1'")).toEqual([
      { full_overview: "A long drop." },
    ]);
  });

  it("gives each haunt its own word for its experiences", async () => {
    migrateTo(10);

    const types = await rows<{ haunt_id: string; category: string; label_many: string }>(
      "SELECT haunt_id, category, label_many FROM experience_types ORDER BY haunt_id, sort_order",
    );

    expect(types).toEqual([
      { haunt_id: "hhn", category: "walkthrough", label_many: "Houses" },
      { haunt_id: "hhn", category: "scare_zone", label_many: "Scare Zones" },
      { haunt_id: "knotts-scary-farm", category: "walkthrough", label_many: "Mazes" },
      { haunt_id: "knotts-scary-farm", category: "scare_zone", label_many: "Scare Zones" },
    ]);
  });

  it("points existing records at their haunt's own type", async () => {
    migrateTo(10);

    expect(await rows("SELECT experience_type_id FROM attractions ORDER BY id")).toEqual([
      { experience_type_id: "hhn:type:house" },
      { experience_type_id: "hhn:type:scare-zone" },
    ]);
  });

  it("accepts a kind of experience that is neither a house nor a scare zone", async () => {
    migrateTo(10);

    await db.execute(
      `INSERT INTO experience_types (id, haunt_id, category, label_one, label_many)
       VALUES ('hhn:type:show', 'hhn', 'show', 'Show', 'Shows')`,
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, experience_type_id, name, slug)
       VALUES ('s2', 'hhn-2024', 'show', 'hhn:type:show', 'Academy of Villains', 'academy')`,
    );

    expect(await rows("SELECT attraction_type FROM attractions WHERE id = 's2'")).toEqual([
      { attraction_type: "show" },
    ]);
    await expect(
      db.execute(
        `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
         VALUES ('x1', 'hhn-2024', 'parade', 'Not A Category', 'not-a-category')`,
      ),
    ).rejects.toThrow();
  });

  it("gives the haunts their presentation, and somewhere to record a pack", async () => {
    migrateTo(10);

    const haunts = await rows<{ id: string; accent: string; sort_order: number }>(
      "SELECT id, accent, sort_order FROM haunts ORDER BY sort_order",
    );
    expect(haunts).toEqual([
      { id: "hhn", accent: "orange", sort_order: 0 },
      { id: "knotts-scary-farm", accent: "purple", sort_order: 10 },
    ]);

    const venues = await rows("SELECT id, icon FROM parks ORDER BY sort_order");
    expect(venues).toEqual([
      { id: "hollywood", icon: "star" },
      { id: "orlando", icon: "palm" },
      { id: "knotts-berry-farm", icon: "ferris-wheel" },
    ]);

    // Nothing has been imported yet, and the record of imports is empty
    // rather than absent.
    expect(await rows("SELECT COUNT(*) as count FROM haunt_packs")).toEqual([{ count: 0 }]);
  });
});
