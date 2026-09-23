import type {
  ArchiveAttraction,
  ArchiveDataset,
  ArchiveEvent,
  ArchiveMedia,
  ArchiveSource,
} from "../models/archiveDataset";
import { generateId } from "../repositories/id";

/**
 * The writes an import would make, worked out in full before any of them run.
 *
 * Every operation carries what it needs to be undone, because an import that
 * fails half way through must leave the archive as it found it. Nothing here
 * can express a write to a personal table — the only operation that touches
 * one is `rename`, which moves rows to a new attraction id without reading
 * what they say.
 */
export type ArchiveOperation =
  | { kind: "insert"; table: string; id: string; row: Record<string, unknown> }
  | {
      kind: "update";
      table: string;
      id: string;
      changes: Record<string, unknown>;
      previous: Record<string, unknown>;
    }
  | { kind: "link"; table: string; key: Record<string, string | null> }
  | { kind: "unlink"; table: string; key: Record<string, string> }
  | { kind: "rename"; entity: "attraction" | "eventYear"; from: string; to: string };

export interface ImportCounts {
  created: number;
  updated: number;
  unchanged: number;
}

export interface ArchiveImportReport {
  events: ImportCounts;
  attractions: ImportCounts;
  sources: ImportCounts;
  characters: ImportCounts;
  relations: ImportCounts;
  media: ImportCounts;
  /** Citations are links, not records — and they are only ever added. */
  citationsAdded: number;
  parkChanges: number;
  renames: Array<{ entity: "attraction" | "eventYear"; from: string; to: string }>;
  /**
   * Ratings, notes and ranking positions carried across a rename. They are
   * moved, never read or altered; any other number here would be a bug.
   */
  personalRowsRepointed: number;
  warnings: string[];
}

/** Everything already in the database that an import compares against. */
export interface ArchiveState {
  eventYears: Map<string, Record<string, unknown>>;
  attractions: Map<string, Record<string, unknown>>;
  characters: Map<string, Record<string, unknown>>;
  relations: Map<string, Record<string, unknown>>;
  sources: Map<string, Record<string, unknown>>;
  media: Map<string, Record<string, unknown>>;
  attractionParks: Set<string>;
  /** `attraction id|season id` for every appearance already recorded. */
  seasonAppearances: Set<string>;
  /** `attraction id|venue id` → the stored venue-specific wiki row. */
  venueWiki: Map<string, Record<string, unknown>>;
  attractionSources: Set<string>;
  eventYearSources: Set<string>;
  /** Attraction id → how many ratings, notes and ranking rows point at it. */
  personalRowCounts: Map<string, number>;
}

export interface PlannedImport {
  operations: ArchiveOperation[];
  report: ArchiveImportReport;
  /** Problems only the stored archive could reveal, e.g. a relation to an unknown attraction. */
  errors: string[];
}

/** Ids are `[a-z0-9-]`, so a pipe can never appear inside one. */
const SEPARATOR = "|";

export function pairKey(first: string, second: string): string {
  return `${first}${SEPARATOR}${second}`;
}

/**
 * A relation has no id of its own in a dataset, so it is matched on the triple
 * the database already treats as unique: who, to whom, in what way.
 *
 * Deriving an id from the two attraction ids would look tidier and would break
 * the moment one of them changed — the relation would come back as a duplicate
 * of itself.
 */
export function relationKey(attractionId: string, relatedId: string, type: string): string {
  return [attractionId, relatedId, type].join(SEPARATOR);
}

/** The prose columns of a venue-specific section, in the order they are written. */
const VENUE_WIKI_COLUMNS = [
  "overview",
  "story_lore",
  "experience_description",
  "development_notes",
  "location_notes",
];

function emptyCounts(): ImportCounts {
  return { created: 0, updated: 0, unchanged: 0 };
}

