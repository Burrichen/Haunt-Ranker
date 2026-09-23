// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlExecutor } from "../database/types";
import { BACKUP_FORMAT_VERSION, type BackupFile } from "../models/backup";
import { createBackupRepository } from "../repositories/backupRepository";
import { createTestDatabase } from "../test/createTestDatabase";
import { buildBackupFile } from "./backupFormat";
import { importBackupFile } from "./importBackup";

/**
 * The import's safety promises, against a real SQLite database: a copy is
 * written before anything is deleted, and a failure part way through leaves
 * the database exactly as it was rather than half replaced.
 */
describe("importBackupFile", () => {
  let db: SqlExecutor;
  let writeSafetyBackup: ReturnType<typeof vi.fn>;

  async function seed(): Promise<void> {
    await db.execute(
      "INSERT INTO event_years (id, calendar_year, name) VALUES ('y1', 2101, 'Shadowfest 2101')",
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
       VALUES ('a1', 'y1', 'house', 'Moonlight Manor', 'moonlight-manor')`,
    );
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt1', 'a1', 4, 4, 4)",
    );
    await db.execute(
      "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', 'a1', 'Worth queueing for.')",
    );
  }

  /** A valid backup holding one different year and attraction. */
  async function incoming(): Promise<BackupFile> {
    const other = createTestDatabase();
    await other.execute(
      "INSERT INTO event_years (id, calendar_year, name) VALUES ('y9', 2102, 'Shadowfest 2102')",
    );
    await other.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
       VALUES ('a9', 'y9', 'scare_zone', 'Pumpkin Pier', 'pumpkin-pier')`,
    );

    return buildBackupFile({
      data: await createBackupRepository(other).exportData(),
      preferences: {},
      appVersion: "0.1.0",
      schemaVersion: 5,
    });
  }

  function dependencies() {
    return {
      repository: createBackupRepository(db),
      writeSafetyBackup: writeSafetyBackup as (contents: string) => Promise<string>,
      appVersion: "0.1.0",
      schemaVersion: 5,
      preferences: { ambientEffects: false },
    };
  }

  beforeEach(async () => {
    db = createTestDatabase();
    await seed();
    writeSafetyBackup = vi.fn().mockResolvedValue("C:/AppData/backups/before-import.json");
  });

  it("replaces the data and reports where the previous copy went", async () => {
    const outcome = await importBackupFile(await incoming(), dependencies());

    expect(outcome.safetyBackupPath).toBe("C:/AppData/backups/before-import.json");
    const rows = await db.select<Array<{ id: string }>>("SELECT id FROM attractions");
    expect(rows.map((row) => row.id)).toEqual(["a9"]);
  });

  it("writes the safety copy before anything is deleted", async () => {
    let attractionsWhenWritten = -1;
    writeSafetyBackup.mockImplementation(async () => {
      const rows = await db.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM attractions",
      );
      attractionsWhenWritten = rows[0].count;
      return "C:/AppData/backups/before-import.json";
    });

    await importBackupFile(await incoming(), dependencies());

    expect(attractionsWhenWritten).toBe(1);
  });

  it("puts the user's own ratings and notes in that copy", async () => {
    await importBackupFile(await incoming(), dependencies());

    const snapshot = JSON.parse(writeSafetyBackup.mock.calls[0][0] as string) as {
      formatVersion: number;
      preferences: Record<string, unknown>;
      data: { ratings: unknown[]; notes: Array<{ note: string }> };
    };

    expect(snapshot.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(snapshot.preferences).toEqual({ ambientEffects: false });
    expect(snapshot.data.ratings).toHaveLength(1);
    expect(snapshot.data.notes[0].note).toBe("Worth queueing for.");
  });

  it("puts everything back when the database rejects the backup half way through", async () => {
    // Structurally valid, but the second attraction repeats the first one's
    // slug within the same year — rejected by a UNIQUE constraint only once
    // the tables have already been emptied.
    const backup = await incoming();
    backup.data.attractions.push({ ...backup.data.attractions[0], id: "a10" });

    await expect(importBackupFile(backup, dependencies())).rejects.toThrow(/put back as it was/);

    const attractions = await db.select<Array<{ id: string }>>("SELECT id FROM attractions");
    const ratings = await db.select<Array<{ attraction_id: string; total: number }>>(
      "SELECT attraction_id, total FROM user_ratings",
    );
    const notes = await db.select<Array<{ note: string }>>("SELECT note FROM user_notes");

    expect(attractions.map((row) => row.id)).toEqual(["a1"]);
    expect(ratings).toEqual([{ attraction_id: "a1", total: 12 }]);
    expect(notes).toEqual([{ note: "Worth queueing for." }]);
  });

  it("names the safety file if it can't even put the data back", async () => {
    const repository = createBackupRepository(db);
    const failing = {
      ...repository,
      replaceAll: vi.fn().mockRejectedValue(new Error("disk gave up")),
    };

    await expect(
      importBackupFile(await incoming(), { ...dependencies(), repository: failing }),
    ).rejects.toThrow(/import C:\/AppData\/backups\/before-import\.json to restore it/);
  });

  it("never starts if the safety copy can't be written", async () => {
    writeSafetyBackup.mockRejectedValue(new Error("no room on the disk"));

    await expect(importBackupFile(await incoming(), dependencies())).rejects.toThrow(
      "no room on the disk",
    );

    const rows = await db.select<Array<{ id: string }>>("SELECT id FROM attractions");
    expect(rows.map((row) => row.id)).toEqual(["a1"]);
  });
});
