// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { KNOTTS_PRE_2021_RETURNS, upgradeBackup } from "../backup/backupFormat";
import { createBackupRepository } from "../repositories/backupRepository";
import { createTestDatabaseAtVersion } from "../test/createTestDatabase";
import type { SqlExecutor } from "./types";

/**
 * 0016 takes the two Knott's mazes that only *returned* during 2021–2026
 * (both debuted in 2019) out of the debut archive, preserving anything
 * personal about them first, and records the archive's coverage.
 */
const WAX_WORKS = "knotts-scary-farm:2024:maze:wax-works";
const ORIGINS = "knotts-scary-farm:2024:maze:origins-the-curse-of-calico";
const ROOM_13 = "knotts-scary-farm:2024:maze:room-13";
const HAND_ADDED = "hand-added-ghost-town-maze";

describe("0016_knotts_maze_archive", () => {
  let db: SqlExecutor;
  let migrateTo: (version: number) => void;

  const ids = async (sql: string) =>
    (await db.select<Array<{ id: string }>>(sql)).map((row) => row.id);

  /** The archive as an older build left it: both returns filed as 2024 mazes. */
  async function seed(target: SqlExecutor): Promise<void> {
    await target.execute(
      `INSERT INTO event_years (id, haunt_id, calendar_year, name)
       VALUES ('knotts-scary-farm:2024', 'knotts-scary-farm', 2024, 'Knott''s Scary Farm 2024')`,
    );
    for (const [id, name, debut] of [
      [WAX_WORKS, "Wax Works", 2019],
      [ORIGINS, "Origins: The Curse of Calico", 2019],
      [ROOM_13, "Room 13", 2023],
      [HAND_ADDED, "A Maze Added By Hand", 2010],
    ] as const) {
      await target.execute(
        `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug, debut_year)
         VALUES (?, 'knotts-scary-farm:2024', 'house', ?, ?, ?)`,
        [id, name, id, debut],
      );
      await target.execute(
        "INSERT INTO attraction_parks (attraction_id, park_id) VALUES (?, 'knotts-berry-farm')",
        [id],
      );
    }
    await target.execute(
      `INSERT INTO sources (id, source_type, title) VALUES
         ('only-wax', 'article', 'Only about Wax Works'),
         ('shared', 'article', 'About Wax Works and Room 13')`,
    );
    await target.execute(
      `INSERT INTO attraction_sources (attraction_id, source_id) VALUES
         (?, 'only-wax'), (?, 'shared'), (?, 'shared')`,
      [WAX_WORKS, WAX_WORKS, ROOM_13],
    );
  }

  beforeEach(async () => {
    ({ db, migrateTo } = createTestDatabaseAtVersion(15));
    await seed(db);
  });

  it("retires exactly the two pre-2021 returns, and nothing added by hand", async () => {
    migrateTo(16);

    expect(await ids("SELECT id FROM attractions ORDER BY id")).toEqual([HAND_ADDED, ROOM_13]);
    expect(await ids("SELECT id FROM sources ORDER BY id")).toEqual(["shared"]);
  });

  it("preserves a rating, note and ranking position on a retired maze", async () => {
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('r1', ?, 4, 4.5, 3)",
      [WAX_WORKS],
    );
    await db.execute("INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', ?, 'Wax!')", [
      ORIGINS,
    ]);
    await db.execute(
      "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k1', 'knotts-scary-farm:houses:all', ?, 0)",
      [WAX_WORKS],
    );

    migrateTo(16);

    const legacy = await db.select<
      Array<{ id: string; attraction_name: string; reason: string; payload: string }>
    >("SELECT id, attraction_name, reason, payload FROM legacy_personal_data ORDER BY id");
    expect(legacy.map((row) => [row.id, row.attraction_name, row.reason])).toEqual([
      ["note:n1", "Origins: The Curse of Calico", "outside-knotts-debut-archive"],
      ["ranking:k1", "Wax Works", "outside-knotts-debut-archive"],
      ["rating:r1", "Wax Works", "outside-knotts-debut-archive"],
    ]);
    expect(JSON.parse(legacy[2].payload)).toMatchObject({ theme: 4, fun: 4.5, fear: 3 });
    expect(await ids("SELECT id FROM user_ratings")).toEqual([]);
  });

  it("records what the Knott's archive covers, and nothing for HHN", async () => {
    migrateTo(16);

    const rows = await db.select<Array<{ id: string; archive_coverage: string | null }>>(
      "SELECT id, archive_coverage FROM haunts ORDER BY id",
    );
    expect(rows.find((row) => row.id === "hhn")?.archive_coverage).toBeNull();
    expect(rows.find((row) => row.id === "knotts-scary-farm")?.archive_coverage).toMatch(
      /debuted from 2021 to 2026.*Older Knott's history is incomplete/,
    );
  });

  it("does the same to a version 6 backup, so a restore can't bring them back", async () => {
    // A version 6 file written from that archive. Exported from a current
    // database, since exports always use the current schema.
    const { db: current } = createTestDatabaseAtVersion(16);
    await seed(current);
    await current.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('r1', ?, 4, 4.5, 3)",
      [WAX_WORKS],
    );
    const data = await createBackupRepository(current).exportData();

    const upgraded = upgradeBackup({
      formatVersion: 6,
      exportedAt: "2026-10-10T00:00:00.000Z",
      data,
    });
    expect(upgraded.ok).toBe(true);
    if (!upgraded.ok) {
      return;
    }
    const out = upgraded.raw.data as Record<string, Array<Record<string, unknown>>>;
    expect(out.attractions.map((row) => row.id).sort()).toEqual([HAND_ADDED, ROOM_13]);
    expect(out.ratings).toEqual([]);
    expect(out.legacyPersonalData.map((row) => [row.id, row.reason])).toEqual([
      ["rating:r1", "outside-knotts-debut-archive"],
    ]);
    expect(out.sources.map((row) => row.id)).toEqual(["shared"]);
    expect([...KNOTTS_PRE_2021_RETURNS].sort()).toEqual([ORIGINS, WAX_WORKS]);
  });
});
