// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import {
  buildBackupFile,
  readBackup,
  serializeBackup,
  validateBackup,
} from "../backup/backupFormat";
import type { SqlExecutor } from "../database/types";
import { createTestDatabase } from "../test/createTestDatabase";
import { createBackupRepository } from "./backupRepository";

/**
 * The round trip these tests exist for: export → clear everything → import →
 * everything is back, byte for byte, including the things a naive
 * entity-by-entity export would drop (park assignments, citations, manual
 * ranking positions).
 */
describe("backupRepository", () => {
  let db: SqlExecutor;

  async function seedArchive(): Promise<void> {
    await db.execute(
      `INSERT INTO event_years (id, haunt_id, calendar_year, name, description, source_notes, is_sample)
       VALUES ('y1', 'hhn', 2101, 'Shadowfest 2101', 'A fictional stand-in.', 'From the official site', 0)`,
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug, ip_type, short_summary)
       VALUES ('a1', 'y1', 'house', 'Moonlight Manor', 'moonlight-manor', 'original', 'A house.')`,
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
       VALUES ('a2', 'y1', 'scare_zone', 'Pumpkin Pier', 'pumpkin-pier')`,
    );
    await db.execute(
      "INSERT INTO attraction_parks (attraction_id, park_id) VALUES ('a1', 'hollywood')",
    );
    await db.execute(
      "INSERT INTO attraction_parks (attraction_id, park_id) VALUES ('a1', 'orlando')",
    );
    await db.execute(
      "INSERT INTO attraction_parks (attraction_id, park_id) VALUES ('a2', 'orlando')",
    );
    await db.execute(
      "INSERT INTO season_appearances (attraction_id, season_id) VALUES ('a1', 'y1')",
    );
    await db.execute(
      "INSERT INTO season_appearances (attraction_id, season_id) VALUES ('a2', 'y1')",
    );
    await db.execute(
      `INSERT INTO attraction_venue_wiki (attraction_id, venue_id, experience_description)
       VALUES ('a1', 'orlando', 'The Orlando version added a final room.')`,
    );
    await db.execute(
      "INSERT INTO characters (id, attraction_id, name, description) VALUES ('c1', 'a1', 'The Curator', 'Keeps the house.')",
    );
    await db.execute(
      `INSERT INTO attraction_relations (id, attraction_id, related_attraction_id, relation_type)
       VALUES ('r1', 'a1', 'a2', 'same_franchise')`,
    );
    await db.execute(
      `INSERT INTO sources (id, source_type, title, url, publisher, published_at)
       VALUES ('s1', 'youtube', 'A walkthrough', 'https://example.invalid/v', 'A Channel', '2101-10-02')`,
    );
    await db.execute(
      "INSERT INTO attraction_sources (attraction_id, source_id, venue_id) VALUES ('a1', 's1', 'orlando')",
    );
    await db.execute(
      "INSERT INTO event_year_sources (event_year_id, source_id) VALUES ('y1', 's1')",
    );
    await db.execute(
      `INSERT INTO media (id, attraction_id, media_type, url, source_id, attribution, distribution)
       VALUES ('m1', 'a1', 'poster', 'https://example.invalid/p.jpg', 's1', 'A Channel', 'reference')`,
    );
    await db.execute(
      "INSERT INTO media (id, event_year_id, media_type, local_path, distribution) VALUES ('m2', 'y1', 'event_artwork', 'media/key-art-abc.jpg', 'local')",
    );
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt1', 'a1', 4.5, 3, 5)",
    );
    await db.execute(
      "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', 'a1', 'Best facade of the year.')",
    );
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k1', 'houses:all', 'a1', 0)",
    );
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k2', 'houses:all', 'a2', 1)",
    );
    await db.execute(
      "INSERT INTO user_settings (key, value) VALUES ('last-visited', '\"/years\"')",
    );
  }

  async function clearEverything(): Promise<void> {
    // The blunt version of what a user would do by hand — cascades take the
    // dependent rows with them.
    await db.execute("DELETE FROM media");
    await db.execute("DELETE FROM attractions");
    await db.execute("DELETE FROM event_years");
    await db.execute("DELETE FROM sources");
    await db.execute("DELETE FROM user_settings");
  }

  beforeEach(async () => {
    db = createTestDatabase();
    await seedArchive();
  });

  it("exports every table, including the join tables no single model owns", async () => {
    const data = await createBackupRepository(db).exportData();

    expect(data.haunts).toHaveLength(2);
    expect(data.venues).toHaveLength(3);
    expect(data.eventYears).toHaveLength(1);
    expect(data.attractions).toHaveLength(2);
    expect(data.attractionParks).toHaveLength(3);
    expect(data.seasonAppearances).toHaveLength(2);
    expect(data.attractionVenueWiki).toHaveLength(1);
    expect(data.characters).toHaveLength(1);
    expect(data.attractionRelations).toHaveLength(1);
    expect(data.sources).toHaveLength(1);
    expect(data.attractionSources).toEqual([
      { attraction_id: "a1", source_id: "s1", venue_id: "orlando" },
    ]);
    expect(data.eventYearSources).toEqual([{ event_year_id: "y1", source_id: "s1" }]);
    expect(data.media).toHaveLength(2);
    expect(data.ratings).toHaveLength(1);
    expect(data.notes).toHaveLength(1);
    expect(data.rankings).toHaveLength(2);
    expect(data.settings).toHaveLength(1);
  });

  it("never carries the generated total, which the database recomputes", async () => {
    const data = await createBackupRepository(db).exportData();

    expect(data.ratings[0]).not.toHaveProperty("total");
    expect(data.ratings[0]).toMatchObject({ theme: 4.5, fun: 3, fear: 5 });
  });

  it("restores everything after the data is cleared", async () => {
    const repository = createBackupRepository(db);
    const exported = await repository.exportData();

    await clearEverything();
    expect((await repository.exportData()).attractions).toHaveLength(0);

    await repository.replaceAll(exported);

    expect(await repository.exportData()).toEqual(exported);
  });

  it("survives the file it would actually be written to", async () => {
    const repository = createBackupRepository(db);
    const file = serializeBackup(
      buildBackupFile({
        data: await repository.exportData(),
        preferences: { ambientEffects: false, motion: "reduce" },
        appVersion: "0.1.0",
        schemaVersion: 5,
      }),
    );

    await clearEverything();

    const parsed = readBackup(file);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    await repository.replaceAll(parsed.backup.data);

    const restored = await repository.exportData();
    expect(restored).toEqual(parsed.backup.data);
    expect(parsed.backup.preferences).toEqual({ ambientEffects: false, motion: "reduce" });
  });

  it("brings back the ratings, notes and rankings exactly", async () => {
    const repository = createBackupRepository(db);
    const exported = await repository.exportData();

    await clearEverything();
    await repository.replaceAll(exported);

    const ratings = await db.select<Array<{ attraction_id: string; total: number }>>(
      "SELECT attraction_id, total FROM user_ratings",
    );
    const notes = await db.select<Array<{ note: string }>>("SELECT note FROM user_notes");
    const rankings = await db.select<Array<{ attraction_id: string; position: number }>>(
      "SELECT attraction_id, position FROM user_rankings ORDER BY position",
    );

    expect(ratings).toEqual([{ attraction_id: "a1", total: 12.5 }]);
    expect(notes).toEqual([{ note: "Best facade of the year." }]);
    expect(rankings).toEqual([
      { attraction_id: "a1", position: 0 },
      { attraction_id: "a2", position: 1 },
    ]);
  });

  it("replaces what's here rather than merging into it", async () => {
    const repository = createBackupRepository(db);
    const exported = await repository.exportData();

    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
       VALUES ('a3', 'y1', 'house', 'Added Later', 'added-later')`,
    );

    await repository.replaceAll(exported);

    const rows = await db.select<Array<{ id: string }>>("SELECT id FROM attractions ORDER BY id");
    expect(rows.map((row) => row.id)).toEqual(["a1", "a2"]);
  });

  it("leaves the venue and haunt reference tables alone", async () => {
    const repository = createBackupRepository(db);
    await repository.replaceAll(await repository.exportData());

    const parks = await db.select<Array<{ id: string }>>("SELECT id FROM parks ORDER BY id");
    expect(parks.map((row) => row.id)).toEqual(["hollywood", "knotts-berry-farm", "orlando"]);

    const haunts = await db.select<Array<{ id: string }>>("SELECT id FROM haunts ORDER BY id");
    expect(haunts.map((row) => row.id)).toEqual(["hhn", "knotts-scary-farm"]);
  });

  it("restores an empty backup as genuinely empty", async () => {
    const repository = createBackupRepository(db);
    const empty = validateBackup(
      JSON.parse(
        serializeBackup(
          buildBackupFile({
            data: {
              haunts: [],
              venues: [],
              eventYears: [],
              attractions: [],
              attractionParks: [],
              seasonAppearances: [],
              characters: [],
              attractionRelations: [],
              sources: [],
              attractionSources: [],
              eventYearSources: [],
              media: [],
              attractionVenueWiki: [],
              ratings: [],
              notes: [],
              rankings: [],
              settings: [],
              migrationConflicts: [],
            },
            preferences: {},
            appVersion: "0.1.0",
            schemaVersion: 5,
          }),
        ),
      ),
    );

    expect(empty.ok).toBe(true);
    if (!empty.ok) {
      return;
    }
    await repository.replaceAll(empty.backup.data);

    // Everything the user could have put there is gone; the haunts and
    // venues a migration seeded are not, because nothing else would have
    // anywhere to attach to afterwards.
    const counts = await repository.counts();
    const emptied = counts.filter((entry) => entry.key !== "haunts" && entry.key !== "venues");
    expect(emptied.every((entry) => entry.count === 0)).toBe(true);
    expect(counts.find((entry) => entry.key === "haunts")?.count).toBe(2);
    expect(counts.find((entry) => entry.key === "venues")?.count).toBe(3);
  });

  it("restores into a database that has never seen this data", async () => {
    // The point of a portable backup: another machine, a fresh install.
    const exported = await createBackupRepository(db).exportData();
    const fresh = createBackupRepository(createTestDatabase());

    await fresh.replaceAll(exported);

    const restored = await fresh.exportData();
    // Haunts and venues are the receiving install's own, seeded there by the
    // same migration, so only their timestamps differ.
    expect({ ...restored, haunts: [], venues: [] }).toEqual({
      ...exported,
      haunts: [],
      venues: [],
    });
    expect(restored.haunts.map((haunt) => haunt.id)).toEqual(exported.haunts.map((h) => h.id));
    expect(restored.venues).toEqual(exported.venues);
  });

  it("counts what's stored now, table by table", async () => {
    const counts = await createBackupRepository(db).counts();
    const byKey = new Map(counts.map((entry) => [entry.key, entry.count]));

    expect(byKey.get("attractions")).toBe(2);
    expect(byKey.get("ratings")).toBe(1);
    expect(byKey.get("attractionParks")).toBe(3);
  });

  it("reports no applied schema version where the driver doesn't record one", async () => {
    // The test executor applies the migration files directly, without the
    // Tauri plugin's bookkeeping table — a missing answer, not a failure.
    await expect(createBackupRepository(db).appliedSchemaVersion()).resolves.toBeNull();
  });
});
