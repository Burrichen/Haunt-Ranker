// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import type { ArchiveDataset } from "../models/archiveDataset";
import { ARCHIVE_FORMAT_VERSION } from "../models/archiveDataset";
import {
  createArchiveImportRepository,
  type ArchiveImportRepository,
} from "../repositories/archiveImportRepository";
import { createTestDatabase } from "../test/createTestDatabase";
import { ArchiveImportError, importArchiveDataset, previewImport } from "./importDataset";

/**
 * What the import contract actually promises, against a real database: an
 * archive update may add and correct facts, and may never cost the user a
 * rating, a note or a place in their ranking.
 *
 * Every record here is a placeholder. Real Halloween Horror Nights data hasn't
 * been researched yet — the point of this phase is that the format is settled
 * before it is.
 */
describe("importArchiveDataset", () => {
  let db: SqlExecutor;
  let repository: ArchiveImportRepository;

  function dataset(overrides: Partial<ArchiveDataset> = {}): ArchiveDataset {
    return {
      formatVersion: ARCHIVE_FORMAT_VERSION,
      datasetVersion: "2026.09.1",
      sources: [
        {
          id: "example-recap",
          type: "youtube",
          title: "Example recap",
          url: "https://youtube.invalid/watch?v=recap",
          publisher: "An Example Channel",
        },
      ],
      events: [
        {
          id: "example-2101",
          calendarYear: 2101,
          name: "Example Event 2101",
          dates: { start: "2101-09-05", end: "2101-11-02" },
          sourceIds: ["example-recap"],
        },
      ],
      attractions: [
        {
          id: "example-2101-house-one",
          eventId: "example-2101",
          type: "house",
          name: "House One",
          parks: ["orlando"],
          summary: "A placeholder house.",
          characters: [{ id: "example-2101-house-one-host", name: "The Host" }],
          media: [
            {
              id: "example-2101-house-one-poster",
              kind: "poster",
              url: "https://example.invalid/one.jpg",
            },
          ],
          sourceIds: ["example-recap"],
        },
      ],
      ...overrides,
    };
  }

  /** The user's own data, on the attraction the dataset also describes. */
  async function addPersonalData(attractionId = "example-2101-house-one"): Promise<void> {
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt1', ?, 4.5, 4, 3.5)",
      [attractionId],
    );
    await db.execute("INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', ?, 'Mine.')", [
      attractionId,
    ]);
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k1', 'houses:all', ?, 0)",
      [attractionId],
    );
  }

  async function personalData(): Promise<{
    rating: { attraction_id: string; total: number } | undefined;
    note: { attraction_id: string; note: string } | undefined;
    ranking: { attraction_id: string; position: number } | undefined;
  }> {
    const [ratings, notes, rankings] = await Promise.all([
      db.select<Array<{ attraction_id: string; total: number }>>(
        "SELECT attraction_id, total FROM user_ratings",
      ),
      db.select<Array<{ attraction_id: string; note: string }>>(
        "SELECT attraction_id, note FROM user_notes",
      ),
      db.select<Array<{ attraction_id: string; position: number }>>(
        "SELECT attraction_id, position FROM user_rankings",
      ),
    ]);
    return { rating: ratings[0], note: notes[0], ranking: rankings[0] };
  }

  beforeEach(() => {
    db = createTestDatabase();
    repository = createArchiveImportRepository(db);
  });

  describe("a first import", () => {
    it("creates the archive the dataset describes", async () => {
      const report = await importArchiveDataset(dataset(), repository);

      expect(report.events.created).toBe(1);
      expect(report.attractions.created).toBe(1);
      expect(report.sources.created).toBe(1);
      expect(report.characters.created).toBe(1);
      expect(report.media.created).toBe(1);
      expect(report.citationsAdded).toBe(2);
      expect(report.parkChanges).toBe(1);

      const attractions = await db.select<Array<{ id: string; name: string; slug: string }>>(
        "SELECT id, name, slug FROM attractions",
      );
      expect(attractions).toEqual([
        { id: "example-2101-house-one", name: "House One", slug: "example-2101-house-one" },
      ]);
    });

    it("keeps the event's own run dates", async () => {
      await importArchiveDataset(dataset(), repository);

      const rows = await db.select<Array<{ starts_on: string; ends_on: string }>>(
        "SELECT starts_on, ends_on FROM event_years",
      );
      expect(rows[0]).toEqual({ starts_on: "2101-09-05", ends_on: "2101-11-02" });
    });

    it("marks nothing as sample data", async () => {
      await importArchiveDataset(dataset(), repository);

      const rows = await db.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM attractions WHERE is_sample = 1",
      );
      expect(rows[0].count).toBe(0);
    });

    it("changes nothing on a second run of the same dataset", async () => {
      await importArchiveDataset(dataset(), repository);
      const second = await importArchiveDataset(dataset(), repository);

      expect(second.attractions).toEqual({ created: 0, updated: 0, unchanged: 1 });
      expect(second.events).toEqual({ created: 0, updated: 0, unchanged: 1 });
      expect(second.media).toEqual({ created: 0, updated: 0, unchanged: 1 });
      expect(second.citationsAdded).toBe(0);
      expect(second.parkChanges).toBe(0);
    });
  });

  describe("a later dataset revision", () => {
    beforeEach(async () => {
      await importArchiveDataset(dataset(), repository);
      await addPersonalData();
    });

    it("corrects facts without touching the user's review", async () => {
      const corrected = dataset();
      corrected.attractions[0].name = "House One: Corrected";
      corrected.attractions[0].summary = "A better summary.";
      corrected.attractions[0].ip = { type: "licensed", franchise: "Placeholder" };
      corrected.attractions[0].parks = ["hollywood", "orlando"];

      const report = await importArchiveDataset(corrected, repository);

      expect(report.attractions).toEqual({ created: 0, updated: 1, unchanged: 0 });
      const rows = await db.select<Array<{ name: string; franchise_name: string }>>(
        "SELECT name, franchise_name FROM attractions",
      );
      expect(rows[0]).toEqual({ name: "House One: Corrected", franchise_name: "Placeholder" });

      const personal = await personalData();
      expect(personal.rating).toEqual({ attraction_id: "example-2101-house-one", total: 12 });
      expect(personal.note?.note).toBe("Mine.");
      expect(personal.ranking?.position).toBe(0);
    });

    it("adds new attractions alongside the ones already there", async () => {
      const grown = dataset();
      grown.attractions.push({
        id: "example-2101-zone-one",
        eventId: "example-2101",
        type: "scare_zone",
        name: "Zone One",
        parks: ["orlando"],
      });

      const report = await importArchiveDataset(grown, repository);

      expect(report.attractions).toEqual({ created: 1, updated: 0, unchanged: 1 });
      expect((await personalData()).rating?.total).toBe(12);
    });

    it("adds sources and media without disturbing what's there", async () => {
      const enriched = dataset();
      enriched.sources?.push({
        id: "example-article",
        type: "article",
        title: "An example write-up",
        url: "https://example.invalid/article",
      });
      enriched.attractions[0].sourceIds = ["example-recap", "example-article"];
      enriched.attractions[0].media?.push({
        id: "example-2101-house-one-logo",
        kind: "logo",
        url: "https://example.invalid/logo.png",
        attribution: "An Example Channel",
      });

      const report = await importArchiveDataset(enriched, repository);

      expect(report.sources.created).toBe(1);
      expect(report.media.created).toBe(1);
      expect(report.citationsAdded).toBe(1);
      expect((await personalData()).note?.note).toBe("Mine.");
    });

    it("replaces park assignments, because a stale park is a wrong fact", async () => {
      const moved = dataset();
      moved.attractions[0].parks = ["hollywood"];

      await importArchiveDataset(moved, repository);

      const rows = await db.select<Array<{ park_id: string }>>(
        "SELECT park_id FROM attraction_parks",
      );
      expect(rows.map((row) => row.park_id)).toEqual(["hollywood"]);
    });

    it("leaves a citation someone added by hand alone", async () => {
      await db.execute(
        "INSERT INTO sources (id, source_type, title) VALUES ('mine', 'other', 'Something I found')",
      );
      await db.execute(
        "INSERT INTO attraction_sources (attraction_id, source_id) VALUES ('example-2101-house-one', 'mine')",
      );

      await importArchiveDataset(dataset(), repository);

      const rows = await db.select<Array<{ source_id: string }>>(
        "SELECT source_id FROM attraction_sources ORDER BY source_id",
      );
      expect(rows.map((row) => row.source_id)).toEqual(["example-recap", "mine"]);
    });

    it("never deletes an attraction the dataset stopped mentioning", async () => {
      const shrunk = dataset();
      shrunk.attractions = [];

      const report = await importArchiveDataset(shrunk, repository);

      expect(report.attractions).toEqual({ created: 0, updated: 0, unchanged: 0 });
      const rows = await db.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM attractions",
      );
      expect(rows[0].count).toBe(1);
      expect((await personalData()).rating?.total).toBe(12);
    });
  });

  describe("when an id has to change", () => {
    beforeEach(async () => {
      await importArchiveDataset(dataset(), repository);
      await addPersonalData();
    });

    it("carries the user's rating, note and ranking to the new id", async () => {
      const renamed = dataset();
      renamed.attractions[0] = {
        ...renamed.attractions[0],
        id: "example-2101-house-one-renamed",
        previousIds: ["example-2101-house-one"],
        name: "House One (renamed)",
      };

      const report = await importArchiveDataset(renamed, repository);

      expect(report.renames).toEqual([
        {
          entity: "attraction",
          from: "example-2101-house-one",
          to: "example-2101-house-one-renamed",
        },
      ]);
      expect(report.personalRowsRepointed).toBe(3);
      expect(report.attractions.created).toBe(0);

      const personal = await personalData();
      expect(personal.rating).toEqual({
        attraction_id: "example-2101-house-one-renamed",
        total: 12,
      });
      expect(personal.note?.attraction_id).toBe("example-2101-house-one-renamed");
      expect(personal.ranking?.attraction_id).toBe("example-2101-house-one-renamed");

      const attractions = await db.select<Array<{ id: string; name: string }>>(
        "SELECT id, name FROM attractions",
      );
      expect(attractions).toEqual([
        { id: "example-2101-house-one-renamed", name: "House One (renamed)" },
      ]);
    });

    it("brings its characters, media and citations with it", async () => {
      const renamed = dataset();
      renamed.attractions[0] = {
        ...renamed.attractions[0],
        id: "example-2101-house-one-renamed",
        previousIds: ["example-2101-house-one"],
      };

      await importArchiveDataset(renamed, repository);

      const characters = await db.select<Array<{ attraction_id: string }>>(
        "SELECT attraction_id FROM characters",
      );
      const media = await db.select<Array<{ attraction_id: string }>>(
        "SELECT attraction_id FROM media",
      );
      const citations = await db.select<Array<{ attraction_id: string }>>(
        "SELECT attraction_id FROM attraction_sources",
      );
      expect(characters[0].attraction_id).toBe("example-2101-house-one-renamed");
      expect(media[0].attraction_id).toBe("example-2101-house-one-renamed");
      expect(citations[0].attraction_id).toBe("example-2101-house-one-renamed");
    });

    it("renames an event year too, keeping its attractions attached", async () => {
      const renamed = dataset();
      renamed.events[0] = {
        ...renamed.events[0],
        id: "example-event-2101",
        previousIds: ["example-2101"],
      };
      renamed.attractions[0].eventId = "example-event-2101";

      const report = await importArchiveDataset(renamed, repository);

      expect(report.renames[0]).toMatchObject({ entity: "eventYear", to: "example-event-2101" });
      const rows = await db.select<Array<{ id: string; event_year_id: string }>>(
        "SELECT a.id, a.event_year_id FROM attractions a",
      );
      expect(rows[0].event_year_id).toBe("example-event-2101");
      expect((await personalData()).rating?.total).toBe(12);
    });

    it("refuses to merge when both ids exist, and says so", async () => {
      await db.execute(
        `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
         VALUES ('example-2101-house-one-renamed', 'example-2101', 'house', 'Separate record', 'separate')`,
      );

      const renamed = dataset();
      renamed.attractions[0] = {
        ...renamed.attractions[0],
        id: "example-2101-house-one-renamed",
        previousIds: ["example-2101-house-one"],
      };

      const report = await importArchiveDataset(renamed, repository);

      expect(report.renames).toEqual([]);
      expect(report.warnings[0]).toMatch(/nothing was merged/);
      const rows = await db.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM attractions",
      );
      expect(rows[0].count).toBe(2);
    });
  });

  describe("when it can't be applied", () => {
    it("refuses a relation to an attraction nobody has heard of", async () => {
      const broken = dataset();
      broken.attractions[0].related = [{ attractionId: "example-2101-house-nine", type: "sequel" }];

      await expect(importArchiveDataset(broken, repository)).rejects.toBeInstanceOf(
        ArchiveImportError,
      );

      const rows = await db.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM attractions",
      );
      expect(rows[0].count).toBe(0);
    });

    it("accepts a relation to an attraction defined later in the same file", async () => {
      // Relations have to be written after every attraction exists. Planning
      // them inline looked fine and broke a foreign key the moment a real
      // dataset related an attraction to one further down the file.
      const forward = dataset();
      forward.attractions[0].related = [
        { attractionId: "example-2101-zone-later", type: "related_concept" },
      ];
      forward.attractions.push({
        id: "example-2101-zone-later",
        eventId: "example-2101",
        type: "scare_zone",
        name: "Defined Later",
        parks: ["hollywood"],
      });

      const report = await importArchiveDataset(forward, repository);

      expect(report.relations.created).toBe(1);
      const rows = await db.select<Array<{ attraction_id: string; related_attraction_id: string }>>(
        "SELECT attraction_id, related_attraction_id FROM attraction_relations",
      );
      expect(rows).toEqual([
        {
          attraction_id: "example-2101-house-one",
          related_attraction_id: "example-2101-zone-later",
        },
      ]);
    });

    it("accepts a relation to an attraction imported by an earlier dataset", async () => {
      await importArchiveDataset(dataset(), repository);

      const sequel = dataset();
      sequel.attractions = [
        {
          id: "example-2102-house-two",
          eventId: "example-2101",
          type: "house",
          name: "House Two",
          parks: ["orlando"],
          related: [{ attractionId: "example-2101-house-one", type: "sequel" }],
        },
      ];

      const report = await importArchiveDataset(sequel, repository);
      expect(report.relations.created).toBe(1);
    });

    it("undoes every write when one of them fails", async () => {
      await importArchiveDataset(dataset(), repository);
      await addPersonalData();

      const broken = dataset();
      broken.attractions[0].name = "House One: Corrected";
      broken.attractions.push({
        // Same event and slug as the existing attraction: valid as a file,
        // rejected by the database's UNIQUE constraint once the earlier
        // writes have already gone in.
        id: "example-2101-house-clash",
        slug: "example-2101-house-one",
        eventId: "example-2101",
        type: "house",
        name: "Clashing House",
        parks: ["orlando"],
      });

      await expect(importArchiveDataset(broken, repository)).rejects.toThrow();

      const attractions = await db.select<Array<{ id: string; name: string }>>(
        "SELECT id, name FROM attractions ORDER BY id",
      );
      expect(attractions).toEqual([{ id: "example-2101-house-one", name: "House One" }]);

      const personal = await personalData();
      expect(personal.rating?.total).toBe(12);
      expect(personal.note?.note).toBe("Mine.");
      expect(personal.ranking?.position).toBe(0);
    });
  });

  describe("previewImport", () => {
    it("reports what would change without changing it", async () => {
      await importArchiveDataset(dataset(), repository);

      const grown = dataset();
      grown.attractions[0].name = "House One: Corrected";
      grown.attractions.push({
        id: "example-2101-zone-one",
        eventId: "example-2101",
        type: "scare_zone",
        name: "Zone One",
        parks: ["orlando"],
      });

      const plan = await previewImport(grown, repository);

      expect(plan.report.attractions).toEqual({ created: 1, updated: 1, unchanged: 0 });
      expect(plan.errors).toEqual([]);

      const rows = await db.select<Array<{ name: string }>>("SELECT name FROM attractions");
      expect(rows.map((row) => row.name)).toEqual(["House One"]);
    });
  });
});
