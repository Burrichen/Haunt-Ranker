/**
 * Imports a Haunt Pack into the app's real database, or removes a haunt a
 * pack brought in.
 *
 * This is the same code the app runs: `preparePackImport` validates and
 * plans, `applyPackImport` writes through the archive importer's undo log,
 * and the import is recorded in `haunt_packs` exactly as it is in Admin
 * Mode. Nothing here knows which haunt is being imported, and there is no
 * path through this script that a pack couldn't take through the interface.
 *
 * Removal exists because a pack can be wrong, or unwanted, and deleting a
 * haunt by hand means eleven tables in the right order. It refuses outright
 * if anything personal — a rating, a note, a ranking — points at the records
 * it would delete.
 *
 * Usage:
 *   npm run pack:import -- <path-to.hauntpack.json> [--dry-run]
 *   npm run pack:remove -- <haunt-id> [--dry-run]
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { DATABASE_URL } from "../src/database/client";
import { NodeSqliteExecutor } from "../src/database/nodeSqliteExecutor";
import { SCHEMA_VERSION } from "../src/database/schemaVersion";
import type { SqlExecutor } from "../src/database/types";
import { applyPackImport, PackImportError, preparePackImport } from "../src/packs/importHauntPack";
import { createArchiveImportRepository } from "../src/repositories/archiveImportRepository";
import { createHauntPackRepository } from "../src/repositories/hauntPackRepository";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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

function openDatabase(): { sqlite: DatabaseSync; db: SqlExecutor; path: string } {
  const path = resolveDatabasePath();
  if (!existsSync(path)) {
    console.error(
      `No database at:\n  ${path}\n\nLaunch Haunt Ranker once so its migrations create it.`,
    );
    process.exit(1);
  }
  const sqlite = new DatabaseSync(path);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  return { sqlite, db: new NodeSqliteExecutor(sqlite), path };
}

async function assertSchemaCurrent(db: SqlExecutor): Promise<void> {
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
}

function backup(path: string, label: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const copy = `${path}.before-${label}-${stamp}.bak`;
  copyFileSync(path, copy);
  console.log(`\nDatabase copied to:\n  ${copy}`);
  return copy;
}

async function importPack(packPath: string): Promise<void> {
  if (!existsSync(packPath)) {
    console.error(`No Haunt Pack at:\n  ${packPath}`);
    process.exit(1);
  }
  const text = readFileSync(packPath, "utf8");
  const { sqlite, db, path } = openDatabase();

  try {
    await assertSchemaCurrent(db);
    const before = await personalRowCounts(db);
    const packs = createHauntPackRepository(db);

    let prepared;
    try {
      prepared = preparePackImport(text, await packs.readState());
    } catch (error) {
      if (error instanceof PackImportError) {
        console.error(`\n${error.message} Nothing was written.\n`);
        for (const problem of error.problems) {
          console.error(`  - ${problem}`);
        }
        process.exit(1);
      }
      throw error;
    }

    const { preview } = prepared;
    console.log(
      `\n${preview.hauntName} (${preview.hauntId})` +
        `${preview.isNewHaunt ? " — new to this archive" : ""}\n` +
        `Pack ${preview.packId} version ${preview.packVersion}, schema ${preview.schema}`,
    );
    for (const [label, counts] of [
      ["seasons", preview.seasons],
      ["experiences", preview.experiences],
      ["venues", preview.venues],
      ["vocabulary", preview.experienceTypes],
      ["characters", preview.characters],
      ["sources", preview.sources],
    ] as const) {
      console.log(
        `  ${label.padEnd(12)} ${counts.created} new, ${counts.updated} updated, ${counts.unchanged} unchanged`,
      );
    }
    console.log(
      `  ${"citations".padEnd(12)} ${preview.citationsAdded} added\n` +
        `  ${"media refs".padEnd(12)} ${preview.mediaReferences}`,
    );
    for (const conflict of preview.conflicts) {
      console.log(
        `  conflict: ${conflict.name}${conflict.field ? ` (${conflict.field})` : ""} — ${conflict.detail}`,
      );
    }
    for (const warning of preview.warnings) {
      console.log(`  warning: ${warning}`);
    }

    if (DRY_RUN) {
      console.log("\n--dry-run: nothing was written.");
      return;
    }

    const copy = backup(path, "pack-import");
    await applyPackImport(prepared, {
      archive: createArchiveImportRepository(db),
      packs,
      newId: () => crypto.randomUUID(),
    });

    const after = await personalRowCounts(db);
    const moved = PERSONAL_TABLES.filter((table) => before[table] !== after[table]);
    if (moved.length > 0) {
      console.error(
        "\nThe import changed personal data, which a Haunt Pack must never do: " +
          moved.map((table) => `${table} ${before[table]} → ${after[table]}`).join(", "),
      );
      console.error(`Restore from ${copy}.`);
      process.exit(1);
    }

    console.log(
      `\nImported. Personal data untouched: ${PERSONAL_TABLES.map((table) => `${table} ${after[table]}`).join(", ")}`,
    );
  } finally {
    sqlite.close();
  }
}

/** Every table that has to be emptied, innermost first, to remove a haunt. */
async function removeHaunt(hauntId: string): Promise<void> {
  const { sqlite, db, path } = openDatabase();

  try {
    await assertSchemaCurrent(db);

    const haunt = await db.select<Array<{ name: string }>>("SELECT name FROM haunts WHERE id = ?", [
      hauntId,
    ]);
    if (haunt.length === 0) {
      console.error(`No haunt with id "${hauntId}" is in this archive.`);
      process.exit(1);
    }

    const attractionIds = (
      await db.select<Array<{ id: string }>>(
        `SELECT a.id FROM attractions a
         JOIN event_years e ON e.id = a.event_year_id
         WHERE e.haunt_id = ?`,
        [hauntId],
      )
    ).map((row) => row.id);

    // A haunt whose attractions someone has rated, noted or ranked is not a
    // pack's to withdraw. Personal data is never collateral.
    const personal: string[] = [];
    for (const [table, column] of [
      ["user_ratings", "attraction_id"],
      ["user_notes", "attraction_id"],
      ["user_rankings", "attraction_id"],
    ] as const) {
      const rows = await db.select<Array<{ count: number }>>(
        `SELECT COUNT(*) as count FROM ${table} t
         JOIN attractions a ON a.id = t.${column}
         JOIN event_years e ON e.id = a.event_year_id
         WHERE e.haunt_id = ?`,
        [hauntId],
      );
      if ((rows[0]?.count ?? 0) > 0) {
        personal.push(`${rows[0].count} in ${table}`);
      }
    }
    if (personal.length > 0) {
      console.error(
        `\n"${haunt[0].name}" can't be removed: ${personal.join(", ")} would go with it.\n` +
          "Delete those first if you really mean to.",
      );
      process.exit(1);
    }

    console.log(
      `\n"${haunt[0].name}" — ${attractionIds.length} attractions and everything filed under them.`,
    );

    if (DRY_RUN) {
      console.log("\n--dry-run: nothing was deleted.");
      return;
    }

    backup(path, "pack-remove");

    // Sources belong to no haunt, so they are handled by provenance and by
    // citation: a source one of this haunt's packs wrote, or one its records
    // cited, is a candidate — and afterwards only the ones nothing else
    // cites are deleted. A source two haunts share stays.
    const citedSourceIds = (
      await db.select<Array<{ id: string }>>(
        `SELECT DISTINCT id FROM sources
         WHERE source_pack_id IN (SELECT pack_id FROM haunt_packs WHERE haunt_id = ?)
         UNION
         SELECT DISTINCT source_id AS id FROM attraction_sources
         WHERE attraction_id IN (
           SELECT a.id FROM attractions a
           JOIN event_years e ON e.id = a.event_year_id
           WHERE e.haunt_id = ?
         )
         UNION
         SELECT DISTINCT source_id AS id FROM event_year_sources
         WHERE event_year_id IN (SELECT id FROM event_years WHERE haunt_id = ?)`,
        [hauntId, hauntId, hauntId],
      )
    ).map((row) => row.id);

    // Ordered by what references what: attractions carry most of the archive
    // with them through their own cascades, then the seasons, venues and
    // vocabulary, then the haunt itself.
    await db.execute(
      `DELETE FROM attractions WHERE event_year_id IN (SELECT id FROM event_years WHERE haunt_id = ?)`,
      [hauntId],
    );
    await db.execute("DELETE FROM event_years WHERE haunt_id = ?", [hauntId]);
    await db.execute(
      "DELETE FROM attraction_parks WHERE park_id IN (SELECT id FROM parks WHERE haunt_id = ?)",
      [hauntId],
    );
    await db.execute("DELETE FROM parks WHERE haunt_id = ?", [hauntId]);
    await db.execute("DELETE FROM experience_types WHERE haunt_id = ?", [hauntId]);
    await db.execute("DELETE FROM haunt_packs WHERE haunt_id = ?", [hauntId]);
    await db.execute("DELETE FROM haunts WHERE id = ?", [hauntId]);

    let sourcesRemoved = 0;
    for (const sourceId of citedSourceIds) {
      const result = await db.execute(
        `DELETE FROM sources
         WHERE id = ?
           AND NOT EXISTS (SELECT 1 FROM attraction_sources WHERE source_id = sources.id)
           AND NOT EXISTS (SELECT 1 FROM event_year_sources WHERE source_id = sources.id)`,
        [sourceId],
      );
      sourcesRemoved += result.rowsAffected;
    }

    const remaining = await db.select<Array<{ id: string; name: string }>>(
      "SELECT id, name FROM haunts ORDER BY sort_order",
    );
    console.log(
      `\nRemoved, with ${sourcesRemoved} of ${citedSourceIds.length} cited sources` +
        ` (the rest are cited elsewhere). Still here: ` +
        remaining.map((row) => `${row.name} (${row.id})`).join(", "),
    );
  } finally {
    sqlite.close();
  }
}

async function main(): Promise<void> {
  const [command, argument] = process.argv.slice(2).filter((value) => !value.startsWith("--"));

  if (command === "import" && argument) {
    await importPack(argument);
    return;
  }
  if (command === "remove" && argument) {
    await removeHaunt(argument);
    return;
  }

  console.error(
    "Usage:\n" +
      "  npm run pack:import -- <path-to.hauntpack.json> [--dry-run]\n" +
      "  npm run pack:remove -- <haunt-id> [--dry-run]",
  );
  process.exit(1);
}

await main();
