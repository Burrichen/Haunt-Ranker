/**
 * Validates `data/hhn-archive.json` and dry-runs it against a throwaway
 * database, so a dataset revision can be checked before it goes anywhere near
 * a real archive.
 *
 * Two stages, matching how an import actually runs:
 *
 *   1. `validateDataset` — structure, enumerations, id shape and collisions,
 *      and every reference inside the file.
 *   2. `previewImport` against a fresh in-memory database with the real
 *      migrations applied — the checks only the stored archive can make, plus
 *      a count of what an import would create.
 *
 * Usage: npm run data:validate
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
import { previewImport } from "../src/archive/importDataset";
import { readDataset } from "../src/archive/validateDataset";
import { NodeSqliteExecutor } from "../src/database/nodeSqliteExecutor";
import { createArchiveImportRepository } from "../src/repositories/archiveImportRepository";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "data", "hhn-archive.json");
const MIGRATIONS = join(ROOT, "src-tauri", "migrations");

function freshDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const file of readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  return new NodeSqliteExecutor(db);
}

async function main(): Promise<void> {
  const result = readDataset(readFileSync(DATASET, "utf8"));

  if (!result.ok) {
    console.error(`${DATASET} is not a valid dataset:\n`);
    for (const problem of result.errors) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }

  const { dataset, summary } = result;
  console.log("Format valid.");
  console.log(
    `  format v${summary.formatVersion} | dataset ${summary.datasetVersion ?? "(unversioned)"}`,
  );
  console.log(
    `  ${summary.events} events, ${summary.attractions} attractions, ${summary.sources} sources, ` +
      `${summary.characters} characters, ${summary.media} media, ${summary.relations} relations`,
  );

  const plan = await previewImport(dataset, createArchiveImportRepository(freshDatabase()));

  if (plan.errors.length > 0) {
    console.error("\nThe dataset can't be applied to an empty archive:\n");
    for (const problem of plan.errors) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }

  const { report } = plan;
  console.log("\nDry run against an empty archive:");
  console.log(`  events      ${report.events.created} created`);
  console.log(`  attractions ${report.attractions.created} created`);
  console.log(`  sources     ${report.sources.created} created`);
  console.log(`  media       ${report.media.created} created`);
  console.log(`  characters  ${report.characters.created} created`);
  console.log(`  relations   ${report.relations.created} created`);
  console.log(`  citations   ${report.citationsAdded} added`);
  console.log(`  parks       ${report.parkChanges} assignments`);

  for (const warning of report.warnings) {
    console.log(`  warning: ${warning}`);
  }

  // How much of the archive is actually documented, rather than merely listed.
  const withSummary = dataset.attractions.filter((attraction) => attraction.summary).length;
  const withIp = dataset.attractions.filter((attraction) => attraction.ip).length;
  const withSources = dataset.attractions.filter(
    (attraction) => (attraction.sourceIds ?? []).length > 0,
  ).length;
  console.log("\nCoverage:");
  console.log(
    `  ${withSources}/${dataset.attractions.length} attractions cite at least one source`,
  );
  console.log(`  ${withIp}/${dataset.attractions.length} have their IP classified`);
  console.log(`  ${withSummary}/${dataset.attractions.length} have a summary`);
}

await main();
