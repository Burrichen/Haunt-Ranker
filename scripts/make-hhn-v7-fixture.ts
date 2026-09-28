/**
 * Records what Halloween Horror Nights looked like before multi-haunt
 * support, for the migration regression test.
 *
 * The recording has to be made by the app as it was, not reconstructed by
 * the app as it is — otherwise the test would only prove the current code
 * agrees with itself. So this checks out the last pre-multi-haunt build
 * (commit 475b8cd, schema 7) into a temporary worktree and, running *that*
 * build's own code:
 *
 *   1. migrates a fresh database to schema 7;
 *   2. imports that build's HHN archive dataset with that build's importer;
 *   3. writes the personal data in src/test/hhnPersonalSeed.ts;
 *   4. takes src/test/hhnSnapshot.ts — everything the screens show;
 *
 * and writes the database (as SQL), the snapshot and that build's own
 * backup export of the same data into src/test/fixtures/hhn-v7/. The worktree is removed afterwards.
 *
 * Usage: npx tsx scripts/make-hhn-v7-fixture.ts
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The last commit before 0008_haunts_and_seasons. */
const PRE_MULTI_HAUNT = "475b8cd051c7d18d2da390abf7b1a28a0dbbceb7";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "test", "fixtures", "hhn-v7");

const RUNNER = `
import { readFileSync, writeFileSync } from "node:fs";
import { importArchiveDataset } from "../src/archive/importDataset";
import { buildBackupFile, serializeBackup } from "../src/backup/backupFormat";
import { createBackupRepository } from "../src/repositories/backupRepository";
import { readDataset } from "../src/archive/validateDataset";
import { createArchiveImportRepository } from "../src/repositories/archiveImportRepository";
import { openTestDatabaseFile } from "../src/test/createTestDatabase";
import { seedPersonalData } from "../src/test/hhnPersonalSeed";
import { takeHhnSnapshot } from "../src/test/hhnSnapshot";

const [dbPath, snapshotPath, backupPath] = process.argv.slice(2);
const { db, close } = openTestDatabaseFile(dbPath);
const parsed = readDataset(readFileSync("data/hhn-archive.json", "utf8"));
if (!parsed.ok) throw new Error(parsed.errors.join("\\n"));
await importArchiveDataset(parsed.dataset, createArchiveImportRepository(db));
await seedPersonalData(db);
const snapshot = await takeHhnSnapshot(db, {
  rankingScope: (group) => (group === "all" ? "attractions:all" : group + ":all"),
});
writeFileSync(snapshotPath, JSON.stringify(snapshot) + "\\n");
// The same archive, as that build's own "Export backup" wrote it.
const backup = buildBackupFile({
  data: await createBackupRepository(db).exportData(),
  preferences: {},
  appVersion: "0.2.1",
  schemaVersion: 7,
  exportedAt: "2025-11-06T00:00:00.000Z",
});
writeFileSync(backupPath, serializeBackup(backup));
close();
`;

const scratch = mkdtempSync(join(tmpdir(), "hhn-v7-"));
const tree = join(scratch, "tree");

try {
  execFileSync("git", ["worktree", "add", "--detach", tree, PRE_MULTI_HAUNT], {
    cwd: ROOT,
    stdio: "inherit",
  });
  // The dependencies didn't change between the two builds.
  symlinkSync(join(ROOT, "node_modules"), join(tree, "node_modules"));
  for (const file of ["hhnSnapshot.ts", "hhnPersonalSeed.ts"]) {
    copyFileSync(join(ROOT, "src", "test", file), join(tree, "src", "test", file));
  }
  writeFileSync(join(tree, "scripts", "record-hhn-v7.ts"), RUNNER);

  const dbPath = join(scratch, "hhn-v7.db");
  mkdirSync(OUT, { recursive: true });
  execFileSync(
    "npx",
    [
      "tsx",
      "scripts/record-hhn-v7.ts",
      dbPath,
      join(OUT, "snapshot.json"),
      join(OUT, "backup-v1.json"),
    ],
    {
      cwd: tree,
      stdio: "inherit",
    },
  );
  writeFileSync(
    join(OUT, "archive.sql"),
    execFileSync("sqlite3", [dbPath, ".dump"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
  );
  console.log(`Recorded ${OUT}`);
} finally {
  execFileSync("git", ["worktree", "remove", "--force", tree], { cwd: ROOT, stdio: "ignore" });
  rmSync(scratch, { recursive: true, force: true });
}
