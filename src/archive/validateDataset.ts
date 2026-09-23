import {
  ARCHIVE_FORMAT_VERSION,
  type ArchiveAttraction,
  type ArchiveDataset,
  type ArchiveEvent,
  type ArchiveSource,
} from "../models/archiveDataset";
import { PARK_IDS, type ParkId } from "../models/park";

/** More than this and the list stops being something a person reads. */
const MAX_REPORTED_ERRORS = 15;

/**
 * A stable id: lowercase, unambiguous in a URL, and obviously not a display
 * name. Long enough to be descriptive (`hhn-2024-house-the-quarry`), short
 * enough to stay readable.
 */
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,79}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const ATTRACTION_TYPES = ["house", "scare_zone"];
const IP_TYPES = ["original", "licensed"];
const RELATION_TYPES = ["sequel", "previous_version", "same_franchise", "related_concept"];
const MEDIA_KINDS = ["poster", "promotional_image", "logo", "event_artwork", "local_image"];
/** A dataset may reference or bundle; `local` describes a file on one person's machine. */
const DATASET_DISTRIBUTIONS = ["reference", "bundled"];
const SOURCE_TYPES = [
  "youtube",
  "article",
  "official_site",
  "promotional",
  "book",
  "podcast",
  "interview",
  "social_media",
  "other",
];

/** The haunts the app ships with; a dataset can't invent one. */
const HAUNT_IDS = ["hhn", "knotts-scary-farm"];

const MIN_CALENDAR_YEAR = 1900;
const MAX_CALENDAR_YEAR = 2200;

export interface DatasetSummary {
  formatVersion: number;
  datasetVersion: string | null;
  generatedAt: string | null;
  events: number;
  attractions: number;
  sources: number;
  characters: number;
  media: number;
  relations: number;
}

export type DatasetValidation =
  { ok: true; dataset: ArchiveDataset; summary: DatasetSummary } | { ok: false; errors: string[] };

class Problems {
  readonly list: string[] = [];

  add(path: string, message: string): void {
    this.list.push(`${path}: ${message}`);
  }

  get ok(): boolean {
    return this.list.length === 0;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, path: string, problems: Problems, required = false): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) {
      problems.add(path, "is required");
    }
    return null;
  }
  if (typeof value !== "string") {
    problems.add(path, `should be text, got ${typeof value}`);
    return null;
  }
  if (required && value.trim() === "") {
    problems.add(path, "is required");
    return null;
  }
  return value;
}

function id(value: unknown, path: string, problems: Problems): string | null {
  const raw = text(value, path, problems, true);
  if (raw === null) {
    return null;
  }
  if (!ID_PATTERN.test(raw)) {
    problems.add(
      path,
      `"${raw}" isn't a usable id — use lowercase letters, numbers and hyphens, ` +
        "and never a display name",
    );
    return null;
  }
  return raw;
}

function oneOf(
  value: unknown,
  allowed: string[],
  path: string,
  problems: Problems,
  required = true,
): string | null {
  if (value === undefined || value === null) {
    if (required) {
      problems.add(path, `is required and should be one of ${allowed.join(", ")}`);
    }
    return null;
  }
  if (typeof value !== "string" || !allowed.includes(value)) {
    problems.add(path, `should be one of ${allowed.join(", ")}, got ${JSON.stringify(value)}`);
    return null;
  }
  return value;
}

function isoDate(value: unknown, path: string, problems: Problems): void {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    problems.add(path, `should be an ISO date like 2024-09-06, got ${JSON.stringify(value)}`);
  }
}

function dateRange(value: unknown, path: string, problems: Problems): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!isRecord(value)) {
    problems.add(path, "should be an object with start and/or end");
    return;
  }
  isoDate(value.start, `${path}.start`, problems);
  isoDate(value.end, `${path}.end`, problems);
}

/** Registers an id, reporting it if something else already claimed it. */
function claim(
  taken: Map<string, string>,
  value: string | null,
  path: string,
  problems: Problems,
): void {
  if (value === null) {
    return;
  }
  const owner = taken.get(value);
  if (owner !== undefined) {
    problems.add(path, `the id "${value}" is already used by ${owner}`);
    return;
  }
  taken.set(value, path);
}

