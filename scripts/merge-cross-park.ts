/**
 * Applies the canonical cross-park rule to the dataset file.
 *
 * For Halloween Horror Nights, the same attraction name in the same season
 * is ONE canonical attraction carrying both venues — one rating, one note,
 * one place in a ranking — however much the two builds differed. Migration
 * 0009 applies that rule to a database that already holds separate records;
 * this applies it to the dataset, so a fresh install that imports the file
 * ends up with exactly the same archive as an upgraded one.
 *
 * Nothing is thrown away. Each record's own facts — where it stood, what
 * was written about it, which sources describe it — move into a venue
 * section under the canonical record, and the id it used to have is kept in
 * `previousIds` so any rating attached to it follows.
 *
 * Run with `npx tsx scripts/merge-cross-park.ts` (add `--dry` to see the
 * report without writing). The survivor is the lowest id in the group,
 * matching migration 0009 exactly.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ArchiveAttraction,
  ArchiveDataset,
  ArchiveVenueWiki,
} from "../src/models/archiveDataset";

const DATASET = join(process.cwd(), "data", "hhn-archive.json");
const dryRun = process.argv.includes("--dry");

function normalisedName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function groupKey(attraction: ArchiveAttraction): string {
  return [attraction.eventId, attraction.type, normalisedName(attraction.name)].join("|");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** What one record knew that the canonical record can't say for both venues. */
function venueSection(record: ArchiveAttraction, sharedLocation: boolean): ArchiveVenueWiki | null {
  const section: ArchiveVenueWiki = { park: record.parks[0] };
  let written = false;

  if (record.location && !sharedLocation) {
    section.location = record.location;
    written = true;
  }
  for (const [from, to] of [
    ["overview", "overview"],
    ["story", "story"],
    ["experience", "experience"],
    ["development", "development"],
  ] as const) {
    const value = record.wiki?.[from];
    if (value) {
      section[to] = value;
      written = true;
    }
  }
  if (record.sourceIds && record.sourceIds.length > 0) {
    section.sourceIds = [...record.sourceIds];
    written = true;
  }

  return written ? section : null;
}

function merge(group: ArchiveAttraction[]): {
  canonical: ArchiveAttraction;
  removed: ArchiveAttraction[];
} {
  const ordered = [...group].sort((a, b) => a.id.localeCompare(b.id));
  const [first, ...rest] = ordered;
  const ids = new Set(ordered.map((record) => record.id));

  const locations = unique(ordered.map((record) => record.location ?? null).filter(Boolean));
  const sharedLocation = locations.length === 1;

  const canonical: ArchiveAttraction = {
    ...first,
    // The ids stay as they were assigned; the slug is what a reader sees,
    // so it loses the park suffix the split records carried.
    slug: first.slug ?? first.id.replace(/-(hollywood|orlando)$/, ""),
    previousIds: unique([...(first.previousIds ?? []), ...rest.map((record) => record.id)]),
    parks: unique(ordered.flatMap((record) => record.parks)),
    // "Hollywood version" described a record that no longer exists on its own.
    variantName: null,
    location: sharedLocation ? (locations[0] as string) : null,
    summary: ordered.find((record) => record.summary)?.summary ?? null,
    ip: ordered.find((record) => record.ip)?.ip ?? null,
    characters: unique(ordered.flatMap((record) => record.characters ?? [])),
    media: unique(ordered.flatMap((record) => record.media ?? [])),
    // A source that spoke for one build is attributed to that venue below,
    // so only what every record cited stays on the record itself.
    sourceIds: [],
    // A relation between two records that are now one record says nothing.
    related: unique(
      ordered
        .flatMap((record) => record.related ?? [])
        .filter((relation) => !ids.has(relation.attractionId)),
    ),
  };

  const sections = ordered
    .map((record) => venueSection(record, sharedLocation))
    .filter((section): section is ArchiveVenueWiki => section !== null);
  if (sections.length > 0) {
    canonical.venueWiki = sections;
  }
  if (sharedLocation) {
    // Cited by every record, so it belongs to the record rather than a venue.
    canonical.sourceIds = unique(ordered.flatMap((record) => record.sourceIds ?? []));
    delete canonical.venueWiki;
  }
  if (canonical.related?.length === 0) {
    delete canonical.related;
  }
  if (canonical.characters?.length === 0) {
    delete canonical.characters;
  }
  if (canonical.media?.length === 0) {
    delete canonical.media;
  }
  if (canonical.sourceIds?.length === 0) {
    delete canonical.sourceIds;
  }

  return { canonical, removed: rest };
}

function main(): void {
  const dataset = JSON.parse(readFileSync(DATASET, "utf8")) as ArchiveDataset;

  const groups = new Map<string, ArchiveAttraction[]>();
  for (const attraction of dataset.attractions) {
    const key = groupKey(attraction);
    groups.set(key, [...(groups.get(key) ?? []), attraction]);
  }

  const replacement = new Map<string, string>();
  const merged: ArchiveAttraction[] = [];
  const lines: string[] = [];

  for (const attraction of dataset.attractions) {
    const group = groups.get(groupKey(attraction)) ?? [];
    if (group.length === 1) {
      merged.push(attraction);
      continue;
    }
    const { canonical, removed } = merge(group);
    if (canonical.id !== attraction.id) {
      continue; // Handled when its group's canonical record comes round.
    }
    for (const record of removed) {
      replacement.set(record.id, canonical.id);
    }
    merged.push(canonical);
    lines.push(
      `${canonical.name} (${canonical.eventId}): ${canonical.id} absorbs ` +
        `${removed.map((record) => record.id).join(", ")}`,
    );
  }

  // Anything pointing at a record that no longer exists now points at the
  // canonical one; a relation that becomes a self-relation is dropped.
  for (const attraction of merged) {
    if (!attraction.related) {
      continue;
    }
    const related = attraction.related
      .map((relation) => ({
        ...relation,
        attractionId: replacement.get(relation.attractionId) ?? relation.attractionId,
      }))
      .filter((relation) => relation.attractionId !== attraction.id);
    if (related.length === 0) {
      delete attraction.related;
    } else {
      attraction.related = related;
    }
  }

  dataset.attractions = merged;

  console.log(`${lines.length} cross-park pairs merged into one record each.`);
  for (const line of lines.slice(0, 10)) {
    console.log(`  ${line}`);
  }
  if (lines.length > 10) {
    console.log(`  …and ${lines.length - 10} more.`);
  }
  console.log(`${merged.length} attractions remain.`);

  if (dryRun) {
    console.log("\nDry run — nothing written.");
    return;
  }
  writeFileSync(DATASET, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`\nWritten to ${DATASET}. Run \`npm run data:validate\` next.`);
}

main();
