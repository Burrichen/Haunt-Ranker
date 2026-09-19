// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "./types";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";

/**
 * 0006 clears the fictional development dataset out of real databases, and
 * 0007 gives event years their own run dates. Both run against databases that
 * already hold data, so both are tested against one.
 */
describe("0006_retire_sample_data and 0007_event_dates", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(5));

    // A fictional year, exactly as `npm run db:seed` would leave it, with a
    // rating attached to one of its invented attractions.
    await db.execute(
      "INSERT INTO event_years (id, calendar_year, name, is_sample) VALUES ('y-sample', 2101, 'Shadowfest 2101', 1)",
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug, is_sample)
       VALUES ('a-sample', 'y-sample', 'house', 'Moonlight Manor', 'moonlight-manor', 1)`,
    );
    await db.execute(
      "INSERT INTO sources (id, source_type, title, is_sample) VALUES ('s-sample', 'other', 'Invented source', 1)",
    );
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt-sample', 'a-sample', 5, 5, 5)",
    );

    // A real year, which must come through untouched.
    await db.execute(
      "INSERT INTO event_years (id, calendar_year, name) VALUES ('y-real', 2024, 'Halloween Horror Nights 2024')",
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
       VALUES ('a-real', 'y-real', 'house', 'A Real House', 'a-real-house')`,
    );
    await db.execute(
      "INSERT INTO sources (id, source_type, title) VALUES ('s-real', 'article', 'A real write-up')",
    );
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt-real', 'a-real', 4, 3.5, 5)",
    );
    await db.execute(
      "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n-real', 'a-real', 'Queued twice.')",
    );
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k-real', 'houses:all', 'a-real', 0)",
    );
  });

  async function ids(table: string): Promise<string[]> {
    const rows = await db.select<Array<{ id: string }>>(`SELECT id FROM ${table} ORDER BY id`);
    return rows.map((row) => row.id);
  }

  it("removes the fictional records", async () => {
    migrateTo(6);

    expect(await ids("event_years")).toEqual(["y-real"]);
    expect(await ids("attractions")).toEqual(["a-real"]);
    expect(await ids("sources")).toEqual(["s-real"]);
  });

  it("leaves everything the user recorded about a real attraction", async () => {
    migrateTo(6);

    expect(await ids("user_ratings")).toEqual(["rt-real"]);
    expect(await ids("user_notes")).toEqual(["n-real"]);
    expect(await ids("user_rankings")).toEqual(["k-real"]);
  });

  it("takes a rating of a fictional attraction with it, by cascade", async () => {
    // The attraction it describes is invented, so the rating describes
    // nothing. Anything else would leave an orphan the schema forbids.
    migrateTo(6);

    const rows = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM user_ratings WHERE attraction_id = 'a-sample'",
    );
    expect(rows[0].count).toBe(0);
  });

  it("keeps the is_sample flag working, so development seeding still can", async () => {
    migrateTo(6);

    await db.execute(
      "INSERT INTO event_years (id, calendar_year, name, is_sample) VALUES ('y-new-sample', 2102, 'Shadowfest 2102', 1)",
    );
    const rows = await db.select<Array<{ is_sample: number }>>(
      "SELECT is_sample FROM event_years WHERE id = 'y-new-sample'",
    );
    expect(rows[0].is_sample).toBe(1);
  });

  it("gives event years run dates, empty until something fills them", async () => {
    migrateTo(6);
    migrateTo(7);

    const before = await db.select<Array<{ starts_on: string | null; ends_on: string | null }>>(
      "SELECT starts_on, ends_on FROM event_years WHERE id = 'y-real'",
    );
    expect(before[0]).toEqual({ starts_on: null, ends_on: null });

    await db.execute(
      "UPDATE event_years SET starts_on = '2024-09-06', ends_on = '2024-11-03' WHERE id = 'y-real'",
    );
    const after = await db.select<Array<{ starts_on: string; ends_on: string }>>(
      "SELECT starts_on, ends_on FROM event_years WHERE id = 'y-real'",
    );
    expect(after[0]).toEqual({ starts_on: "2024-09-06", ends_on: "2024-11-03" });
  });
});