function validatePreviousIds(
  entity: Record<string, unknown>,
  ownId: string | null,
  path: string,
  problems: Problems,
): void {
  const previous = entity.previousIds;
  if (previous === undefined) {
    return;
  }
  if (!Array.isArray(previous)) {
    problems.add(`${path}.previousIds`, "should be a list of ids this entry used to have");
    return;
  }
  previous.forEach((value, index) => {
    const parsed = id(value, `${path}.previousIds[${index}]`, problems);
    if (parsed !== null && parsed === ownId) {
      problems.add(`${path}.previousIds[${index}]`, "is the entry's current id");
    }
  });
}

function validateMedia(
  value: unknown,
  path: string,
  sourceIds: Set<string>,
  taken: Map<string, string>,
  problems: Problems,
): number {
  if (value === undefined) {
    return 0;
  }
  if (!Array.isArray(value)) {
    problems.add(path, "should be a list of media entries");
    return 0;
  }

  value.forEach((entry, index) => {
    const at = `${path}[${index}]`;
    if (!isRecord(entry)) {
      problems.add(at, "should be an object");
      return;
    }
    claim(taken, id(entry.id, `${at}.id`, problems), `${at}.id`, problems);
    oneOf(entry.kind, MEDIA_KINDS, `${at}.kind`, problems);
    // A dataset can only ever point at a remote original: it has no way to
    // ship a file, and no business assuming one may be shipped.
    text(entry.url, `${at}.url`, problems, true);
    if (entry.distribution === "local") {
      problems.add(
        `${at}.distribution`,
        "'local' describes a file on one person's machine, so it can't come from a dataset — " +
          "use 'reference', or 'bundled' if this asset has been cleared for distribution",
      );
    } else if (entry.distribution !== undefined) {
      oneOf(entry.distribution, DATASET_DISTRIBUTIONS, `${at}.distribution`, problems, false);
    }
    const sourceId = entry.sourceId;
    if (typeof sourceId === "string" && !sourceIds.has(sourceId)) {
      problems.add(`${at}.sourceId`, `no source in this dataset has the id "${sourceId}"`);
    }
  });

  return value.length;
}

function validateSourceIds(
  value: unknown,
  path: string,
  sourceIds: Set<string>,
  problems: Problems,
): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    problems.add(path, "should be a list of source ids");
    return;
  }
  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      problems.add(`${path}[${index}]`, "should be a source id");
      return;
    }
    if (!sourceIds.has(entry)) {
      problems.add(`${path}[${index}]`, `no source in this dataset has the id "${entry}"`);
    }
  });
}

function validateSource(
  value: unknown,
  path: string,
  taken: Map<string, string>,
  problems: Problems,
): void {
  if (!isRecord(value)) {
    problems.add(path, "should be an object");
    return;
  }
  claim(taken, id(value.id, `${path}.id`, problems), `${path}.id`, problems);
  oneOf(value.type, SOURCE_TYPES, `${path}.type`, problems);
  text(value.title, `${path}.title`, problems, true);
  isoDate(value.publishedAt, `${path}.publishedAt`, problems);
}

function validateEvent(
  value: unknown,
  path: string,
  sourceIds: Set<string>,
  taken: Map<string, string>,
  problems: Problems,
): number {
  if (!isRecord(value)) {
    problems.add(path, "should be an object");
    return 0;
  }

  const eventId = id(value.id, `${path}.id`, problems);
  claim(taken, eventId, `${path}.id`, problems);
  if (value.hauntId !== undefined) {
    oneOf(value.hauntId, HAUNT_IDS, `${path}.hauntId`, problems, false);
  }
  validatePreviousIds(value, eventId, path, problems);
  text(value.name, `${path}.name`, problems, true);

  const year = value.calendarYear;
  if (typeof year !== "number" || !Number.isInteger(year)) {
    problems.add(`${path}.calendarYear`, "is required and should be a whole year");
  } else if (year < MIN_CALENDAR_YEAR || year > MAX_CALENDAR_YEAR) {
    problems.add(`${path}.calendarYear`, `${year} isn't a plausible year`);
  }

  dateRange(value.dates, `${path}.dates`, problems);
  validateSourceIds(value.sourceIds, `${path}.sourceIds`, sourceIds, problems);
  return validateMedia(value.media, `${path}.media`, sourceIds, taken, problems);
}

function validateParks(value: unknown, path: string, problems: Problems): void {
  if (!Array.isArray(value) || value.length === 0) {
    problems.add(path, "is required — Hollywood, Orlando, or both");
    return;
  }
  const known = Object.values(PARK_IDS) as string[];
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const park = oneOf(entry, known, `${path}[${index}]`, problems);
    if (park === null) {
      return;
    }
    if (seen.has(park)) {
      problems.add(`${path}[${index}]`, `${park} is listed twice`);
    }
    seen.add(park as ParkId);
  });
}

