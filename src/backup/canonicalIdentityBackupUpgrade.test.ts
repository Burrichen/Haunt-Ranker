// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { createBackupRepository } from "../repositories/backupRepository";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";
import { mergeCanonicalIdentity } from "./canonicalIdentityBackupUpgrade";

type Row = Record<string, unknown>;

/**
 * The backup upgrade has to land exactly where migration 0015 lands, or
 * restoring an old file would bring back a split the migration removed.
 * Each case is built once in a database at version 14, then taken both
 * ways: exported and upgraded, and migrated and exported.
 */

const TIMESTAMPS = new Set(["created_at", "updated_at", "resolved_at"]);
const COMPARED = [
  "attractions",
  "attractionParks",
  "seasonAppearances",
  "attractionSources",
  "characters",
  "media",
  "attractionRelations",
  "attractionVenueWiki",
  "ratings",
  "notes",
  "rankings",
  "migrationConflicts",
];

function comparable(rows: unknown): string[] {
  return (rows as Row[])
    .map((row) =>
      JSON.stringify(
        Object.keys(row)
          .filter((key) => !TIMESTAMPS.has(key))
          .sort()
          .map((key) => [key, row[key] ?? null]),
      ),
    )
    .sort();
}

async function bothWays(seed: (db: SqlExecutor) => Promise<void>) {
  const { db, migrateTo } = createTestDatabaseAtVersion(14);
  await seed(db);
  // Exports always use the current schema; give this older one the columns
  // later migrations add, so it can be exported the way the app would.
  await db.execute("ALTER TABLE haunts ADD COLUMN archive_coverage TEXT");
  const backups = createBackupRepository(db);
  const before = (await backups.exportData()) as unknown as Row;
  const upgraded = mergeCanonicalIdentity(before, "2026-10-10T00:00:00.000Z");
  migrateTo(15);
  const migrated = (await backups.exportData()) as unknown as Row;
  return { upgraded, migrated };
}

async function seedCase(db: SqlExecutor) {
  await db.execute(
    `INSERT INTO event_years (id, haunt_id, calendar_year, name) VALUES
       ('hhn-2023', 'hhn', 2023, 'HHN 2023'),
       ('ksf-2024', 'knotts-scary-farm', 2024, 'KSF 2024'),
       ('ksf-2025', 'knotts-scary-farm', 2025, 'KSF 2025'),
       ('ksf-2026', 'knotts-scary-farm', 2026, 'KSF 2026')`,
  );
  const add = async (id: string, season: string, name: string, park: string, extra = "") => {
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug, full_overview, debut_year)
       VALUES (?, ?, 'house', ?, ?, ?, ?)`,
      [id, season, name, id, extra || null, id.startsWith("ksf-2024") ? 2019 : null],
    );
    await db.execute("INSERT INTO attraction_parks (attraction_id, park_id) VALUES (?, ?)", [
      id,
      park,
    ]);
    await db.execute("INSERT INTO season_appearances (attraction_id, season_id) VALUES (?, ?)", [
      id,
      season,
    ]);
  };
  await add("hhn-a-hollywood", "hhn-2023", "Slaughter Sinema", "hollywood", "Hollywood build.");
  await add("hhn-a-orlando", "hhn-2023", "Slaughter  Sinema", "orlando", "Orlando build.");
  await add("hhn-b-hollywood", "hhn-2023", "Dueling Dragons", "hollywood");
  await add("hhn-b-orlando", "hhn-2023", "Dueling Dragons", "orlando");
  await add("ksf-2025-wax", "ksf-2025", "Wax Works", "knotts-berry-farm");
  await add("ksf-2024-wax", "ksf-2024", "Wax Works", "knotts-berry-farm");
  await add("ksf-2026-wax", "ksf-2026", "WAX WORKS", "knotts-berry-farm");
  await add("ksf-2025-unique", "ksf-2025", "Unique", "knotts-berry-farm");

  // A: merges, carrying a rating, a note and a ranking from the other half.
  await db.execute(
    "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('r-a', 'hhn-a-orlando', 4, 4, 4)",
  );
  await db.execute(
    "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k-a', 'hhn:houses:all', 'hhn-a-orlando', 0)",
  );
  // B: both halves rated — kept apart and flagged.
  await db.execute(
    `INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES
       ('r-b1', 'hhn-b-hollywood', 3, 3, 3), ('r-b2', 'hhn-b-orlando', 5, 5, 5)`,
  );
  // Wax Works: merges into 2024, with a note from 2026.
  await db.execute(
    "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n-wax', 'ksf-2026-wax', 'Mirror room.')",
  );
  await db.execute(
    "INSERT INTO attraction_relations (id, attraction_id, related_attraction_id, relation_type) VALUES ('rel', 'ksf-2025-wax', 'ksf-2025-unique', 'related_concept')",
  );
}

describe("mergeCanonicalIdentity", () => {
  it("lands a version 5 backup exactly where migration 0015 lands the database", async () => {
    const { upgraded, migrated } = await bothWays(seedCase);
    for (const key of COMPARED) {
      expect(comparable(upgraded[key]), key).toEqual(comparable(migrated[key]));
    }
  });

  it("merges a returning Knott's maze into 1 record with every appearance", async () => {
    const { upgraded } = await bothWays(seedCase);

    const wax = (upgraded.attractions as Row[]).filter((row) =>
      String(row.name).toLowerCase().includes("wax"),
    );
    expect(wax.map((row) => [row.id, row.debut_year])).toEqual([["ksf-2024-wax", 2019]]);
    expect(
      (upgraded.seasonAppearances as Row[])
        .filter((row) => row.attraction_id === "ksf-2024-wax")
        .map((row) => row.season_id)
        .sort(),
    ).toEqual(["ksf-2024", "ksf-2025", "ksf-2026"]);
    expect(upgraded.notes).toEqual([
      expect.objectContaining({ id: "n-wax", attraction_id: "ksf-2024-wax" }),
    ]);
  });

  it("never loses a rating: both halves of a clash survive", async () => {
    const { upgraded } = await bothWays(seedCase);

    expect((upgraded.ratings as Row[]).map((row) => [row.id, row.attraction_id]).sort()).toEqual([
      ["r-a", "hhn-a-hollywood"],
      ["r-b1", "hhn-b-hollywood"],
      ["r-b2", "hhn-b-orlando"],
    ]);
    expect(
      (upgraded.migrationConflicts as Row[])
        .filter((row) => row.resolved_at === null)
        .map((row) => [row.kind, row.subject_id]),
    ).toEqual([["canonical_personal_data", "hhn-b-orlando"]]);
  });

  it("leaves a file with nothing to merge as it was", async () => {
    const { db } = createTestDatabaseAtVersion(16);
    const data = (await createBackupRepository(db).exportData()) as unknown as Row;
    expect(mergeCanonicalIdentity(data, "2026-10-10T00:00:00.000Z")).toEqual(data);
  });
});
