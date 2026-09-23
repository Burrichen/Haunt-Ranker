/**
 * Validates `data/hhn-archive.json` and writes a report to
 * `docs/research/hhn-import-validation.md`.
 *
 * Four stages, in the order an import would hit them:
 *
 *   1. `validateDataset` — the format's own validator: structure,
 *      enumerations, id shape and collisions, and references inside the file.
 *   2. Archive-specific checks this dataset has to satisfy beyond the format:
 *      duplicate records, year range, park associations, the cross-park
 *      merge/separate decisions, IP values, source and media relationships.
 *   3. Every cited YouTube URL, checked against YouTube itself.
 *   4. `previewImport` against a throwaway database with the real migrations
 *      applied — the checks only the stored archive can make.
 *
 * Exits non-zero if anything fails, so nothing that fails validation can be
 * imported.
 *
 * Usage: npm run data:validate [--skip-youtube]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { importArchiveDataset, previewImport } from "../src/archive/importDataset";
import type { ArchiveImportReport } from "../src/archive/importOperations";
import { readDataset } from "../src/archive/validateDataset";
import type { ArchiveDataset } from "../src/models/archiveDataset";
import { NodeSqliteExecutor } from "../src/database/nodeSqliteExecutor";
import { createArchiveImportRepository } from "../src/repositories/archiveImportRepository";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "data", "hhn-archive.json");
const MIGRATIONS = join(ROOT, "src-tauri", "migrations");
const REPORT = join(ROOT, "docs", "research", "hhn-import-validation.md");

const MIN_YEAR = 2010;
const MAX_YEAR = new Date().getFullYear();
const PARKS = new Set(["hollywood", "orlando"]);
const TYPES = new Set(["house", "scare_zone"]);

interface Check {
  name: string;
  detail: string;
  failures: string[];
}

const checks: Check[] = [];
function check(name: string, detail: string, failures: string[]): void {
  checks.push({ name, detail, failures });
}

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

/** Stage 2: what this dataset must satisfy beyond the format's own rules. */
function archiveChecks(dataset: ArchiveDataset): void {
  const { events, attractions, sources = [] } = dataset;
  const eventById = new Map(events.map((event) => [event.id, event]));
  const attractionById = new Map(attractions.map((attraction) => [attraction.id, attraction]));
  const sourceIds = new Set(sources.map((source) => source.id));

  const allIds = [
    ...events.map((e) => e.id),
    ...attractions.map((a) => a.id),
    ...sources.map((s) => s.id),
  ];
  check(
    "Stable unique ids",
    `${allIds.length} ids across events, attractions and sources`,
    allIds.filter((id, index) => allIds.indexOf(id) !== index).map((id) => `duplicate id "${id}"`),
  );

  check(
    "Required fields",
    "every attraction has a name, an event, a type and at least one park",
    attractions.flatMap((attraction) => {
      const problems: string[] = [];
      if (!attraction.name?.trim()) problems.push(`${attraction.id}: no name`);
      if (!eventById.has(attraction.eventId))
        problems.push(`${attraction.id}: unknown event "${attraction.eventId}"`);
      if (!TYPES.has(attraction.type)) problems.push(`${attraction.id}: type "${attraction.type}"`);
      if (!attraction.parks?.length) problems.push(`${attraction.id}: no park`);
      return problems;
    }),
  );

  check(
    "No accidental duplicates",
    "no two records share a name, year, type and park",
    (() => {
      const seen = new Map<string, string>();
      const problems: string[] = [];
      for (const attraction of attractions) {
        const year = eventById.get(attraction.eventId)?.calendarYear;
        for (const park of attraction.parks) {
          const key = `${year}|${attraction.type}|${park}|${attraction.name.toLowerCase()}`;
          const first = seen.get(key);
          if (first) {
            problems.push(
              `${attraction.id} repeats ${first} (${attraction.name}, ${year}, ${park})`,
            );
          } else {
            seen.set(key, attraction.id);
          }
        }
      }
      return problems;
    })(),
  );

  check(
    "Years in scope",
    `every event year is between ${MIN_YEAR} and ${MAX_YEAR}`,
    events
      .filter((event) => event.calendarYear < MIN_YEAR || event.calendarYear > MAX_YEAR)
      .map((event) => `${event.id}: ${event.calendarYear}`),
  );

  check(
    "Park associations",
    "parks are hollywood and/or orlando, never repeated",
    attractions.flatMap((attraction) => {
      const unknown = attraction.parks.filter((park) => !PARKS.has(park));
      const duplicated = attraction.parks.length !== new Set(attraction.parks).size;
      return [
        ...unknown.map((park) => `${attraction.id}: unknown park "${park}"`),
        ...(duplicated ? [`${attraction.id}: repeats a park`] : []),
      ];
    }),
  );

  // The canonical rule: for one haunt, the same name in the same season is
  // one attraction carrying both venues. A dataset that still holds two
  // records for such a pair disagrees with the database it imports into,
  // where migration 0009 merges exactly this shape.
  const byNormalisedName = new Map<string, typeof attractions>();
  for (const attraction of attractions) {
    const key = [
      attraction.eventId,
      attraction.type,
      attraction.name.trim().toLowerCase().replace(/\s+/g, " "),
    ].join("|");
    byNormalisedName.set(key, [...(byNormalisedName.get(key) ?? []), attraction]);
  }
  check(
    "One record per name per season",
    "the same name in the same season is one canonical attraction carrying both venues",
    [...byNormalisedName.values()]
      .filter((group) => group.length > 1)
      .map((group) => `${group.map((a) => a.id).join(" + ")}: same name in one season`),
  );

  const merged = attractions.filter((attraction) => attraction.parks.length > 1);
  const separated = attractions.filter((attraction) => attraction.variantName);
  check(
    "Cross-park decisions",
    `${merged.length} merged records cover both parks; ${separated.length} separated records carry a variant name and a relation`,
    [
      ...merged
        .filter((attraction) => attraction.variantName)
        .map((a) => `${a.id}: merged but also carries a variant name`),
      ...separated
        .filter((attraction) => attraction.parks.length !== 1)
        .map((a) => `${a.id}: separated but claims ${a.parks.length} parks`),
      ...separated
        .filter(
          (attraction) =>
            attraction.parks[0] === "orlando" &&
            !(attraction.related ?? []).some((relation) =>
              attractionById.has(relation.attractionId),
            ),
        )
        .map((a) => `${a.id}: separated Orlando record with no relation to its Hollywood twin`),
    ],
  );

  check(
    "Original / licensed values",
    "IP is original or licensed, and a licensed attraction names its franchise",
    attractions.flatMap((attraction) => {
      if (!attraction.ip) {
        return [];
      }
      const problems: string[] = [];
      if (!["original", "licensed"].includes(attraction.ip.type)) {
        problems.push(`${attraction.id}: ip.type "${attraction.ip.type}"`);
      }
      if (attraction.ip.type === "licensed" && !attraction.ip.franchise?.trim()) {
        problems.push(`${attraction.id}: licensed with no franchise`);
      }
      if (attraction.ip.type === "original" && attraction.ip.franchise) {
        problems.push(`${attraction.id}: original but names a franchise`);
      }
      return problems;
    }),
  );

  check(
    "Source relationships",
    "every cited source exists, and every source is cited by something",
    (() => {
      // A source can be cited by the record as a whole, or by one venue's
      // section of it — a walkthrough of one park's build, say.
      const citationsOf = (entity: (typeof events | typeof attractions)[number]): string[] => [
        ...(entity.sourceIds ?? []),
        ...("venueWiki" in entity ? (entity.venueWiki ?? []) : []).flatMap(
          (section) => section.sourceIds ?? [],
        ),
      ];
      const entities = [...events, ...attractions];
      const cited = new Set(entities.flatMap(citationsOf));

      return [
        ...entities.flatMap((entity) =>
          citationsOf(entity)
            .filter((id) => !sourceIds.has(id))
            .map((id) => `${entity.id} cites unknown source "${id}"`),
        ),
        ...[...sourceIds]
          .filter((id) => !cited.has(id))
          .map((id) => `source "${id}" is never cited`),
      ];
    })(),
  );

  check(
    "Media relationships",
    "media entries point at a source that exists and carry a URL",
    [...events, ...attractions].flatMap((entity) =>
      (entity.media ?? []).flatMap((media) => {
        const problems: string[] = [];
        if (!media.url?.trim()) problems.push(`${entity.id}/${media.id}: no url`);
        if (media.sourceId && !sourceIds.has(media.sourceId)) {
          problems.push(`${entity.id}/${media.id}: unknown source "${media.sourceId}"`);
        }
        if (media.distribution === "bundled" && !media.licenseNotes?.trim()) {
          problems.push(`${entity.id}/${media.id}: bundled without licence notes`);
        }
        return problems;
      }),
    ),
  );

  check(
    "Related-attraction ids",
    "every relation points at an attraction in this dataset",
    attractions.flatMap((attraction) =>
      (attraction.related ?? [])
        .filter((relation) => !attractionById.has(relation.attractionId))
        .map((relation) => `${attraction.id} → unknown "${relation.attractionId}"`),
    ),
  );
}