interface AttractionCounts {
  characters: number;
  media: number;
  relations: number;
}

const VENUE_WIKI_SECTIONS = ["overview", "story", "experience", "development", "location"];

/**
 * What differed at one venue of an attraction that ran at more than one.
 *
 * Two rules: it can only describe a venue the attraction actually ran at,
 * and it has to say something. An entry naming a venue and holding nothing
 * would render as a heading with nothing under it.
 */
function validateVenueWiki(
  value: unknown,
  parks: unknown,
  path: string,
  sourceIds: Set<string>,
  problems: Problems,
): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    problems.add(path, "should be a list of venue-specific sections");
    return;
  }

  const ownParks = new Set(Array.isArray(parks) ? parks : []);
  const seen = new Set<string>();

  value.forEach((entry, index) => {
    const at = `${path}[${index}]`;
    if (!isRecord(entry)) {
      problems.add(at, "should be an object");
      return;
    }

    const park = oneOf(entry.park, Object.values(PARK_IDS), `${at}.park`, problems);
    if (park !== null) {
      if (!ownParks.has(park)) {
        problems.add(
          `${at}.park`,
          `"${park}" isn't one of this attraction's parks — a venue section can only ` +
            "describe somewhere it actually ran",
        );
      }
      if (seen.has(park)) {
        problems.add(`${at}.park`, `"${park}" already has a venue section`);
      }
      seen.add(park);
    }

    let written = 0;
    for (const section of VENUE_WIKI_SECTIONS) {
      const content = text(entry[section], `${at}.${section}`, problems);
      if (content !== null) {
        written += 1;
      }
    }

    validateSourceIds(entry.sourceIds, `${at}.sourceIds`, sourceIds, problems);
    if (Array.isArray(entry.sourceIds) && entry.sourceIds.length > 0) {
      written += 1;
    }

    if (written === 0) {
      problems.add(at, "says nothing, so it would render as an empty heading — leave it out");
    }
  });
}

function validateAttraction(
  value: unknown,
  path: string,
  sourceIds: Set<string>,
  taken: Map<string, string>,
  problems: Problems,
): AttractionCounts {
  const counts: AttractionCounts = { characters: 0, media: 0, relations: 0 };
  if (!isRecord(value)) {
    problems.add(path, "should be an object");
    return counts;
  }

  const attractionId = id(value.id, `${path}.id`, problems);
  claim(taken, attractionId, `${path}.id`, problems);
  validatePreviousIds(value, attractionId, path, problems);

  text(value.eventId, `${path}.eventId`, problems, true);
  oneOf(value.type, ATTRACTION_TYPES, `${path}.type`, problems);
  text(value.name, `${path}.name`, problems, true);
  if (value.slug !== undefined) {
    id(value.slug, `${path}.slug`, problems);
  }
  validateParks(value.parks, `${path}.parks`, problems);

  if (value.ip !== undefined && value.ip !== null) {
    if (!isRecord(value.ip)) {
      problems.add(`${path}.ip`, "should be an object with a type and an optional franchise");
    } else {
      oneOf(value.ip.type, IP_TYPES, `${path}.ip.type`, problems);
      text(value.ip.franchise, `${path}.ip.franchise`, problems);
    }
  }

  if (value.wiki !== undefined && value.wiki !== null) {
    if (!isRecord(value.wiki)) {
      problems.add(`${path}.wiki`, "should be an object of long-form sections");
    } else {
      for (const section of ["overview", "story", "experience", "development"]) {
        text(value.wiki[section], `${path}.wiki.${section}`, problems);
      }
    }
  }

  validateVenueWiki(value.venueWiki, value.parks, `${path}.venueWiki`, sourceIds, problems);

  dateRange(value.dates, `${path}.dates`, problems);

  if (value.characters !== undefined) {
    if (!Array.isArray(value.characters)) {
      problems.add(`${path}.characters`, "should be a list");
    } else {
      counts.characters = value.characters.length;
      value.characters.forEach((character, index) => {
        const at = `${path}.characters[${index}]`;
        if (!isRecord(character)) {
          problems.add(at, "should be an object");
          return;
        }
        claim(taken, id(character.id, `${at}.id`, problems), `${at}.id`, problems);
        text(character.name, `${at}.name`, problems, true);
      });
    }
  }

  if (value.related !== undefined) {
    if (!Array.isArray(value.related)) {
      problems.add(`${path}.related`, "should be a list");
    } else {
      counts.relations = value.related.length;
      value.related.forEach((relation, index) => {
        const at = `${path}.related[${index}]`;
        if (!isRecord(relation)) {
          problems.add(at, "should be an object");
          return;
        }
        const target = text(relation.attractionId, `${at}.attractionId`, problems, true);
        if (target !== null && target === attractionId) {
          problems.add(at, "an attraction can't be related to itself");
        }
        oneOf(relation.type, RELATION_TYPES, `${at}.type`, problems);
      });
    }
  }

  counts.media = validateMedia(value.media, `${path}.media`, sourceIds, taken, problems);
  validateSourceIds(value.sourceIds, `${path}.sourceIds`, sourceIds, problems);
  return counts;
}

