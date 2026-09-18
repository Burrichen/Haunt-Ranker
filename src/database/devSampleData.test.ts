// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "./types";
import { createTestDatabase } from "../test/createTestDatabase";
import { createAttractionRelationRepository } from "../repositories/attractionRelationRepository";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createCharacterRepository } from "../repositories/characterRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createNoteRepository } from "../repositories/noteRepository";
import { createRankingRepository } from "../repositories/rankingRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { createSourceRepository } from "../repositories/sourceRepository";
import { allTimeScope } from "../models/ranking";
import {
  clearDevSampleData,
  hasDevSampleData,
  resetDevSampleData,
  seedDevSampleData,
} from "./devSampleData";

describe("dev sample data", () => {
  let db: SqlExecutor;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it("is absent before seeding and present after", async () => {
    await expect(hasDevSampleData(db)).resolves.toBe(false);
    await seedDevSampleData(db);
    await expect(hasDevSampleData(db)).resolves.toBe(true);
  });

  it("seeds the documented counts of every entity type", async () => {
    const summary = await seedDevSampleData(db);

    expect(summary).toEqual({
      eventYears: 3,
      attractions: 7,
      characters: 5,
      sources: 5,
      media: 4,
      relations: 4,
      ratings: 4,
      notes: 1,
      rankingScopes: 2,
    });
  });

  it("refuses to seed a second time without clearing first", async () => {
    await seedDevSampleData(db);
    await expect(seedDevSampleData(db)).rejects.toThrow(/already exists/i);
  });

  it("marks every seeded row as sample data", async () => {
    await seedDevSampleData(db);

    const years = await createEventYearRepository(db).getAll();
    const attractionList = await createAttractionRepository(db).getAll();

    expect(years.every((year) => year.isSample)).toBe(true);
    expect(attractionList.every((attraction) => attraction.isSample)).toBe(true);
  });

  describe("once seeded", () => {
    beforeEach(async () => {
      await seedDevSampleData(db);
    });

    it("covers Hollywood-only, Orlando-only and dual-park attractions", async () => {
      const attractions = await createAttractionRepository(db).getAll();
      const parkSetOf = (name: string) =>
        attractions
          .find((a) => a.name === name)
          ?.parkIds.slice()
          .sort();

      expect(parkSetOf("Radioactive Crypt")).toEqual(["hollywood"]);
      expect(parkSetOf("The Withering Asylum")).toEqual(["orlando"]);
      expect(parkSetOf("Moonlight Manor")).toEqual(["hollywood", "orlando"]);
    });

    it("covers original and fictional-licensed IP", async () => {
      const attractions = await createAttractionRepository(db).getAll();
      const ipTypeOf = (name: string) => attractions.find((a) => a.name === name)?.ipType;

      expect(ipTypeOf("Moonlight Manor")).toBe("original");
      expect(ipTypeOf("Radioactive Crypt")).toBe("licensed");
    });

    it("filters attractions by type and by event year", async () => {
      const attractions = createAttractionRepository(db);

      const houses = await attractions.getByType("house");
      const scareZones = await attractions.getByType("scare_zone");
      expect(houses).toHaveLength(4);
      expect(scareZones).toHaveLength(3);

      const years = await createEventYearRepository(db).getAll();
      const year2101 = years.find((y) => y.calendarYear === 2101);
      expect(year2101).toBeDefined();
      const attractionsIn2101 = await attractions.getByEventYear(year2101!.id);
      expect(attractionsIn2101.map((a) => a.name).sort()).toEqual([
        "Moonlight Manor",
        "Pumpkin Pier",
        "Radioactive Crypt",
      ]);
    });

    it("has rated and genuinely unrated attractions", async () => {
      const attractionList = await createAttractionRepository(db).getAll();
      const ratings = createRatingRepository(db);
      const idOf = (name: string) => attractionList.find((a) => a.name === name)!.id;

      const moonlightManorRating = await ratings.getForAttraction(idOf("Moonlight Manor"));
      expect(moonlightManorRating?.total).toBe(12);

      const radioactiveCryptRating = await ratings.getForAttraction(idOf("Radioactive Crypt"));
      expect(radioactiveCryptRating).toBeNull();
    });

    it("has attractions with and without characters", async () => {
      const attractionList = await createAttractionRepository(db).getAll();
      const characters = createCharacterRepository(db);
      const idOf = (name: string) => attractionList.find((a) => a.name === name)!.id;

      const moonlightManorCharacters = await characters.getByAttraction(idOf("Moonlight Manor"));
      expect(moonlightManorCharacters.map((c) => c.name).sort()).toEqual([
        "Groundskeeper Wick",
        "The Hollow Duchess",
      ]);

      const graveyardRadioCharacters = await characters.getByAttraction(idOf("Graveyard Radio"));
      expect(graveyardRadioCharacters).toEqual([]);
    });

    it("has attractions with sources, including a youtube source", async () => {
      const attractionList = await createAttractionRepository(db).getAll();
      const sources = createSourceRepository(db);
      const idOf = (name: string) => attractionList.find((a) => a.name === name)!.id;

      const moonlightManorSources = await sources.getForAttraction(idOf("Moonlight Manor"));
      expect(moonlightManorSources.map((s) => s.sourceType).sort()).toEqual(["article", "youtube"]);

      const pumpkinPierSources = await sources.getForAttraction(idOf("Pumpkin Pier"));
      expect(pumpkinPierSources).toEqual([]);
    });

    it("has attractions and years with and without artwork", async () => {
      const attractionList = await createAttractionRepository(db).getAll();
      const years = await createEventYearRepository(db).getAll();
      const media = createMediaRepository(db);
      const idOf = (name: string) => attractionList.find((a) => a.name === name)!.id;

      await expect(media.getForAttraction(idOf("Moonlight Manor"))).resolves.toHaveLength(1);
      await expect(media.getForAttraction(idOf("The Withering Asylum"))).resolves.toEqual([]);

      const year2101 = years.find((y) => y.calendarYear === 2101)!;
      const year2102 = years.find((y) => y.calendarYear === 2102)!;
      await expect(media.getForEventYear(year2101.id)).resolves.toHaveLength(1);
      await expect(media.getForEventYear(year2102.id)).resolves.toEqual([]);
    });

    it("has related attractions covering every relation type", async () => {
      const attractionList = await createAttractionRepository(db).getAll();
      const relations = createAttractionRelationRepository(db);
      const idOf = (name: string) => attractionList.find((a) => a.name === name)!.id;

      const found = await relations.getForAttraction(idOf("Midnight Carnival"));
      expect(found.map((r) => r.relationType).sort()).toEqual(["previous_version", "sequel"]);

      const radioactiveCryptRelations = await relations.getForAttraction(idOf("Radioactive Crypt"));
      expect(radioactiveCryptRelations.map((r) => r.relationType).sort()).toEqual([
        "related_concept",
        "same_franchise",
      ]);
    });

    it("has exactly one personal note, and manual rankings that override the calculated score order", async () => {
      const attractionList = await createAttractionRepository(db).getAll();
      const notes = createNoteRepository(db);
      const rankings = createRankingRepository(db);
      const idOf = (name: string) => attractionList.find((a) => a.name === name)!.id;

      await expect(notes.getForAttraction(idOf("Moonlight Manor"))).resolves.not.toBeNull();
      await expect(notes.getForAttraction(idOf("Pumpkin Pier"))).resolves.toBeNull();

      const houseOrder = await rankings.getScope(allTimeScope("house"));
      // The Withering Asylum (score 11) is manually ranked above Moonlight
      // Manor (score 12) — proving manual order overrides the calculated one.
      expect(houseOrder[0].attractionId).toBe(idOf("The Withering Asylum"));
      expect(houseOrder[1].attractionId).toBe(idOf("Moonlight Manor"));
    });

    it("clearDevSampleData removes every sample row, cascades included", async () => {
      await clearDevSampleData(db);

      await expect(hasDevSampleData(db)).resolves.toBe(false);

      const counts = await Promise.all(
        [
          "event_years",
          "attractions",
          "sources",
          "characters",
          "attraction_parks",
          "attraction_relations",
          "attraction_sources",
          "media",
          "user_ratings",
          "user_notes",
          "user_rankings",
        ].map(async (table) => {
          const rows = await db.select<Array<{ count: number }>>(
            `SELECT COUNT(*) as count FROM ${table}`,
          );
          return [table, rows[0].count] as const;
        }),
      );

      for (const [table, count] of counts) {
        expect(count, `expected ${table} to be empty after clearing`).toBe(0);
      }

      // Parks are permanent reference data, not sample data — untouched.
      const parks = await db.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM parks",
      );
      expect(parks[0].count).toBe(2);
    });

    it("resetDevSampleData can be called repeatedly without error", async () => {
      await resetDevSampleData(db);
      const summary = await resetDevSampleData(db);

      expect(summary.attractions).toBe(7);
      await expect(hasDevSampleData(db)).resolves.toBe(true);
    });
  });
});
