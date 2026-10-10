// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { repairScrapedNames } from "../backup/canonicalIdentityBackupUpgrade";
import { readDataset } from "../archive/validateDataset";
import { ARCHIVE_FORMAT_VERSION } from "../models/archiveDataset";
import { createBackupRepository } from "../repositories/backupRepository";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";
import type { SqlExecutor } from "./types";

/**
 * 0017 repairs the names the original HHN scrape broke, then re-applies the
 * canonical identity rule, which merges the two 2021 Hill House records.
 */
const ZWSP = "​";

async function seed(db: SqlExecutor): Promise<void> {
  await db.execute(
    `INSERT INTO event_years (id, haunt_id, calendar_year, name) VALUES
       ('hhn-2015', 'hhn', 2015, 'Halloween Horror Nights 2015'),
       ('hhn-2021', 'hhn', 2021, 'Halloween Horror Nights 2021')`,
  );
  for (const [id, season, name, location, park] of [
    ["hhn-2015-house-", "hhn-2015", ZWSP, "Insidious", "orlando"],
    [
      "hhn-2015-house-run",
      "hhn-2015",
      `${ZWSP}RUN: Blood Sweat and Fears`,
      "Disaster! Queue",
      "orlando",
    ],
    ["hhn-2021-house-the-hau", "hhn-2021", "The Hau", "nting of Hill House", "orlando"],
    [
      "hhn-2021-house-the-haunting-of-hill-house",
      "hhn-2021",
      "The Haunting of Hill House",
      "H-Lot North",
      "hollywood",
    ],
  ]) {
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug, location_notes)
       VALUES (?, ?, 'house', ?, ?, ?)`,
      [id, season, name, id, location],
    );
    await db.execute("INSERT INTO attraction_parks (attraction_id, park_id) VALUES (?, ?)", [
      id,
      park,
    ]);
  }
}

describe("0017_scrape_name_fixes", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  const rows = () =>
    db.select<Array<{ id: string; name: string; location_notes: string | null }>>(
      "SELECT id, name, location_notes FROM attractions ORDER BY id",
    );

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(16));
    await seed(db);
  });

  it("names the nameless house, strips zero-width spaces, and merges Hill House", async () => {
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('r1', 'hhn-2021-house-the-haunting-of-hill-house', 4, 4, 4)",
    );

    migrateTo(17);

    expect(await rows()).toEqual([
      { id: "hhn-2015-house-", name: "Insidious", location_notes: "Sprung Tent 2" },
      {
        id: "hhn-2015-house-run",
        name: "RUN: Blood Sweat and Fears",
        location_notes: "Disaster! Queue",
      },
      { id: "hhn-2021-house-the-hau", name: "The Haunting of Hill House", location_notes: null },
    ]);
    // One attraction at both parks, keeping the Hollywood half's rating.
    expect(
      await db.select(
        "SELECT park_id FROM attraction_parks WHERE attraction_id = 'hhn-2021-house-the-hau' ORDER BY 1",
      ),
    ).toEqual([{ park_id: "hollywood" }, { park_id: "orlando" }]);
    expect(await db.select("SELECT attraction_id FROM user_ratings")).toEqual([
      { attraction_id: "hhn-2021-house-the-hau" },
    ]);
  });

  it("never overwrites a name someone has already corrected", async () => {
    await db.execute(
      "UPDATE attractions SET name = 'Insidious (HHN 25)' WHERE id = 'hhn-2015-house-'",
    );
    await db.execute(
      "UPDATE attractions SET name = 'Hill House Orlando' WHERE id = 'hhn-2021-house-the-hau'",
    );

    migrateTo(17);

    const names = Object.fromEntries((await rows()).map((row) => [row.id, row.name]));
    expect(names["hhn-2015-house-"]).toBe("Insidious (HHN 25)");
    expect(names["hhn-2021-house-the-hau"]).toBe("Hill House Orlando");
  });

  it("does not merge when both Hill House halves are rated, and flags it", async () => {
    await db.execute(
      `INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES
         ('r1', 'hhn-2021-house-the-hau', 3, 3, 3),
         ('r2', 'hhn-2021-house-the-haunting-of-hill-house', 5, 5, 5)`,
    );

    migrateTo(17);

    expect(await db.select("SELECT id FROM user_ratings ORDER BY id")).toEqual([
      { id: "r1" },
      { id: "r2" },
    ]);
    expect(
      await db.select("SELECT kind, migration FROM migration_conflicts WHERE resolved_at IS NULL"),
    ).toEqual([{ kind: "canonical_personal_data", migration: "0017_scrape_name_fixes" }]);
  });

  it("does the same to a version 7 backup", async () => {
    const { db: current } = createTestDatabaseAtVersion(17);
    await seed(current);
    const data = (await createBackupRepository(current).exportData()) as unknown as Record<
      string,
      unknown
    >;

    const out = repairScrapedNames(data, "2026-10-10T00:00:00.000Z") as Record<
      string,
      Array<Record<string, unknown>>
    >;
    expect(out.attractions.map((row) => [row.id, row.name]).sort()).toEqual([
      ["hhn-2015-house-", "Insidious"],
      ["hhn-2015-house-run", "RUN: Blood Sweat and Fears"],
      ["hhn-2021-house-the-hau", "The Haunting of Hill House"],
    ]);
  });
});

describe("dataset names", () => {
  const withName = (name: string) =>
    readDataset(
      JSON.stringify({
        formatVersion: ARCHIVE_FORMAT_VERSION,
        events: [{ id: "hhn-2015", calendarYear: 2015, name: "HHN 2015" }],
        attractions: [{ id: "h1", eventId: "hhn-2015", type: "house", name, parks: ["orlando"] }],
      }),
    );

  it("refuses a name that is only a zero-width space", () => {
    expect(withName(ZWSP).ok).toBe(false);
  });

  it("refuses a name carrying an invisible character", () => {
    const result = withName(`${ZWSP}RUN: Blood Sweat and Fears`);
    expect(result.ok ? [] : result.errors).toEqual([
      expect.stringMatching(/name: contains an invisible character/),
    ]);
  });
});