/** Stage 3: the cited videos, checked against YouTube. */
async function youtubeChecks(dataset: ArchiveDataset): Promise<void> {
  const videos = (dataset.sources ?? []).filter((source) => source.type === "youtube");
  const failures: string[] = [];

  for (const video of videos) {
    const match = video.url?.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (!match) {
      failures.push(`${video.id}: "${video.url}" is not a YouTube watch URL`);
      continue;
    }
    const oembed = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${match[1]}&format=json`;
    try {
      const response = await fetch(oembed);
      if (!response.ok) {
        failures.push(`${video.id}: ${video.url} responded ${response.status}`);
      }
    } catch (error) {
      failures.push(`${video.id}: ${(error as Error).message}`);
    }
  }

  check("YouTube URLs", `${videos.length} cited videos still resolve`, failures);
}

async function main(): Promise<void> {
  const parsed = readDataset(readFileSync(DATASET, "utf8"));

  if (!parsed.ok) {
    check("Dataset format", "structure, ids and internal references", parsed.errors);
    writeReport(null);
    console.error("Format validation failed. See the report.");
    process.exit(1);
  }

  const { dataset, summary } = parsed;
  console.log(
    `Dataset ${summary.datasetVersion ?? "(unversioned)"}: ${summary.events} events, ` +
      `${summary.attractions} attractions, ${summary.sources} sources, ${summary.relations} relations.\n`,
  );
  check("Dataset format", "structure, ids and internal references", []);
  archiveChecks(dataset);

  if (!process.argv.includes("--skip-youtube")) {
    await youtubeChecks(dataset);
  }

  // Not a plan: a real import into a throwaway database. Planning alone would
  // have missed a foreign key ordering bug that only showed up on execution.
  const scratch = createArchiveImportRepository(freshDatabase());
  const plan = await previewImport(dataset, scratch);
  check("Plan against an empty archive", "every write the import would make", plan.errors);

  let report: ArchiveImportReport | null = null;
  try {
    report = await importArchiveDataset(dataset, createArchiveImportRepository(freshDatabase()));
    check("Applied to a throwaway database", "the import actually runs end to end", []);
  } catch (error) {
    check("Applied to a throwaway database", "the import actually runs end to end", [
      (error as Error).message,
    ]);
  }

  writeReport(report);

  const failed = checks.filter((entry) => entry.failures.length > 0);
  for (const entry of checks) {
    const status = entry.failures.length === 0 ? "pass" : `FAIL (${entry.failures.length})`;
    console.log(`${status.padEnd(10)} ${entry.name}`);
  }
  console.log(`\nReport: ${REPORT}`);

  if (failed.length > 0) {
    console.error(`\n${failed.length} check(s) failed — nothing should be imported.`);
    process.exit(1);
  }
  console.log("All checks passed.");
}

function writeReport(report: ArchiveImportReport | null): void {
  const failed = checks.filter((entry) => entry.failures.length > 0);
  const lines = [
    "# Import validation report",
    "",
    `Generated by \`npm run data:validate\` on ${new Date().toISOString().slice(0, 10)} against`,
    "[`data/hhn-archive.json`](../../data/hhn-archive.json).",
    "",
    failed.length === 0
      ? "**Result: all checks passed.** The dataset is safe to import."
      : `**Result: ${failed.length} check(s) failed. Nothing should be imported until they are fixed.**`,
    "",
    "| Check | What it covers | Result |",
    "| ----- | -------------- | ------ |",
    ...checks.map(
      (entry) =>
        `| ${entry.name} | ${entry.detail} | ${entry.failures.length === 0 ? "pass" : `**${entry.failures.length} failure(s)**`} |`,
    ),
    "",
  ];

  for (const entry of failed) {
    lines.push(`## ${entry.name} — failures`, "");
    for (const failure of entry.failures.slice(0, 50)) {
      lines.push(`- ${failure}`);
    }
    if (entry.failures.length > 50) {
      lines.push(`- …and ${entry.failures.length - 50} more`);
    }
    lines.push("");
  }

  if (report) {
    lines.push(
      "## What the import writes",
      "",
      "Measured by running it for real against a throwaway database with the",
      "real migrations applied — not by planning it:",
      "",
      `- ${report.events.created} event years`,
      `- ${report.attractions.created} attractions`,
      `- ${report.sources.created} sources, ${report.citationsAdded} citations`,
      `- ${report.relations.created} relations`,
      `- ${report.characters.created} characters, ${report.media.created} media records`,
      `- ${report.parkChanges} park assignments`,
      "",
      "Nothing in this dataset can write to ratings, notes, rankings or settings:",
      "the format has no field for them and the importer has no path to those",
      "tables.",
      "",
    );
  }

  writeFileSync(REPORT, `${lines.join("\n")}\n`);
}

await main();