function nullable(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function eventRow(event: ArchiveEvent): Record<string, unknown> {
  return {
    haunt_id: event.hauntId ?? "hhn",
    calendar_year: event.calendarYear,
    name: event.name,
    description: nullable(event.description),
    source_notes: nullable(event.sourceNotes),
    starts_on: nullable(event.dates?.start),
    ends_on: nullable(event.dates?.end),
  };
}

function attractionRow(attraction: ArchiveAttraction): Record<string, unknown> {
  return {
    event_year_id: attraction.eventId,
    attraction_type: attraction.type,
    name: attraction.name,
    slug: attraction.slug ?? attraction.id,
    variant_name: nullable(attraction.variantName),
    ip_type: attraction.ip ? attraction.ip.type : null,
    franchise_name: attraction.ip ? nullable(attraction.ip.franchise) : null,
    short_summary: nullable(attraction.summary),
    full_overview: nullable(attraction.wiki?.overview),
    story_lore: nullable(attraction.wiki?.story),
    experience_description: nullable(attraction.wiki?.experience),
    development_notes: nullable(attraction.wiki?.development),
    opening_date: nullable(attraction.dates?.start),
    closing_date: nullable(attraction.dates?.end),
    location_notes: nullable(attraction.location),
  };
}

function sourceRow(source: ArchiveSource): Record<string, unknown> {
  return {
    source_type: source.type,
    title: source.title,
    url: nullable(source.url),
    publisher: nullable(source.publisher),
    published_at: nullable(source.publishedAt),
    notes: nullable(source.notes),
  };
}

function mediaRow(media: ArchiveMedia, owner: Record<string, string | null>) {
  return {
    ...owner,
    media_type: media.kind,
    url: media.url,
    local_path: null,
    source_id: nullable(media.sourceId),
    attribution: nullable(media.attribution),
    license_notes: nullable(media.licenseNotes),
    distribution: media.distribution ?? "reference",
  };
}

/** The columns of a stored row that differ from what the dataset says. */
function changedColumns(
  desired: Record<string, unknown>,
  existing: Record<string, unknown>,
): { changes: Record<string, unknown>; previous: Record<string, unknown> } {
  const changes: Record<string, unknown> = {};
  const previous: Record<string, unknown> = {};

  for (const [column, value] of Object.entries(desired)) {
    const current = existing[column] ?? null;
    if ((value ?? null) !== current) {
      changes[column] = value ?? null;
      previous[column] = current;
    }
  }

  return { changes, previous };
}

/** Re-keys a set of links whose first element is the id being renamed. */
function remapLinks(links: Set<string>, from: string, to: string): void {
  for (const link of [...links]) {
    const [owner, other] = link.split(SEPARATOR);
    if (owner === from) {
      links.delete(link);
      links.add(pairKey(to, other));
    }
  }
}

/** The same, for a set keyed the other way round — appearances by season. */
function remapSecond(links: Set<string>, from: string, to: string): void {
  for (const link of [...links]) {
    const [owner, other] = link.split(SEPARATOR);
    if (other === from) {
      links.delete(link);
      links.add(pairKey(owner, to));
    }
  }
}

/** Re-keys a map of rows keyed `owner id|other id`, following a rename. */
function remapKeyedRows(
  rows: Map<string, Record<string, unknown>>,
  column: string,
  from: string,
  to: string,
): void {
  for (const [key, row] of [...rows]) {
    const [owner, other] = key.split(SEPARATOR);
    if (owner === from) {
      rows.delete(key);
      rows.set(pairKey(to, other), { ...row, [column]: to });
    }
  }
}

function remapColumn(
  rows: Map<string, Record<string, unknown>>,
  column: string,
  from: string,
  to: string,
): void {
  for (const row of rows.values()) {
    if (row[column] === from) {
      row[column] = to;
    }
  }
}

/**
 * Brings the in-memory picture of the archive up to date with a rename, so
 * that everything planned afterwards is planned against the new id.
 *
 * Without this the planner would go on believing the old id owns the parks,
 * the characters and the media, and would cheerfully plan to create them all
 * over again.
 */
function remapState(
  state: ArchiveState,
  entity: "attraction" | "eventYear",
  from: string,
  to: string,
): void {
  if (entity === "attraction") {
    const row = state.attractions.get(from);
    if (row) {
      state.attractions.delete(from);
      state.attractions.set(to, { ...row, id: to, slug: to });
    }
    remapLinks(state.attractionParks, from, to);
    remapLinks(state.seasonAppearances, from, to);
    remapKeyedRows(state.venueWiki, "attraction_id", from, to);
    remapLinks(state.attractionSources, from, to);
    remapColumn(state.characters, "attraction_id", from, to);
    remapColumn(state.media, "attraction_id", from, to);
    remapColumn(state.relations, "attraction_id", from, to);
    remapColumn(state.relations, "related_attraction_id", from, to);
    return;
  }

  const row = state.eventYears.get(from);
  if (row) {
    state.eventYears.delete(from);
    state.eventYears.set(to, { ...row, id: to });
  }
  remapLinks(state.eventYearSources, from, to);
  remapSecond(state.seasonAppearances, from, to);
  remapColumn(state.attractions, "event_year_id", from, to);
  remapColumn(state.media, "event_year_id", from, to);
}

/**
 * Resolves an entry's id against what's stored, following `previousIds` when
 * the entry has been renamed since the last dataset.
 *
 * Both ids existing is not something to guess at: the importer says so and
 * leaves both alone, exactly as Admin Mode refuses to merge records on a name.
 */
function resolveRename(
  entry: { id: string; previousIds?: string[] },
  entity: "attraction" | "eventYear",
  state: ArchiveState,
  operations: ArchiveOperation[],
  report: ArchiveImportReport,
): void {
  const stored = entity === "attraction" ? state.attractions : state.eventYears;
  const previousIds = entry.previousIds ?? [];

  if (stored.has(entry.id)) {
    const alsoStored = previousIds.filter((old) => stored.has(old));
    if (alsoStored.length > 0) {
      report.warnings.push(
        `"${entry.id}" and "${alsoStored.join('", "')}" both exist in the archive, so nothing ` +
          "was merged. Which record to keep is a decision for a person, not an importer.",
      );
    }
    return;
  }

  const previous = previousIds.find((old) => stored.has(old));
  if (previous === undefined) {
    return;
  }

  operations.push({ kind: "rename", entity, from: previous, to: entry.id });
  report.renames.push({ entity, from: previous, to: entry.id });
  if (entity === "attraction") {
    report.personalRowsRepointed += state.personalRowCounts.get(previous) ?? 0;
  }
  remapState(state, entity, previous, entry.id);
}

function upsert(
  table: string,
  id: string,
  desired: Record<string, unknown>,
  existing: Record<string, unknown> | undefined,
  counts: ImportCounts,
  operations: ArchiveOperation[],
  extraOnInsert: Record<string, unknown> = {},
): void {
  if (!existing) {
    operations.push({ kind: "insert", table, id, row: { id, ...desired, ...extraOnInsert } });
    counts.created += 1;
    return;
  }

  const { changes, previous } = changedColumns(desired, existing);
  if (Object.keys(changes).length === 0) {
    counts.unchanged += 1;
    return;
  }

  operations.push({ kind: "update", table, id, changes, previous });
  counts.updated += 1;
}

/**
 * Works out everything an import would do, and everything that would stop it.
 *
 * Nothing is written here. The result is both the preview a person approves
 * and the exact list of writes that runs afterwards, so what they agreed to is
 * what happens.
 */
export function planImport(dataset: ArchiveDataset, state: ArchiveState): PlannedImport {
  const operations: ArchiveOperation[] = [];
  // Relations are planned separately and appended last, because one can point
  // at an attraction defined further down the file.
  const relationOperations: ArchiveOperation[] = [];
  const errors: string[] = [];
  const report: ArchiveImportReport = {
    events: emptyCounts(),
    attractions: emptyCounts(),
    sources: emptyCounts(),
    characters: emptyCounts(),
    relations: emptyCounts(),
    media: emptyCounts(),
    citationsAdded: 0,
    parkChanges: 0,
    renames: [],
    personalRowsRepointed: 0,
    warnings: [],
  };

  for (const source of dataset.sources ?? []) {
    upsert(
      "sources",
      source.id,
      sourceRow(source),
      state.sources.get(source.id),
      report.sources,
      operations,
      { is_sample: 0 },
    );
  }

  const addMedia = (entries: ArchiveMedia[] | undefined, owner: Record<string, string | null>) => {
    for (const media of entries ?? []) {
      upsert(
        "media",
        media.id,
        mediaRow(media, owner),
        state.media.get(media.id),
        report.media,
        operations,
      );
    }
  };

  for (const event of dataset.events) {
    resolveRename(event, "eventYear", state, operations, report);
    upsert(
      "event_years",
      event.id,
      eventRow(event),
      state.eventYears.get(event.id),
      report.events,
      operations,
      { is_sample: 0 },
    );

    for (const sourceId of event.sourceIds ?? []) {
      if (!state.eventYearSources.has(pairKey(event.id, sourceId))) {
        operations.push({
          kind: "link",
          table: "event_year_sources",
          key: { event_year_id: event.id, source_id: sourceId },
        });
        report.citationsAdded += 1;
      }
    }

    addMedia(event.media, { attraction_id: null, event_year_id: event.id });
  }

  // Relations may point at something imported by an earlier dataset, so both
  // what's stored and what's in this file count as known.
  const knownAttractionIds = new Set([
    ...state.attractions.keys(),
    ...dataset.attractions.map((attraction) => attraction.id),
  ]);

  const relationsByTriple = new Map<string, Record<string, unknown>>();
  for (const row of state.relations.values()) {
    relationsByTriple.set(
      relationKey(
        row.attraction_id as string,
        row.related_attraction_id as string,
        row.relation_type as string,
      ),
      row,
    );
  }

  for (const attraction of dataset.attractions) {
    resolveRename(attraction, "attraction", state, operations, report);
    upsert(
      "attractions",
      attraction.id,
      attractionRow(attraction),
      state.attractions.get(attraction.id),
      report.attractions,
      operations,
      { is_sample: 0 },
    );

    // The season an attraction belongs to is also a season it appeared in.
    // Appearances are only ever added here: a dataset says where a record
    // belongs, and never that some other season it ran in didn't happen.
    if (!state.seasonAppearances.has(pairKey(attraction.id, attraction.eventId))) {
      operations.push({
        kind: "link",
        table: "season_appearances",
        key: { attraction_id: attraction.id, season_id: attraction.eventId },
      });
    }

    // What differed at one venue is as much a fact as the rest of the
    // record, and is replaced the same way: the dataset says what is true
    // there now, and a section it no longer lists is removed rather than
    // left behind.
    const desiredVenueWiki = new Map(
      (attraction.venueWiki ?? []).map((section) => [
        section.park as string,
        {
          attraction_id: attraction.id,
          venue_id: section.park as string,
          overview: nullable(section.overview),
          story_lore: nullable(section.story),
          experience_description: nullable(section.experience),
          development_notes: nullable(section.development),
          location_notes: nullable(section.location),
        } as Record<string, string | null>,
      ]),
    );

    for (const [venueId, row] of desiredVenueWiki) {
      const key = pairKey(attraction.id, venueId);
      const stored = state.venueWiki.get(key);
      const same =
        stored !== undefined &&
        VENUE_WIKI_COLUMNS.every((column) => (stored[column] ?? null) === row[column]);
      if (same) {
        continue;
      }
      if (stored !== undefined) {
        operations.push({
          kind: "unlink",
          table: "attraction_venue_wiki",
          key: { attraction_id: attraction.id, venue_id: venueId },
        });
      }
      operations.push({ kind: "link", table: "attraction_venue_wiki", key: row });
    }

    for (const key of state.venueWiki.keys()) {
      const [owner, venueId] = key.split(SEPARATOR);
      if (owner === attraction.id && !desiredVenueWiki.has(venueId)) {
        operations.push({
          kind: "unlink",
          table: "attraction_venue_wiki",
          key: { attraction_id: attraction.id, venue_id: venueId },
        });
      }
    }

    // Where something ran is a factual claim, so the dataset's list replaces
    // what's stored: a park left behind would be a wrong fact, not a
    // preference someone chose.
    const desiredParks = new Set<string>(attraction.parks);
    for (const park of desiredParks) {
      if (!state.attractionParks.has(pairKey(attraction.id, park))) {
        operations.push({
          kind: "link",
          table: "attraction_parks",
          key: { attraction_id: attraction.id, park_id: park },
        });
        report.parkChanges += 1;
      }
    }
    for (const link of state.attractionParks) {
      const [owner, park] = link.split(SEPARATOR);
      if (owner === attraction.id && !desiredParks.has(park)) {
        operations.push({
          kind: "unlink",
          table: "attraction_parks",
          key: { attraction_id: attraction.id, park_id: park },
        });
        report.parkChanges += 1;
      }
    }

    for (const character of attraction.characters ?? []) {
      upsert(
        "characters",
        character.id,
        {
          attraction_id: attraction.id,
          name: character.name,
          description: nullable(character.description),
        },
        state.characters.get(character.id),
        report.characters,
        operations,
      );
    }

    for (const relation of attraction.related ?? []) {
      if (!knownAttractionIds.has(relation.attractionId)) {
        errors.push(
          `attractions["${attraction.id}"].related: "${relation.attractionId}" isn't in this ` +
            "dataset or in the archive already.",
        );
        continue;
      }

      const triple = relationKey(attraction.id, relation.attractionId, relation.type);
      const existing = relationsByTriple.get(triple);
      // Planned into their own list: a relation can point at an attraction
      // that appears later in the file, and inserting it before that row
      // exists breaks a foreign key.
      upsert(
        "attraction_relations",
        (existing?.id as string) ?? generateId(),
        {
          attraction_id: attraction.id,
          related_attraction_id: relation.attractionId,
          relation_type: relation.type,
          notes: nullable(relation.notes),
        },
        existing,
        report.relations,
        relationOperations,
      );
    }

    addMedia(attraction.media, { attraction_id: attraction.id, event_year_id: null });

    // Citations are only ever added: a source the dataset doesn't mention may
    // have been attached by hand in Admin Mode, and an import doesn't discard
    // someone's research.
    // A source listed under a venue speaks for that venue's build; one
    // listed on the attraction speaks for the record as a whole.
    const venueOfSource = new Map<string, string>();
    for (const section of attraction.venueWiki ?? []) {
      for (const sourceId of section.sourceIds ?? []) {
        venueOfSource.set(sourceId, section.park);
      }
    }

    const citedSourceIds = new Set([...(attraction.sourceIds ?? []), ...venueOfSource.keys()]);
    for (const sourceId of citedSourceIds) {
      if (!state.attractionSources.has(pairKey(attraction.id, sourceId))) {
        operations.push({
          kind: "link",
          table: "attraction_sources",
          key: {
            attraction_id: attraction.id,
            source_id: sourceId,
            venue_id: venueOfSource.get(sourceId) ?? null,
          },
        });
        report.citationsAdded += 1;
      }
    }
  }

  return { operations: [...operations, ...relationOperations], report, errors };
}
