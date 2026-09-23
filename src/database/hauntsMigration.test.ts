// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "./types";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";

/**
 * 0008 turns the archive into a two-haunt one, and 0009 applies the rule that
 * an HHN attraction running at both parks in the same season is a single
 * canonical record.
 *
 * Both run against databases that already hold archive data and someone's
 * ratings, because that is the only way they will ever run for real.
 */
describe("0008_haunts_and_seasons and 0009_merge_hhn_cross_park", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  async function seedSeason(id: string, year: number, name: string): Promise<void> {
    await db.execute("INSERT INTO event_years (id, calendar_year, name) VALUES (?, ?, ?)", [
      id,
      year,
      name,
    ]);
  }

  /**
   * A fixed timestamp, so nothing here can come to depend on insertion
   * order. Which record survives a merge is decided by the lowest id and
   * by nothing else — `a-hollywood` below, whichever order they went in.
   */
  const SEEDED_AT = "2024-01-01T00:00:00.000Z";

  async function seedAttraction(
    id: string,
    seasonId: string,
    name: string,
    park: string,
    overrides: { type?: string; slug?: string; overview?: string | null } = {},
  ): Promise<void> {
    await db.execute(
      `INSERT INTO attractions (
         id, event_year_id, attraction_type, name, slug, variant_name, full_overview, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        seasonId,
        overrides.type ?? "house",
        name,
        overrides.slug ?? id,
        park === "hollywood" ? "Hollywood version" : "Orlando version",
        overrides.overview ?? null,
        SEEDED_AT,
      ],
    );
    await db.execute("INSERT INTO attraction_parks (attraction_id, park_id) VALUES (?, ?)", [
      id,
      park,
    ]);
  }

  async function rows<T>(sql: string, args: unknown[] = []): Promise<T[]> {
    return db.select<T[]>(sql, args);
  }

  async function count(table: string, where = "1=1", args: unknown[] = []): Promise<number> {
    const result = await db.select<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`,
      args,
    );
    return result[0].count;
  }

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(7));

    await seedSeason("hhn-2024", 2024, "Halloween Horror Nights 2024");
    await seedSeason("hhn-2023", 2023, "Halloween Horror Nights 2023");

    // The same house at both parks in one season — the case the rule is about.
    await seedAttraction("a-orlando", "hhn-2024", "Insidious: The Further", "orlando", {
      overview: "The Orlando build ran in a soundstage.",
    });
    await seedAttraction("a-hollywood", "hhn-2024", "Insidious: The Further", "hollywood", {
      overview: "The Hollywood build ran in a tent and had an extra room.",
    });
  });

  describe("0008: the shape", () => {
    it("creates both haunts, with Knott's a first-class entry", async () => {
      migrateTo(8);

      const haunts = await rows<{ id: string; name: string; short_name: string }>(
        "SELECT id, name, short_name FROM haunts ORDER BY id",
      );
      expect(haunts).toEqual([
        { id: "hhn", name: "Halloween Horror Nights", short_name: "HHN" },
        { id: "knotts-scary-farm", name: "Knott's Scary Farm", short_name: "Knott's" },
      ]);
    });

    it("gives every existing season to HHN", async () => {
      migrateTo(8);

      expect(await count("event_years", "haunt_id = 'hhn'")).toBe(2);
      expect(await count("event_years", "haunt_id IS NULL")).toBe(0);
    });

    it("adds Knott's Berry Farm as a venue without disturbing the two parks", async () => {
      migrateTo(8);

      const venues = await rows<{ id: string; haunt_id: string }>(
        "SELECT id, haunt_id FROM parks ORDER BY id",
      );
      expect(venues).toEqual([
        { id: "hollywood", haunt_id: "hhn" },
        { id: "knotts-berry-farm", haunt_id: "knotts-scary-farm" },
        { id: "orlando", haunt_id: "hhn" },
      ]);
    });

    it("records each attraction's existing season as its first appearance", async () => {
      migrateTo(8);

      const appearances = await rows<{ attraction_id: string; season_id: string }>(
        "SELECT attraction_id, season_id FROM season_appearances ORDER BY attraction_id",
      );
      expect(appearances).toEqual([
        { attraction_id: "a-hollywood", season_id: "hhn-2024" },
        { attraction_id: "a-orlando", season_id: "hhn-2024" },
      ]);
    });

    it("leaves debut year unknown rather than inferring it from coverage", async () => {
      migrateTo(8);

      expect(await count("attractions", "debut_year IS NULL")).toBe(2);
    });

    it("accepts the new relation types and still rejects nonsense", async () => {
      migrateTo(8);

      await expect(
        db.execute(
          `INSERT INTO attraction_relations (id, attraction_id, related_attraction_id, relation_type)
           VALUES ('r1', 'a-orlando', 'a-hollywood', 'reimagining_of')`,
        ),
      ).resolves.toBeDefined();

      await expect(
        db.execute(
          `INSERT INTO attraction_relations (id, attraction_id, related_attraction_id, relation_type)
           VALUES ('r2', 'a-orlando', 'a-hollywood', 'vaguely_like')`,
        ),
      ).rejects.toThrow(/CHECK constraint failed/i);
    });

    it("lets a haunt hold its own logo, and still refuses two owners at once", async () => {
      migrateTo(8);

      await expect(
        db.execute(
          `INSERT INTO media (id, haunt_id, media_type, url) VALUES ('m1', 'hhn', 'logo', 'https://example.invalid/l.png')`,
        ),
      ).resolves.toBeDefined();

      await expect(
        db.execute(
          `INSERT INTO media (id, haunt_id, attraction_id, media_type, url)
           VALUES ('m2', 'hhn', 'a-orlando', 'logo', 'https://example.invalid/l.png')`,
        ),
      ).rejects.toThrow(/CHECK constraint failed/i);
    });
  });

  describe("0009: the cross-park merge", () => {
    it("makes one canonical attraction carrying both venues", async () => {
      migrateTo(8);
      migrateTo(9);

      const attractions = await rows<{ id: string; name: string; variant_name: string | null }>(
        "SELECT id, name, variant_name FROM attractions",
      );
      expect(attractions).toEqual([
        { id: "a-hollywood", name: "Insidious: The Further", variant_name: null },
      ]);

      const venues = await rows<{ park_id: string }>(
        "SELECT park_id FROM attraction_parks WHERE attraction_id = 'a-hollywood' ORDER BY park_id",
      );
      expect(venues.map((row) => row.park_id)).toEqual(["hollywood", "orlando"]);
    });

    it("picks the survivor by id, not by which record was written first", async () => {
      // The Orlando record was inserted first, so an "oldest wins" rule
      // would keep it — and would keep the other one on a machine where
      // both landed in the same instant. The lowest id decides, so every
      // install merges this pair into the same record.
      migrateTo(8);
      migrateTo(9);

      const surviving = await rows<{ id: string }>("SELECT id FROM attractions");
      expect(surviving).toEqual([{ id: "a-hollywood" }]);
    });

    it("keeps what differed between the parks as venue sections", async () => {
      migrateTo(8);
      migrateTo(9);

      const sections = await rows<{ venue_id: string; overview: string }>(
        "SELECT venue_id, overview FROM attraction_venue_wiki ORDER BY venue_id",
      );
      expect(sections).toEqual([
        {
          venue_id: "hollywood",
          overview: "The Hollywood build ran in a tent and had an extra room.",
        },
        { venue_id: "orlando", overview: "The Orlando build ran in a soundstage." },
      ]);
    });

    it("carries the user's rating, note and ranking to the canonical record", async () => {
      await db.execute(
        "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt1', 'a-orlando', 4.5, 4, 3)",
      );
      await db.execute(
        "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', 'a-orlando', 'Best of the year.')",
      );
      await db.execute(
        "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k1', 'houses:all', 'a-orlando', 0)",
      );

      migrateTo(8);
      migrateTo(9);

      const rating = await rows<{ attraction_id: string; total: number }>(
        "SELECT attraction_id, total FROM user_ratings",
      );
      const note = await rows<{ attraction_id: string; note: string }>(
        "SELECT attraction_id, note FROM user_notes",
      );
      const ranking = await rows<{ attraction_id: string; position: number }>(
        "SELECT attraction_id, position FROM user_rankings",
      );

      expect(rating).toEqual([{ attraction_id: "a-hollywood", total: 11.5 }]);
      expect(note).toEqual([{ attraction_id: "a-hollywood", note: "Best of the year." }]);
      expect(ranking).toEqual([{ attraction_id: "a-hollywood", position: 0 }]);
    });

    it("moves characters, media and citations with it", async () => {
      await db.execute(
        "INSERT INTO characters (id, attraction_id, name) VALUES ('c1', 'a-orlando', 'The Bride')",
      );
      await db.execute(
        "INSERT INTO media (id, attraction_id, media_type, url) VALUES ('m1', 'a-orlando', 'poster', 'https://example.invalid/p.jpg')",
      );
      await db.execute(
        "INSERT INTO sources (id, source_type, title) VALUES ('s1', 'article', 'A piece')",
      );
      await db.execute(
        "INSERT INTO attraction_sources (attraction_id, source_id) VALUES ('a-orlando', 's1')",
      );

      migrateTo(8);
      migrateTo(9);

      expect(await count("characters", "attraction_id = 'a-hollywood'")).toBe(1);
      expect(await count("media", "attraction_id = 'a-hollywood'")).toBe(1);
      expect(await count("attraction_sources", "attraction_id = 'a-hollywood'")).toBe(1);
    });

    it("records what it merged", async () => {
      migrateTo(8);
      migrateTo(9);

      const merged = await rows<{ subject_id: string; other_id: string; kind: string }>(
        "SELECT subject_id, other_id, kind FROM migration_conflicts WHERE kind = 'cross_park_merged'",
      );
      expect(merged).toEqual([
        { subject_id: "a-orlando", other_id: "a-hollywood", kind: "cross_park_merged" },
      ]);
    });
  });

  describe("0009: what it refuses to merge", () => {
    it("stops when both records carry a rating, and keeps both", async () => {
      await db.execute(
        "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt1', 'a-orlando', 5, 5, 5)",
      );
      await db.execute(
        "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt2', 'a-hollywood', 1, 1, 1)",
      );

      migrateTo(8);
      migrateTo(9);

      expect(await count("attractions")).toBe(2);
      expect(await count("user_ratings")).toBe(2);

      const conflicts = await rows<{ kind: string; detail: string }>(
        "SELECT kind, detail FROM migration_conflicts WHERE kind = 'cross_park_personal_data'",
      );
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].detail).toMatch(/both hold personal data/);
      expect(conflicts[0].detail).toMatch(/left exactly as they are/);
    });

    it("stops when both records carry a note", async () => {
      await db.execute(
        "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', 'a-orlando', 'Mine.')",
      );
      await db.execute(
        "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n2', 'a-hollywood', 'Also mine.')",
      );

      migrateTo(8);
      migrateTo(9);

      expect(await count("attractions")).toBe(2);
      expect(await count("user_notes")).toBe(2);
      expect(await count("migration_conflicts", "kind = 'cross_park_personal_data'")).toBe(1);
    });

    it("never merges the same name across different seasons", async () => {
      await seedAttraction("b-2023", "hhn-2023", "Insidious: The Further", "orlando");

      migrateTo(8);
      migrateTo(9);

      const remaining = await rows<{ id: string; event_year_id: string }>(
        "SELECT id, event_year_id FROM attractions ORDER BY id",
      );
      expect(remaining).toEqual([
        { id: "a-hollywood", event_year_id: "hhn-2024" },
        { id: "b-2023", event_year_id: "hhn-2023" },
      ]);
    });

    it("never merges different titles that share a franchise", async () => {
      await seedAttraction("c-1", "hhn-2023", "Halloween", "orlando");
      await seedAttraction(
        "c-2",
        "hhn-2023",
        "Halloween 4: The Return of Michael Myers",
        "hollywood",
      );

      migrateTo(8);
      migrateTo(9);

      expect(await count("attractions", "id IN ('c-1', 'c-2')")).toBe(2);
    });

    it("never merges a house with a scare zone of the same name", async () => {
      await seedAttraction("d-1", "hhn-2023", "Twisted Tradition", "orlando");
      await seedAttraction("d-2", "hhn-2023", "Twisted Tradition", "hollywood", {
        type: "scare_zone",
      });

      migrateTo(8);
      migrateTo(9);

      expect(await count("attractions", "id IN ('d-1', 'd-2')")).toBe(2);
    });

    it("leaves another haunt's seasons alone", async () => {
      migrateTo(8);
      await db.execute(
        "INSERT INTO event_years (id, calendar_year, name, haunt_id) VALUES ('ksf-2024', 2024, 'Knott''s Scary Farm 2024', 'knotts-scary-farm')",
      );
      await db.execute(
        `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
         VALUES ('k-1', 'ksf-2024', 'house', 'Insidious: The Further', 'k-1')`,
      );
      migrateTo(9);

      expect(await count("attractions", "id = 'k-1'")).toBe(1);
    });
  });

  describe("0009: normalising names", () => {
    it("treats casing and stray spaces as the same name", async () => {
      await seedAttraction("e-1", "hhn-2023", "The  Quarry ", "orlando");
      await seedAttraction("e-2", "hhn-2023", "the quarry", "hollywood");

      migrateTo(8);
      migrateTo(9);

      expect(await count("attractions", "id IN ('e-1', 'e-2')")).toBe(1);
    });
  });
});