function trim(errors: string[]): string[] {
  if (errors.length <= MAX_REPORTED_ERRORS) {
    return errors;
  }
  return [
    ...errors.slice(0, MAX_REPORTED_ERRORS),
    `…and ${errors.length - MAX_REPORTED_ERRORS} more problems.`,
  ];
}

/**
 * Checks a dataset completely, before anything touches the database.
 *
 * Structure, enumerations, id shape, id collisions and every reference *within
 * the file* are settled here. References the file can't settle on its own —
 * an attraction related to one imported by an earlier revision — are left to
 * the planner, which knows what's already stored.
 */
export function validateDataset(value: unknown): DatasetValidation {
  if (!isRecord(value)) {
    return { ok: false, errors: ["This file isn't a Haunt Ranker archive dataset."] };
  }

  const version = value.formatVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return {
      ok: false,
      errors: ["This file has no dataset format version, so it can't be read safely."],
    };
  }
  if (version > ARCHIVE_FORMAT_VERSION) {
    return {
      ok: false,
      errors: [
        `This dataset uses format version ${version}; this build understands up to ` +
          `${ARCHIVE_FORMAT_VERSION}.`,
      ],
    };
  }

  const problems = new Problems();
  const taken = new Map<string, string>();

  const rawSources = value.sources ?? [];
  if (!Array.isArray(rawSources)) {
    return { ok: false, errors: ['"sources" should be a list.'] };
  }
  rawSources.forEach((source, index) => {
    validateSource(source, `sources[${index}]`, taken, problems);
  });
  const sourceIds = new Set(
    rawSources
      .filter(isRecord)
      .map((source) => source.id)
      .filter((value): value is string => typeof value === "string"),
  );

  if (!Array.isArray(value.events)) {
    return { ok: false, errors: ['"events" is missing or is not a list.'] };
  }
  if (!Array.isArray(value.attractions)) {
    return { ok: false, errors: ['"attractions" is missing or is not a list.'] };
  }

  let mediaCount = 0;
  value.events.forEach((event, index) => {
    mediaCount += validateEvent(event, `events[${index}]`, sourceIds, taken, problems);
  });

  const eventIds = new Set(
    value.events
      .filter(isRecord)
      .map((event) => event.id)
      .filter((id): id is string => typeof id === "string"),
  );

  let characters = 0;
  let relations = 0;
  value.attractions.forEach((attraction, index) => {
    const counts = validateAttraction(
      attraction,
      `attractions[${index}]`,
      sourceIds,
      taken,
      problems,
    );
    characters += counts.characters;
    relations += counts.relations;
    mediaCount += counts.media;

    if (isRecord(attraction) && typeof attraction.eventId === "string") {
      if (!eventIds.has(attraction.eventId)) {
        problems.add(
          `attractions[${index}].eventId`,
          `no event in this dataset has the id "${attraction.eventId}"`,
        );
      }
    }
  });

  if (!problems.ok) {
    return { ok: false, errors: trim(problems.list) };
  }

  const dataset = value as unknown as ArchiveDataset;
  return {
    ok: true,
    dataset,
    summary: {
      formatVersion: ARCHIVE_FORMAT_VERSION,
      datasetVersion: typeof value.datasetVersion === "string" ? value.datasetVersion : null,
      generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : null,
      events: (value.events as ArchiveEvent[]).length,
      attractions: (value.attractions as ArchiveAttraction[]).length,
      sources: (rawSources as ArchiveSource[]).length,
      characters,
      media: mediaCount,
      relations,
    },
  };
}

/** Reads a dataset file's text. Unreadable JSON is a bad file, not a crash. */
export function readDataset(text: string): DatasetValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["This file isn't valid JSON, so it can't be a dataset."] };
  }
  return validateDataset(parsed);
}
