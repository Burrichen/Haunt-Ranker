/**
 * Development utility for the fictional sample dataset (see
 * `src/database/devSampleData.ts`). Connects to the app's real on-disk
 * SQLite database and seeds, clears, or resets that sample data — it
 * never touches real/imported data, which is never marked `is_sample`.
 *
 * Usage (see the `db:*` scripts in package.json):
 *   npm run db:seed   — create the fictional sample dataset
 *   npm run db:clear  — remove it
 *   npm run db:reset  — clear then re-create it (safe to run repeatedly)
 *
 * Requires the app to have been launched at least once already (so its
 * migrations have created the schema) — this script deliberately does
 * NOT run migrations itself, to avoid ever conflicting with the Tauri
 * app's own migration bookkeeping.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { DATABASE_URL } from "../src/database/client";
import {
  clearDevSampleData,
  resetDevSampleData,
  seedDevSampleData,
  type DevSampleDataSummary,
} from "../src/database/devSampleData";
import { NodeSqliteExecutor } from "../src/database/nodeSqliteExecutor";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

type Command = "seed" | "clear" | "reset";

function parseCommand(): Command {
  const arg = process.argv[2];
  if (arg === "seed" || arg === "clear" || arg === "reset") {
    return arg;
  }
  console.error("Usage: dev-db <seed|clear|reset>  (see npm run db:seed / db:clear / db:reset)");
  process.exit(1);
}

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

  const tauriConf = JSON.parse(
    readFileSync(join(PROJECT_ROOT, "src-tauri", "tauri.conf.json"), "utf8"),
  ) as { identifier: string };
  const fileName = DATABASE_URL.replace(/^sqlite:/, "");

  return join(appData, tauriConf.identifier, fileName);
}

function formatSummary(summary: DevSampleDataSummary): string {
  return Object.entries(summary)
    .map(([key, value]) => `${key} ${value}`)
    .join(", ");
}

async function main(): Promise<void> {
  const command = parseCommand();
  const dbPath = resolveDatabasePath();

  if (!existsSync(dbPath)) {
    console.error(
      `No database found at:\n  ${dbPath}\n\n` +
        "Run the app at least once first (npm run tauri dev) so its migrations " +
        "create the schema, then re-run this command.",
    );
    process.exit(1);
  }

  const sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec("PRAGMA foreign_keys = ON;");
  const db = new NodeSqliteExecutor(sqliteDb);

  try {
    if (command === "seed") {
      const summary = await seedDevSampleData(db);
      console.log(`Seeded dev sample data (${formatSummary(summary)}).`);
    } else if (command === "clear") {
      await clearDevSampleData(db);
      console.log("Cleared all dev sample data.");
    } else {
      const summary = await resetDevSampleData(db);
      console.log(`Reset dev sample data (${formatSummary(summary)}).`);
    }
  } finally {
    sqliteDb.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
