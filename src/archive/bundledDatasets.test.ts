// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlExecutor } from "../database/types";
import { createSettingsRepository } from "../repositories/settingsRepository";
import { createTestDatabase } from "../test/createTestDatabase";
import {
  appliedVersionKey,
  applyBundledDatasets,
  compareDatasetVersions,
  type BundledDataset,
} from "./bundledDatasets";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const read = (file: string) => JSON.parse(readFileSync(join(DATA, file), "utf8"));
const HHN = read("hhn-archive.json");
const KNOTTS = read("knotts-archive.json");

const shipped = (hhn = HHN, knotts = KNOTTS): BundledDataset[] => [
  { key: "hhn", load: async () => hhn },
  { key: "knotts", load: async () => knotts },
];

/**
 * What an installer upgrade does to someone's archive on first launch: the
 * shipped datasets go in, once, after a safety copy, and nothing personal
 * moves.
 */
describe("applyBundledDatasets", () => {
  let db: SqlExecutor;
  let writeSafetyCopy: ReturnType<typeof vi.fn<() => Promise<string>>>;

  const count = async (sql: string) => (await db.select<Array<{ n: number }>>(sql))[0].n;

  beforeEach(() => {
    db = createTestDatabase();
    writeSafetyCopy = vi.fn(async () => "backups/before-archive-update.json");
  });

  it("fills a new installation with both archives, after a safety copy", async () => {
    const result = await applyBundledDatasets({ db, writeSafetyCopy, datasets: shipped() });

    expect(result.applied.map((entry) => [entry.key, entry.version])).toEqual([
      ["hhn", HHN.datasetVersion],
      ["knotts", KNOTTS.datasetVersion],
    ]);
    expect(writeSafetyCopy).toHaveBeenCalledTimes(1);
    expect(
      await count(
        `SELECT COUNT(*) AS n FROM event_years WHERE haunt_id = 'knotts-scary-farm' AND calendar_year BETWEEN 2021 AND 2023`,
      ),
    ).toBe(3);
    expect(
      await count(
        `SELECT COUNT(*) AS n FROM attractions a JOIN event_years e ON e.id = a.event_year_id WHERE e.haunt_id = 'knotts-scary-farm'`,
      ),
    ).toBe(12);
    const settings = createSettingsRepository(db);
    expect(await settings.get(appliedVersionKey("knotts"))).toBe(KNOTTS.datasetVersion);
  });

  it("does nothing on the next launch — no import, no safety copy", async () => {
    await applyBundledDatasets({ db, writeSafetyCopy, datasets: shipped() });
    writeSafetyCopy.mockClear();

    const again = await applyBundledDatasets({ db, writeSafetyCopy, datasets: shipped() });

    expect(again).toEqual({ applied: [], safetyBackupPath: null });
    expect(writeSafetyCopy).not.toHaveBeenCalled();
  });

  it("applies only the dataset that is newer", async () => {
    await applyBundledDatasets({ db, writeSafetyCopy, datasets: shipped() });
    const newerKnotts = { ...KNOTTS, datasetVersion: "2099.1.1" };

    const result = await applyBundledDatasets({
      db,
      writeSafetyCopy,
      datasets: shipped(HHN, newerKnotts),
    });

    expect(result.applied.map((entry) => entry.key)).toEqual(["knotts"]);
  });

  it("never rolls an archive back to an older version", async () => {
    await createSettingsRepository(db).set(appliedVersionKey("hhn"), "2099.1.1");
    await createSettingsRepository(db).set(appliedVersionKey("knotts"), "2099.1.1");

    const result = await applyBundledDatasets({ db, writeSafetyCopy, datasets: shipped() });

    expect(result.applied).toEqual([]);
  });

  it("leaves ratings, notes and rankings exactly as they were", async () => {
    await applyBundledDatasets({ db, writeSafetyCopy, datasets: shipped() });
    const maze = "knotts-scary-farm:2024:maze:cinema-slasher";
    await db.execute(
      "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('r1', ?, 3, 3.5, 3)",
      [maze],
    );
    await db.execute("INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', ?, 'Mine.')", [
      maze,
    ]);

    await applyBundledDatasets({
      db,
      writeSafetyCopy,
      datasets: shipped(
        { ...HHN, datasetVersion: "2099.1.1" },
        { ...KNOTTS, datasetVersion: "2099.1.1" },
      ),
    });

    expect(await db.select("SELECT attraction_id, theme, fun, fear FROM user_ratings")).toEqual([
      { attraction_id: maze, theme: 3, fun: 3.5, fear: 3 },
    ]);
    expect(await db.select("SELECT note FROM user_notes")).toEqual([{ note: "Mine." }]);
  });

  it("refuses an invalid shipped dataset before writing anything", async () => {
    await expect(
      applyBundledDatasets({
        db,
        writeSafetyCopy,
        datasets: [{ key: "hhn", load: async () => ({ formatVersion: 1 }) }],
      }),
    ).rejects.toThrow(/shipped with this version is invalid/);
    expect(writeSafetyCopy).not.toHaveBeenCalled();
    expect(await count("SELECT COUNT(*) AS n FROM attractions")).toBe(0);
  });
});

describe("compareDatasetVersions", () => {
  it("compares dotted versions part by part", () => {
    expect(compareDatasetVersions("2026.10.1", "2026.9.2")).toBe(1);
    expect(compareDatasetVersions("2026.9.2", "2026.10.1")).toBe(-1);
    expect(compareDatasetVersions("2026.10.1", "2026.10.1")).toBe(0);
    expect(compareDatasetVersions("2026.10", "2026.10.1")).toBe(-1);
  });
});
