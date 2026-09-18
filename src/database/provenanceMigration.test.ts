// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "./types";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";

/**
 * 0005 rebuilds the `sources` table to widen its type CHECK, and dropping a
 * table fires foreign key actions — which would quietly delete every
 * attraction↔source link and null out every media.source_id. These tests
 * run the migration against a populated database to prove it doesn't.
 */
describe("0005_provenance", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(4));

    await db.execute(
      "INSERT INTO event_years (id, calendar_year, name) VALUES ('y1', 2101, 'Shadowfest 2101')",
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
       VALUES ('a1', 'y1', 'house', 'Moonlight Manor', 'moonlight-manor')`,
    );
    await db.execute(
      `INSERT INTO sources (id, source_type, title, url, publisher, published_at, notes, is_sample)
       VALUES ('s1', 'article', 'An article', 'https://example.invalid/a', 'A Publisher',
               '2101-09-01', 'Some notes', 1)`,
    );
    await db.execute(
      "INSERT INTO attraction_sources (attraction_id, source_id) VALUES ('a1', 's1')",
    );
    await db.execute(
      `INSERT INTO media (id, attraction_id, media_type, url, source_id)
       VALUES ('m1', 'a1', 'poster', 'https://example.invalid/p.jpg', 's1')`,
    );
  });

  async function countOf(table: string): Promise<number> {
    const rows = await db.select<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM ${table}`,
    );
    return rows[0].count;
  }

  it("keeps every source, with all of its fields", async () => {
    migrateTo(5);

    const rows = await db.select<
      Array<{
        id: string;
        source_type: string;
        title: string;
        url: string;
        publisher: string;
        published_at: string;
        notes: string;
        is_sample: number;
      }>
    >("SELECT * FROM sources");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "s1",
      source_type: "article",
      title: "An article",
      url: "https://example.invalid/a",
      publisher: "A Publisher",
      published_at: "2101-09-01",
      notes: "Some notes",
      is_sample: 1,
    });
  });

  it("keeps attraction↔source links through the table rebuild", async () => {
    expect(await countOf("attraction_sources")).toBe(1);

    migrateTo(5);

    const rows = await db.select<Array<{ attraction_id: string; source_id: string }>>(
      "SELECT * FROM attraction_sources",
    );
    expect(rows).toEqual([{ attraction_id: "a1", source_id: "s1" }]);
  });

  it("keeps media pointed at the source it came from", async () => {
    migrateTo(5);

    const rows = await db.select<Array<{ id: string; source_id: string | null }>>(
      "SELECT id, source_id FROM media",
    );
    expect(rows).toEqual([{ id: "m1", source_id: "s1" }]);
  });

  it("accepts the new promotional source type afterwards", async () => {
    migrateTo(5);

    await expect(
      db.execute(
        "INSERT INTO sources (id, source_type, title) VALUES ('s2', 'promotional', 'A flyer')",
      ),
    ).resolves.toBeDefined();
  });

  it("still rejects a source type that isn't allowed", async () => {
    migrateTo(5);

    await expect(
      db.execute("INSERT INTO sources (id, source_type, title) VALUES ('s3', 'hearsay', 'Rumour')"),
    ).rejects.toThrow(/CHECK constraint failed/i);
  });

  it("lets an event year cite a source", async () => {
    migrateTo(5);

    await db.execute(
      "INSERT INTO event_year_sources (event_year_id, source_id) VALUES ('y1', 's1')",
    );
    expect(await countOf("event_year_sources")).toBe(1);
  });

  it("removes an event year's source links when the year goes", async () => {
    migrateTo(5);
    await db.execute(
      "INSERT INTO event_year_sources (event_year_id, source_id) VALUES ('y1', 's1')",
    );

    await db.execute("DELETE FROM event_years WHERE id = 'y1'");

    expect(await countOf("event_year_sources")).toBe(0);
  });

  it("defaults existing media to reference-only, the one safe assumption", async () => {
    migrateTo(5);

    const rows = await db.select<Array<{ distribution: string }>>("SELECT distribution FROM media");
    expect(rows[0].distribution).toBe("reference");
  });

  it("only allows the three distribution policies", async () => {
    migrateTo(5);

    await expect(
      db.execute("UPDATE media SET distribution = 'whatever' WHERE id = 'm1'"),
    ).rejects.toThrow(/CHECK constraint failed/i);

    await expect(
      db.execute("UPDATE media SET distribution = 'bundled' WHERE id = 'm1'"),
    ).resolves.toBeDefined();
  });

  it("leaves no scratch tables behind", async () => {
    migrateTo(5);

    const rows = await db.select<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '\\_%' ESCAPE '\\'",
    );
    expect(rows).toEqual([]);
  });
});
