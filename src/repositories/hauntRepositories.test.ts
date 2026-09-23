// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { HAUNT_IDS } from "../models/haunt";
import { createFixtureAttraction, createFixtureEventYear } from "../test/fixtures";
import { createTestDatabase } from "../test/createTestDatabase";
import { createAttractionRepository } from "./attractionRepository";
import { createAttractionVenueWikiRepository } from "./attractionVenueWikiRepository";
import { createHauntRepository } from "./hauntRepository";
import { createMigrationConflictRepository } from "./migrationConflictRepository";
import { createSeasonAppearanceRepository } from "./seasonAppearanceRepository";

/**
 * The repositories the two-haunt architecture added. Between them they own
 * the four things the schema change introduced: which haunts exist, which
 * seasons an attraction ran in, what differed between venues, and what a
 * migration refused to decide.
 */
describe("the two-haunt repositories", () => {
  let db: SqlExecutor;

  beforeEach(() => {
    db = createTestDatabase();
  });

  describe("HauntRepository", () => {
    it("holds the two haunts the app covers", async () => {
      const haunts = await createHauntRepository(db).getAll();

      expect(haunts.map((haunt) => haunt.id)).toEqual([HAUNT_IDS.hhn, HAUNT_IDS.knotts]);
      expect(haunts.map((haunt) => haunt.shortName)).toEqual(["HHN", "Knott's"]);
    });

    it("reads one by id, and answers null for one that doesn't exist", async () => {
      const haunts = createHauntRepository(db);

      expect((await haunts.getById(HAUNT_IDS.knotts))?.name).toBe("Knott's Scary Farm");
      expect(await haunts.getById("halloween-haunt")).toBeNull();
    });
  });

  describe("SeasonAppearanceRepository", () => {
    it("records the seasons an attraction returned in, oldest first", async () => {
      const first = await createFixtureEventYear(db, { calendarYear: 2021, name: "HHN 2021" });
      const second = await createFixtureEventYear(db, { calendarYear: 2023, name: "HHN 2023" });
      const attraction = await createFixtureAttraction(db, first.id);
      const appearances = createSeasonAppearanceRepository(db);

      await appearances.add({ attractionId: attraction.id, seasonId: second.id, notes: "Return." });

      // The first appearance was recorded when the attraction was created.
      expect((await appearances.getByAttraction(attraction.id)).map((a) => a.seasonId)).toEqual([
        first.id,
        second.id,
      ]);
      expect((await appearances.getBySeason(second.id)).map((a) => a.notes)).toEqual(["Return."]);
    });

    it("records the same appearance twice without complaint, updating the note", async () => {
      const season = await createFixtureEventYear(db);
      const attraction = await createFixtureAttraction(db, season.id);
      const appearances = createSeasonAppearanceRepository(db);

      await appearances.add({ attractionId: attraction.id, seasonId: season.id, notes: "One." });
      await appearances.add({ attractionId: attraction.id, seasonId: season.id, notes: "Two." });

      const stored = await appearances.getByAttraction(attraction.id);
      expect(stored).toHaveLength(1);
      expect(stored[0].notes).toBe("Two.");
    });

    it("removing an appearance leaves the rating and the note alone", async () => {
      const season = await createFixtureEventYear(db);
      const attraction = await createFixtureAttraction(db, season.id);
      await db.execute(
        "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt1', ?, 4, 4, 4)",
        [attraction.id],
      );
      await db.execute(
        "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', ?, 'Mine.')",
        [attraction.id],
      );

      await createSeasonAppearanceRepository(db).remove(attraction.id, season.id);

      const ratings = await db.select<Array<{ total: number }>>(
        "SELECT total FROM user_ratings WHERE attraction_id = ?",
        [attraction.id],
      );
      const notes = await db.select<Array<{ note: string }>>(
        "SELECT note FROM user_notes WHERE attraction_id = ?",
        [attraction.id],
      );
      expect(ratings).toEqual([{ total: 12 }]);
      expect(notes).toEqual([{ note: "Mine." }]);
    });
  });

  describe("AttractionVenueWikiRepository", () => {
    it("keeps what differed at one venue without splitting the record", async () => {
      const season = await createFixtureEventYear(db);
      const attraction = await createFixtureAttraction(db, season.id, {
        parkIds: ["hollywood", "orlando"],
      });
      const venueWiki = createAttractionVenueWikiRepository(db);

      await venueWiki.save({
        attractionId: attraction.id,
        venueId: "orlando",
        experienceDescription: "The Orlando version ran in a soundstage and added a final room.",
      });

      const sections = await venueWiki.getByAttraction(attraction.id);
      expect(sections).toHaveLength(1);
      expect(sections[0].venueId).toBe("orlando");
      expect(sections[0].experienceDescription).toMatch(/added a final room/);
      // One canonical attraction, still at both venues.
      expect((await createAttractionRepository(db).getById(attraction.id))?.parkIds).toEqual([
        "hollywood",
        "orlando",
      ]);
    });

    it("never returns an empty section, so the wiki can't render a bare heading", async () => {
      const season = await createFixtureEventYear(db);
      const attraction = await createFixtureAttraction(db, season.id);
      const venueWiki = createAttractionVenueWikiRepository(db);

      const saved = await venueWiki.save({
        attractionId: attraction.id,
        venueId: "hollywood",
        overview: "   ",
      });

      expect(saved).toBeNull();
      expect(await venueWiki.getByAttraction(attraction.id)).toEqual([]);
    });

    it("replaces a venue's sections rather than accumulating them", async () => {
      const season = await createFixtureEventYear(db);
      const attraction = await createFixtureAttraction(db, season.id);
      const venueWiki = createAttractionVenueWikiRepository(db);

      await venueWiki.save({ attractionId: attraction.id, venueId: "hollywood", overview: "One." });
      await venueWiki.save({ attractionId: attraction.id, venueId: "hollywood", overview: "Two." });

      const sections = await venueWiki.getByAttraction(attraction.id);
      expect(sections).toHaveLength(1);
      expect(sections[0].overview).toBe("Two.");
    });
  });

  describe("MigrationConflictRepository", () => {
    beforeEach(async () => {
      await db.execute(
        `INSERT INTO migration_conflicts (id, migration, kind, subject_id, other_id, detail)
         VALUES ('c1', '0009_merge_hhn_cross_park', 'cross_park_personal_data', 'a1', 'a2',
                 'Both records carry a rating.')`,
      );
      await db.execute(
        `INSERT INTO migration_conflicts (id, migration, kind, subject_id, other_id, detail)
         VALUES ('c2', '0009_merge_hhn_cross_park', 'cross_park_merged', 'a3', 'a4', 'Merged.')`,
      );
    });

    it("separates what still needs a person from what was simply done", async () => {
      const conflicts = createMigrationConflictRepository(db);

      expect((await conflicts.getAll()).map((entry) => entry.id)).toEqual(["c1", "c2"]);
      expect((await conflicts.getUnresolved()).map((entry) => entry.id)).toEqual(["c1"]);
    });

    it("keeps the report after it's resolved", async () => {
      const conflicts = createMigrationConflictRepository(db);

      await conflicts.resolve("c1");

      expect(await conflicts.getUnresolved()).toEqual([]);
      const all = await conflicts.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].resolvedAt).not.toBeNull();
      expect(all[0].detail).toBe("Both records carry a rating.");
    });
  });
});
