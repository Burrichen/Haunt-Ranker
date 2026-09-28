// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";
import type { SqlExecutor } from "./types";

/** 0013 widens what a media row can say, by rebuilding the table. Nothing on it may be lost. */
describe("0013_media_policy", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(12));
    await db.execute(
      "INSERT INTO event_years (id, haunt_id, calendar_year, name) VALUES ('y1', 'hhn', 2024, 'HHN 2024')",
    );
    await db.execute(
      "INSERT INTO attractions (id, event_year_id, attraction_type, name, slug) VALUES ('a1', 'y1', 'house', 'A', 'a')",
    );
    await db.execute(
      `INSERT INTO media (id, attraction_id, media_type, url, attribution, license_notes, distribution)
       VALUES ('m1', 'a1', 'poster', 'https://example.invalid/p.jpg', 'Universal', 'Press use', 'reference')`,
    );
    await db.execute(
      `INSERT INTO media (id, event_year_id, media_type, local_path, distribution)
       VALUES ('m2', 'y1', 'local_image', 'media/photo-1.jpg', 'local')`,
    );
  });

  it("keeps every media row exactly as it was", async () => {
    const before = await db.select("SELECT * FROM media ORDER BY id");
    migrateTo(13);

    expect(await db.select("SELECT * FROM media ORDER BY id")).toEqual(before);
  });

  it("accepts an unclear copy and an event map, and still refuses nonsense", async () => {
    migrateTo(13);

    await expect(
      db.execute(
        `INSERT INTO media (id, event_year_id, media_type, url, distribution)
         VALUES ('m3', 'y1', 'map', 'https://example.invalid/map.jpg', 'unclear')`,
      ),
    ).resolves.toBeDefined();
    await expect(
      db.execute(
        `INSERT INTO media (id, event_year_id, media_type, url, distribution)
         VALUES ('m4', 'y1', 'poster', 'https://example.invalid/x.jpg', 'found-it-online')`,
      ),
    ).rejects.toThrow(/CHECK constraint failed/i);
  });

  it("puts back the lookups by owner that an earlier rebuild dropped", async () => {
    migrateTo(13);

    const indexes = await db.select<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'media' ORDER BY name",
    );
    expect(indexes.map((row) => row.name)).toEqual(
      expect.arrayContaining(["idx_media_attraction", "idx_media_event_year"]),
    );
  });
});
