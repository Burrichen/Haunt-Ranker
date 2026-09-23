import { describe, expect, it } from "vitest";
import { BACKUP_TABLES } from "../backup/backupTables";
import { ARCHIVE_TABLE_KEYS, LOCAL_TABLE_KEYS, PERSONAL_TABLE_KEYS } from "./archiveTables";

/**
 * The partition between "facts about the event" and "what the user thinks" is
 * the whole import contract in one line of code. These tests are what stops a
 * future table from quietly landing on the wrong side of it.
 */
describe("the archive / personal split", () => {
  it("classifies every table exactly once", () => {
    const classified = [...ARCHIVE_TABLE_KEYS, ...PERSONAL_TABLE_KEYS, ...LOCAL_TABLE_KEYS];
    const all = BACKUP_TABLES.map((table) => table.key);

    expect([...classified].sort()).toEqual([...all].sort());
    expect(new Set(classified).size).toBe(classified.length);
  });

  it("keeps ratings, notes, rankings and settings out of the archive side", () => {
    expect([...PERSONAL_TABLE_KEYS].sort()).toEqual(["notes", "rankings", "ratings", "settings"]);
    for (const key of PERSONAL_TABLE_KEYS) {
      expect(ARCHIVE_TABLE_KEYS).not.toContain(key);
    }
  });
});
