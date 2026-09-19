/**
 * Imports `data/hhn-archive.json` into the app's real database.
 *
 * The order is the safety:
 *
 *   1. validate the file, and refuse to go further if anything fails;
 *   2. refuse a database whose schema is behind this build, because the app's
 *      own migrations — not this script — are what move it forward;
 *   3. copy the database file aside before writing a single row;
 *   4. plan the whole import, refuse it as a whole if any part is impossible,
 *      and only then apply it.
 *
 * The importer never writes to ratings, notes, rankings or settings. This
 * script checks that it didn't, by counting those rows either side of the
 * import and refusing to report success if the numbers moved.
 *
 * Usage: npm run data:import [-- --dry-run]
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { importArchiveDataset, previewImport } from "../src/archive/importDataset";
import { readDataset } from "../src/archive/validateDataset";
import { DATABASE_URL } from "../src/database/client";
import { SCHEMA_VERSION } from "../src/database/schemaVersion";
import { NodeSqliteExecutor } from "../src/database/nodeSqliteExecutor";
import type { SqlExecutor } from "../src/database/types";
import { createArchiveImportRepository } from "../src/repositories/archiveImportRepository";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "data", "hhn-archive.json");
const DRY_RUN = process.argv.includes("--dry-run");

const PERSONAL_TABLES = ["user_ratings", "user_notes", "user_rankings", "user_settings"] as const;

/** Resolves to the same file `getDatabase()` opens in the running app. */
function resolveDatabasePath(): string {
  const override = process.env.HAUNT_RANKER_DB_PATH;
  if (override) {
    return override;
  }

  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error(
      "Could not determine the Windows AppData directory (APPDATA is not set). " +
        "Set HAUNT_RANKER_DB_PATH to the database file path instead.",
    );
  }

  const { identifier } = JSON.parse(
    readFileSync(join(ROOT, "src-tauri", "tauri.conf.json"), "utf8"),
  ) as { identifier: string };

  return join(appData, identifier, DATABASE_URL.replace(/^sqlite:/, ""));
}

async function personalRowCounts(db: SqlExecutor): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of PERSONAL_TABLES) {
    const rows = await db.select<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM ${table}`,
    );
    counts[table] = rows[0]?.count ?? 0;
  }
  return counts;
}

async function main(): Promise<void> {
  const parsed = readDataset(readFileSync(DATASET, "utf8"));
  if (!parsed.ok) {
    console.error("The dataset is not valid, so nothing was imported:\n");
    for (const problem of parsed.errors) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }
  console.log(
    `Dataset valid: ${parsed.summary.events} events, ${parsed.summary.attractions} attractions, ` +
      `${parsed.summary.sources} sources.`,
  );

  const databasePath = resolveDatabasePath();
  if (!existsSync(databasePath)) {
    console.error(
      `No database at:\n  ${databasePath}\n\nLaunch Haunt Ranker once so its migrations create it.`,
    );
    process.exit(1);
  }

  const sqlite = new DatabaseSync(databasePath);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const db = new NodeSqliteExecutor(sqlite);

  try {
    const applied = await db
      .select<Array<{ version: number | null }>>(
        "SELECT MAX(version) as version FROM _sqlx_migrations",
      )
      .then((rows) => rows[0]?.version ?? null)
      .catch(() => null);

    if (applied === null || applied < SCHEMA_VERSION) {
      console.error(
        `The database is at schema ${applied ?? "unknown"}; this build expects ${SCHEMA_VERSION}.\n` +
          "Launch Haunt Ranker once to run its migrations, then try again.",
      );
      process.exit(1);
    }

    const before = await personalRowCounts(db);
    const repository = createArchiveImportRepository(db);
    const plan = await previewImport(parsed.dataset, repository);

    if (plan.errors.length > 0) {
      console.error("\nThe dataset can't be applied to this archive, so nothing was written:\n");
      for (const problem of plan.errors) {
        console.error(`  - ${problem}`);
      }
      process.exit(1);
    }

    console.log(
      `\nPlan: ${plan.report.events.created} events and ${plan.report.attractions.created} attractions to create, ` +
        `${plan.report.events.updated + plan.report.attractions.updated} to update, ` +
        `${plan.report.events.unchanged + plan.report.attractions.unchanged} unchanged.`,
    );

    if (DRY_RUN) {
      console.log("\n--dry-run: nothing was written.");
      return;
    }

    const backup = `${databasePath}.before-import-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
    copyFileSync(databasePath, backup);
    console.log(`\nDatabase copied to:\n  ${backup}`);

    const report = await importArchiveDataset(parsed.dataset, repository);
    const after = await personalRowCounts(db);

    console.log("\nImported:");
    console.log(`  events      ${report.events.created} created, ${report.events.updated} updated`);
    console.log(
      `  attractions ${report.attractions.created} created, ${report.attractions.updated} updated`,
    );
    console.log(`  sources     ${report.sources.created} created`);
    console.log(`  relations   ${report.relations.created} created`);
    console.log(`  citations   ${report.citationsAdded} added`);
    console.log(`  parks       ${report.parkChanges} assignments`);
    for (const warning of report.warnings) {
      console.log(`  warning: ${warning}`);
    }

    const moved = PERSONAL_TABLES.filter((table) => before[table] !== after[table]);
    if (moved.length > 0) {
      console.error(
        `\nThe import changed personal data, which it must never do: ` +
          moved.map((table) => `${table} ${before[table]} → ${after[table]}`).join(", "),
      );
      console.error(`Restore from ${backup}.`);
      process.exit(1);
    }
    console.log(
      `\nPersonal data untouched: ${PERSONAL_TABLES.map((table) => `${table} ${after[table]}`).join(", ")}`,
    );
  } finally {
    sqlite.close();
  }
}

await main();
