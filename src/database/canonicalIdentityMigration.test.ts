// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createRankingRepository } from "../repositories/rankingRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { createNoteRepository } from "../repositories/noteRepository";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";
import type { SqlExecutor } from "./types";

/**
 * 0015 applies the two permanent identity rules: one HHN record per name
 * per season (across parks), and one Knott's record per maze (across
 * seasons). Personal data is never dropped — a clash stops the merge and is
 * recorded instead.
 */
describe("0015_canonical_identity", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  const all = <T>(sql: string, params: unknown[] = []) => db.select<T[]>(sql, params);
  const ids = async (sql: string, params: unknown[] = []) =>
    (await all<{ id: string }>(sql, params)).map((row) => row.id);

  async function house(
    id: string,
    season: string,
    name: string,
    parks: string[],
    extra: { debut?: number; overview?: string } = {},
  ) {
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug, debut_year, full_overview, created_at, updated_at)
       VALUES (?, ?, 'house', ?, ?, ?, ?, '2026-01-01', '2026-01-01')`,
      [id, season, name, id, extra.debut ?? null, extra.overview ?? null],
    );
    for (const park of parks) {
      await db.execute("INSERT INTO attraction_parks (attraction_id, park_id) VALUES (?, ?)", [
        id,
        park,
      ]);
    }
    await db.execute("INSERT INTO season_appearances (attraction_id, season_id) VALUES (?, ?)", [
      id,
      season,
    ]);
  }

  const rate = (id: string, attraction: string) =>
    db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES (?, ?, 4, 3.5, 2)",
      [id, attraction],
    );
  const note = (id: string, attraction: string, text: string) =>
    db.execute("INSERT INTO user_notes (id, attraction_id, note) VALUES (?, ?, ?)", [
      id,
      attraction,
      text,
    ]);
  const rank = (id: string, scope: string, attraction: string, position: number) =>
    db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES (?, ?, ?, ?)",
      [id, scope, attraction, position],
    );

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(14));
    await db.execute(
      `INSERT INTO event_years (id, haunt_id, calendar_year, name) VALUES
         ('hhn-2019', 'hhn', 2019, 'Halloween Horror Nights 2019'),
         ('hhn-2023', 'hhn', 2023, 'Halloween Horror Nights 2023'),
         ('ksf-2023', 'knotts-scary-farm', 2023, 'Knott''s Scary Farm 2023'),
         ('ksf-2024', 'knotts-scary-farm', 2024, 'Knott''s Scary Farm 2024'),
         ('ksf-2025', 'knotts-scary-farm', 2025, 'Knott''s Scary Farm 2025'),
         ('ksf-2026', 'knotts-scary-farm', 2026, 'Knott''s Scary Farm 2026')`,
    );
  });

  describe("HHN: same name, same season, both parks", () => {
    beforeEach(async () => {
      await house("hhn-2023-stranger-hollywood", "hhn-2023", "Stranger Things", ["hollywood"], {
        overview: "Hollywood ran it on the lot.",
      });
      await house("hhn-2023-stranger-orlando", "hhn-2023", "  stranger   THINGS ", ["orlando"], {
        overview: "Orlando's had an extra room.",
      });
    });

    it("becomes 1 canonical attraction with 2 venues, 1 review and 1 ranking identity", async () => {
      await rate("r1", "hhn-2023-stranger-orlando");
      await note("n1", "hhn-2023-stranger-hollywood", "Best facade of the year.");
      await rank("k1", "hhn:houses:all", "hhn-2023-stranger-orlando", 0);
      await rank("k2", "houses:all", "hhn-2023-stranger-hollywood", 3);

      migrateTo(15);

      const canonical = "hhn-2023-stranger-hollywood";
      expect(await ids("SELECT id FROM attractions")).toEqual([canonical]);
      expect(
        await ids("SELECT park_id AS id FROM attraction_parks WHERE attraction_id = ? ORDER BY 1", [
          canonical,
        ]),
      ).toEqual(["hollywood", "orlando"]);

      // One review identity: the rating and the note both answer for the one record.
      expect((await createRatingRepository(db).getAll()).map((r) => r.attractionId)).toEqual([
        canonical,
      ]);
      expect((await createNoteRepository(db).getForAttraction(canonical))?.note).toBe(
        "Best facade of the year.",
      );

      // One ranking identity: one entry per list, and every list kept its place.
      const rankings = createRankingRepository(db);
      expect((await rankings.getScope("hhn:houses:all")).map((e) => e.attractionId)).toEqual([
        canonical,
      ]);
      expect(await rankings.getPosition("houses:all", canonical)).toBe(3);
    });

    it("keeps each park's prose as a venue section", async () => {
      migrateTo(15);

      const sections = await all<{ venue_id: string; overview: string }>(
        "SELECT venue_id, overview FROM attraction_venue_wiki ORDER BY venue_id",
      );
      expect(sections).toEqual([
        { venue_id: "hollywood", overview: "Hollywood ran it on the lot." },
        { venue_id: "orlando", overview: "Orlando's had an extra room." },
      ]);
    });

    it("records the merge", async () => {
      migrateTo(15);

      expect(await all("SELECT kind, subject_id, other_id FROM migration_conflicts")).toEqual([
        {
          kind: "cross_park_merged",
          subject_id: "hhn-2023-stranger-orlando",
          other_id: "hhn-2023-stranger-hollywood",
        },
      ]);
    });

    it("does not merge, and flags it, when both records are rated", async () => {
      await rate("r1", "hhn-2023-stranger-hollywood");
      await rate("r2", "hhn-2023-stranger-orlando");

      migrateTo(15);

      expect(await ids("SELECT id FROM attractions ORDER BY id")).toHaveLength(2);
      expect(await ids("SELECT id FROM user_ratings ORDER BY id")).toEqual(["r1", "r2"]);
      expect(await all("SELECT kind, subject_id FROM migration_conflicts")).toEqual([
        { kind: "canonical_personal_data", subject_id: "hhn-2023-stranger-orlando" },
      ]);
    });

    it("does not merge when both records hold a place in the same ranking list", async () => {
      await rank("k1", "hhn:houses:all", "hhn-2023-stranger-hollywood", 0);
      await rank("k2", "hhn:houses:all", "hhn-2023-stranger-orlando", 1);

      migrateTo(15);

      expect(await ids("SELECT id FROM attractions")).toHaveLength(2);
      expect(await ids("SELECT id FROM user_rankings ORDER BY id")).toEqual(["k1", "k2"]);
      expect(await ids("SELECT kind AS id FROM migration_conflicts")).toEqual([
        "canonical_personal_data",
      ]);
    });
  });

  describe("HHN: what is never merged", () => {
    it("leaves a name reused in a different season alone", async () => {
      await house("hhn-2019-ghostbusters", "hhn-2019", "Ghostbusters", ["orlando"]);
      await house("hhn-2023-ghostbusters", "hhn-2023", "Ghostbusters", ["hollywood"]);

      migrateTo(15);

      expect(await ids("SELECT id FROM attractions ORDER BY id")).toEqual([
        "hhn-2019-ghostbusters",
        "hhn-2023-ghostbusters",
      ]);
    });

    it("leaves differently titled records alone, however similar", async () => {
      await house("a", "hhn-2023", "The Exorcist", ["orlando"]);
      await house("b", "hhn-2023", "The Exorcist: Believer", ["hollywood"]);
      await house("c", "hhn-2023", "The Exorcist.", ["hollywood"]);

      migrateTo(15);

      expect(await ids("SELECT id FROM attractions ORDER BY id")).toEqual(["a", "b", "c"]);
    });
  });

  describe("Knott's: a maze returning across seasons", () => {
    beforeEach(async () => {
      // As an old per-season import left it: one record per season it ran.
      await house("ksf-2024-room-13", "ksf-2024", "Room 13", ["knotts-berry-farm"]);
      await house("ksf-2023-room-13", "ksf-2023", "Room 13", ["knotts-berry-farm"], {
        debut: 2023,
      });
      await house("ksf-2026-room-13", "ksf-2026", "Room 13", ["knotts-berry-farm"]);
      await house("ksf-2025-room-13", "ksf-2025", "room 13", ["knotts-berry-farm"]);
    });

    it("becomes 1 canonical attraction with 4 appearances, 1 review and 1 ranking identity", async () => {
      await rate("r1", "ksf-2025-room-13");
      await note("n1", "ksf-2024-room-13", "Lights-out room still works.");
      await rank("k1", "knotts-scary-farm:houses:all", "ksf-2026-room-13", 2);

      migrateTo(15);

      // The survivor is the record from the earliest season.
      const canonical = "ksf-2023-room-13";
      expect(await ids("SELECT id FROM attractions")).toEqual([canonical]);
      expect(
        await ids(
          "SELECT season_id AS id FROM season_appearances WHERE attraction_id = ? ORDER BY 1",
          [canonical],
        ),
      ).toEqual(["ksf-2023", "ksf-2024", "ksf-2025", "ksf-2026"]);

      expect((await createRatingRepository(db).getAll()).map((r) => r.attractionId)).toEqual([
        canonical,
      ]);
      expect((await createNoteRepository(db).getAll()).map((n) => n.attractionId)).toEqual([
        canonical,
      ]);
      const rankings = createRankingRepository(db);
      expect(
        (await rankings.getScope("knotts-scary-farm:houses:all")).map((e) => e.attractionId),
      ).toEqual([canonical]);
      expect(await rankings.getPosition("knotts-scary-farm:houses:all", canonical)).toBe(2);
    });

    it("keeps the researched debut year, and never invents one", async () => {
      migrateTo(15);
      expect(await all("SELECT debut_year FROM attractions")).toEqual([{ debut_year: 2023 }]);
    });

    it("never infers a debut year from the oldest stored season", async () => {
      await db.execute("UPDATE attractions SET debut_year = NULL");

      migrateTo(15);

      expect(await all("SELECT event_year_id, debut_year FROM attractions")).toEqual([
        { event_year_id: "ksf-2023", debut_year: null },
      ]);
    });

    it("records each merge", async () => {
      migrateTo(15);
      expect(
        await ids(
          "SELECT subject_id AS id FROM migration_conflicts WHERE kind = 'returning_maze_merged' ORDER BY 1",
        ),
      ).toEqual(["ksf-2024-room-13", "ksf-2025-room-13", "ksf-2026-room-13"]);
    });

    it("does not merge, and flags it, when two seasons' records both carry a note", async () => {
      await note("n1", "ksf-2023-room-13", "First visit.");
      await note("n2", "ksf-2025-room-13", "Second visit.");

      migrateTo(15);

      expect(await ids("SELECT id FROM attractions")).toHaveLength(4);
      expect(await ids("SELECT id FROM user_notes ORDER BY id")).toEqual(["n1", "n2"]);
      expect(await ids("SELECT DISTINCT kind AS id FROM migration_conflicts")).toEqual([
        "canonical_personal_data",
      ]);
    });
  });

  it("leaves a Knott's title reused for a maze with a different debut alone", async () => {
    await house("old-gauntlet", "ksf-2023", "The Gauntlet", ["knotts-berry-farm"], { debut: 2001 });
    await house("new-gauntlet", "ksf-2025", "The Gauntlet", ["knotts-berry-farm"], { debut: 2025 });

    migrateTo(15);

    expect(await ids("SELECT id FROM attractions ORDER BY id")).toEqual([
      "new-gauntlet",
      "old-gauntlet",
    ]);
    expect(await ids("SELECT kind AS id FROM migration_conflicts")).toEqual([
      "name_reused_different_debut",
    ]);
  });

  it("never merges across haunts", async () => {
    await house("hhn-2023-unearthed", "hhn-2023", "Unearthed", ["orlando"]);
    await house("ksf-2023-unearthed", "ksf-2023", "Unearthed", ["knotts-berry-farm"]);

    migrateTo(15);

    expect(await ids("SELECT id FROM attractions")).toHaveLength(2);
  });
});
