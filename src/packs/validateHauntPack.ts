import type { AttractionType } from "../models/attraction";
import { HAUNT_ACCENTS } from "../models/haunt";
import { VENUE_ICONS } from "../models/park";
import { HAUNT_PACK_SCHEMA, SUPPORTED_PACK_SCHEMAS, type HauntPack } from "./hauntPack";

/** More than this and the list stops being something a person reads. */
const MAX_REPORTED_ERRORS = 15;

/**
 * A stable id: lowercase, unambiguous in a URL, and obviously not a
 * display name. Colons are allowed so a pack can namespace its ids —
 * `mff:2026:walkthrough:hollow-road`.
 */
export const PACK_ID_PATTERN = /^[a-z0-9][a-z0-9:-]{1,119}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const CATEGORIES: AttractionType[] = ["house", "scare_zone", "show", "other"];
const IP_TYPES = ["original", "licensed"];
const RELATION_TYPES = [
  "sequel",
  "previous_version",
  "same_franchise",
  "related_concept",
  "reimagining_of",
  "revival_of",
];
const MEDIA_KINDS = ["poster", "promotional_image", "logo", "event_artwork", "local_image"];
const DISTRIBUTIONS = ["reference", "bundled"];
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

const MIN_CALENDAR_YEAR = 1900;
const MAX_CALENDAR_YEAR = 2200;

export interface PackSummary {
  schema: string;
  packId: string;
  packVersion: string;
  generatedAt: string | null;
  hauntId: string;
  hauntName: string;
  provenance: string | null;
  seasons: number;
  experiences: number;
  experienceTypes: number;
  venues: number;
  sources: number;
  characters: number;
  media: number;
  relations: number;
}

export type PackValidation =
  | { ok: true; pack: HauntPack; summary: PackSummary; warnings: string[] }
  | { ok: false; errors: string[] };

class Problems {
  readonly errors: string[] = [];
  readonly warnings: string[] = [];

  add(path: string, message: string): void {
    this.errors.push(`${path}: ${message}`);
  }

  warn(path: string, message: string): void {
    this.warnings.push(`${path}: ${message}`);
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
  if (!PACK_ID_PATTERN.test(raw)) {
    problems.add(
      path,
      `"${raw}" isn't a usable id — use lowercase letters, numbers, hyphens and colons, ` +
        "and never a display name",
    );
    return null;
  }
  return raw;
}

function oneOf(
  value: unknown,
  allowed: readonly string[],
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
    problems.add(path, `should be an ISO date like 2026-10-03, got ${JSON.stringify(value)}`);
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

function calendarYear(value: unknown, path: string, problems: Problems): void {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    problems.add(path, `should be a whole year, got ${JSON.stringify(value)}`);
    return;
  }
  if (value < MIN_CALENDAR_YEAR || value > MAX_CALENDAR_YEAR) {
    problems.add(path, `${value} isn't a plausible year`);
  }
}

/** Registers an id, reporting it if something else in the pack already claimed it. */
function claim(taken: Map<string, string>, value: string | null, path: string, problems: Problems) {
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

function stringList(value: unknown, path: string, problems: Problems): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    problems.add(path, "should be a list of ids");
    return [];
  }
  return value.filter((entry): entry is string => {
    if (typeof entry !== "string") {
      problems.add(path, "should contain only ids");
      return false;
    }
    return true;
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
    text(entry.url, `${at}.url`, problems, true);
    if (entry.distribution === "local") {
      problems.add(
        `${at}.distribution`,
        "'local' describes a file on one person's machine, so a pack can't claim it — " +
          "use 'reference', or 'bundled' if this asset has been cleared for distribution",
      );
    } else if (entry.distribution !== undefined) {
      oneOf(entry.distribution, DISTRIBUTIONS, `${at}.distribution`, problems, false);
    }
    if (typeof entry.sourceId === "string" && !sourceIds.has(entry.sourceId)) {
      problems.add(`${at}.sourceId`, `no source in this pack has the id "${entry.sourceId}"`);
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
  for (const entry of stringList(value, path, problems)) {
    if (!sourceIds.has(entry)) {
      problems.add(path, `no source in this pack has the id "${entry}"`);
    }
  }
}

function validateWiki(value: unknown, path: string, problems: Problems): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!isRecord(value)) {
    problems.add(path, "should be an object of long-form sections");
    return;
  }
  for (const section of ["overview", "story", "experience", "development"]) {
    text(value[section], `${path}.${section}`, problems);
  }
}

interface PackContext {
  hauntId: string | null;
  venueIds: Set<string>;
  typeIds: Set<string>;
  seasonIds: Set<string>;
  sourceIds: Set<string>;
  experienceIds: Set<string>;
}

function validateVenueWiki(
  value: unknown,
  ownVenues: string[],
  path: string,
  context: PackContext,
  problems: Problems,
): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    problems.add(path, "should be a list of venue-specific sections");
    return;
  }

  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const at = `${path}[${index}]`;
    if (!isRecord(entry)) {
      problems.add(at, "should be an object");
      return;
    }

    const venue = text(entry.venue, `${at}.venue`, problems, true);
    if (venue !== null) {
      if (!ownVenues.includes(venue)) {
        problems.add(
          `${at}.venue`,
          `"${venue}" isn't one of this experience's venues — a venue section can only ` +
            "describe somewhere it actually ran",
        );
      }
      if (seen.has(venue)) {
        problems.add(`${at}.venue`, `"${venue}" already has a venue section`);
      }
      seen.add(venue);
    }

    let written = 0;
    for (const section of ["overview", "story", "experience", "development", "location"]) {
      if (text(entry[section], `${at}.${section}`, problems) !== null) {
        written += 1;
      }
    }
    const sources = stringList(entry.sourceIds, `${at}.sourceIds`, problems);
    for (const sourceId of sources) {
      if (!context.sourceIds.has(sourceId)) {
        problems.add(`${at}.sourceIds`, `no source in this pack has the id "${sourceId}"`);
      }
    }
    if (written === 0 && sources.length === 0) {
      problems.add(at, "says nothing, so it would render as an empty heading — leave it out");
    }
  });
}

function namespaceWarning(
  value: string | null,
  hauntId: string | null,
  path: string,
  problems: Problems,
): void {
  if (value === null || hauntId === null || value === hauntId) {
    return;
  }
  if (!value.startsWith(`${hauntId}:`) && !value.startsWith(`${hauntId}-`)) {
    problems.warn(
      path,
      `"${value}" isn't namespaced to this haunt — ids like "${hauntId}:…" make a ` +
        "collision with another pack impossible",
    );
  }
}

/**
 * Checks a pack completely, before anything is planned or written.
 *
 * Errors are things that make the pack unusable; warnings are things a
 * person should see and decide about — a count that doesn't match, an id
 * that isn't namespaced. Nothing here touches the database: a pack is
 * either understood in full or refused.
 */
export function validateHauntPack(value: unknown): PackValidation {
  const problems = new Problems();

  if (!isRecord(value)) {
    return { ok: false, errors: ["This file isn't a Haunt Pack."] };
  }

  const schema = value.schema;
  if (typeof schema !== "string" || schema === "") {
    return {
      ok: false,
      errors: [
        "This file has no pack schema id, so it isn't a Haunt Pack. Expected " +
          `"${HAUNT_PACK_SCHEMA}".`,
      ],
    };
  }
  if (!SUPPORTED_PACK_SCHEMAS.includes(schema)) {
    return {
      ok: false,
      errors: [
        `This pack uses schema "${schema}", which this version of Haunt Ranker can't read. ` +
          `It understands ${SUPPORTED_PACK_SCHEMAS.join(", ")}.`,
      ],
    };
  }

  const taken = new Map<string, string>();

  // --- pack metadata -------------------------------------------------
  const metadata = isRecord(value.pack) ? value.pack : null;
  if (!metadata) {
    problems.add("pack", "is required, with an id and a version");
  }
  const packId = metadata ? id(metadata.id, "pack.id", problems) : null;
  const packVersion = metadata ? text(metadata.version, "pack.version", problems, true) : null;
  const generatedAt = metadata ? text(metadata.generatedAt, "pack.generatedAt", problems) : null;
  const provenance = metadata ? text(metadata.provenance, "pack.provenance", problems) : null;

  // --- haunt ---------------------------------------------------------
  const hauntValue = isRecord(value.haunt) ? value.haunt : null;
  if (!hauntValue) {
    problems.add("haunt", "is required — a pack describes exactly one haunt");
  }
  const hauntId = hauntValue ? id(hauntValue.id, "haunt.id", problems) : null;
  const hauntName = hauntValue ? text(hauntValue.name, "haunt.name", problems, true) : null;
  if (hauntValue) {
    text(hauntValue.shortName, "haunt.shortName", problems, true);
    text(hauntValue.description, "haunt.description", problems);
    text(hauntValue.tagline, "haunt.tagline", problems);
    text(hauntValue.venuesLabel, "haunt.venuesLabel", problems);
    if (hauntValue.accent !== undefined) {
      oneOf(hauntValue.accent, HAUNT_ACCENTS, "haunt.accent", problems, false);
    }
  }
  claim(taken, hauntId, "haunt.id", problems);

  const context: PackContext = {
    hauntId,
    venueIds: new Set(),
    typeIds: new Set(),
    seasonIds: new Set(),
    sourceIds: new Set(),
    experienceIds: new Set(),
  };

  // --- sources (first: everything else cites them) ---------------------
  const sources = Array.isArray(value.sources) ? value.sources : [];
  if (value.sources !== undefined && !Array.isArray(value.sources)) {
    problems.add("sources", "should be a list of sources");
  }
  sources.forEach((entry, index) => {
    const at = `sources[${index}]`;
    if (!isRecord(entry)) {
      problems.add(at, "should be an object");
      return;
    }
    const sourceId = id(entry.id, `${at}.id`, problems);
    claim(taken, sourceId, `${at}.id`, problems);
    if (sourceId) {
      context.sourceIds.add(sourceId);
    }
    oneOf(entry.type, SOURCE_TYPES, `${at}.type`, problems);
    text(entry.title, `${at}.title`, problems, true);
    text(entry.url, `${at}.url`, problems);
    text(entry.publisher, `${at}.publisher`, problems);
    isoDate(entry.publishedAt, `${at}.publishedAt`, problems);
  });

  // --- experience types ------------------------------------------------
  const types = Array.isArray(value.experienceTypes) ? value.experienceTypes : [];
  if (types.length === 0) {
    problems.add(
      "experienceTypes",
      "is required — a pack has to say what this haunt calls its experiences",
    );
  }
  types.forEach((entry, index) => {
    const at = `experienceTypes[${index}]`;
    if (!isRecord(entry)) {
      problems.add(at, "should be an object");
      return;
    }
    const typeId = id(entry.id, `${at}.id`, problems);
    claim(taken, typeId, `${at}.id`, problems);
    namespaceWarning(typeId, hauntId, `${at}.id`, problems);
    if (typeId) {
      context.typeIds.add(typeId);
    }
    oneOf(entry.category, CATEGORIES, `${at}.category`, problems);
    text(entry.labelOne, `${at}.labelOne`, problems, true);
    text(entry.labelMany, `${at}.labelMany`, problems, true);
  });

  // --- venues ----------------------------------------------------------
  const venues = Array.isArray(value.venues) ? value.venues : [];
  if (venues.length === 0) {
    problems.add("venues", "is required — an experience has to have run somewhere");
  }
  venues.forEach((entry, index) => {
    const at = `venues[${index}]`;
    if (!isRecord(entry)) {
      problems.add(at, "should be an object");
      return;
    }
    const venueId = id(entry.id, `${at}.id`, problems);
    claim(taken, venueId, `${at}.id`, problems);
    namespaceWarning(venueId, hauntId, `${at}.id`, problems);
    if (venueId) {
      context.venueIds.add(venueId);
    }
    text(entry.name, `${at}.name`, problems, true);
    if (entry.icon !== undefined) {
      oneOf(entry.icon, VENUE_ICONS, `${at}.icon`, problems, false);
    }
  });

  // --- seasons ---------------------------------------------------------
  const seasons = Array.isArray(value.seasons) ? value.seasons : [];
  if (seasons.length === 0) {
    problems.add("seasons", "is required — a haunt with no seasons has nothing to show");
  }
  seasons.forEach((entry, index) => {
    const at = `seasons[${index}]`;
    if (!isRecord(entry)) {
      problems.add(at, "should be an object");
      return;
    }
    const seasonId = id(entry.id, `${at}.id`, problems);
    claim(taken, seasonId, `${at}.id`, problems);
    namespaceWarning(seasonId, hauntId, `${at}.id`, problems);
    if (seasonId) {
      context.seasonIds.add(seasonId);
    }
    calendarYear(entry.calendarYear, `${at}.calendarYear`, problems);
    text(entry.name, `${at}.name`, problems, true);
    text(entry.description, `${at}.description`, problems);
    text(entry.sourceNotes, `${at}.sourceNotes`, problems);
    dateRange(entry.dates, `${at}.dates`, problems);
    validateSourceIds(entry.sourceIds, `${at}.sourceIds`, context.sourceIds, problems);
    validateMedia(entry.media, `${at}.media`, context.sourceIds, taken, problems);
    for (const previous of stringList(entry.previousIds, `${at}.previousIds`, problems)) {
      if (previous === seasonId) {
        problems.add(`${at}.previousIds`, "contains the entry's current id");
      }
    }
  });

  // --- experiences -----------------------------------------------------
  const experiences = Array.isArray(value.experiences) ? value.experiences : [];
  if (experiences.length === 0) {
    problems.add("experiences", "is required — a pack with no experiences holds nothing");
  }
  let characterCount = 0;
  let mediaCount = 0;
  let relationCount = 0;

  experiences.forEach((entry, index) => {
    const at = `experiences[${index}]`;
    if (!isRecord(entry)) {
      problems.add(at, "should be an object");
      return;
    }

    const experienceId = id(entry.id, `${at}.id`, problems);
    claim(taken, experienceId, `${at}.id`, problems);
    namespaceWarning(experienceId, hauntId, `${at}.id`, problems);
    if (experienceId) {
      context.experienceIds.add(experienceId);
    }

    const seasonId = text(entry.seasonId, `${at}.seasonId`, problems, true);
    if (seasonId !== null && !context.seasonIds.has(seasonId)) {
      problems.add(`${at}.seasonId`, `no season in this pack has the id "${seasonId}"`);
    }

    const typeId = text(entry.typeId, `${at}.typeId`, problems, true);
    if (typeId !== null && !context.typeIds.has(typeId)) {
      problems.add(`${at}.typeId`, `no experience type in this pack has the id "${typeId}"`);
    }

    text(entry.name, `${at}.name`, problems, true);
    if (entry.slug !== undefined) {
      id(entry.slug, `${at}.slug`, problems);
    }
    text(entry.variantName, `${at}.variantName`, problems);
    text(entry.summary, `${at}.summary`, problems);
    text(entry.location, `${at}.location`, problems);
    validateWiki(entry.wiki, `${at}.wiki`, problems);
    dateRange(entry.dates, `${at}.dates`, problems);

    if (entry.debutYear !== undefined && entry.debutYear !== null) {
      calendarYear(entry.debutYear, `${at}.debutYear`, problems);
    }

    const ownVenues = stringList(entry.venues, `${at}.venues`, problems);
    if (!Array.isArray(entry.venues) || ownVenues.length === 0) {
      problems.add(`${at}.venues`, "is required — name at least one venue from this pack");
    }
    if (new Set(ownVenues).size !== ownVenues.length) {
      problems.add(`${at}.venues`, "lists the same venue twice");
    }
    for (const venue of ownVenues) {
      if (!context.venueIds.has(venue)) {
        problems.add(`${at}.venues`, `no venue in this pack has the id "${venue}"`);
      }
    }

    validateVenueWiki(entry.venueWiki, ownVenues, `${at}.venueWiki`, context, problems);

    for (const season of stringList(entry.alsoAppearedIn, `${at}.alsoAppearedIn`, problems)) {
      if (!context.seasonIds.has(season)) {
        problems.add(`${at}.alsoAppearedIn`, `no season in this pack has the id "${season}"`);
      }
    }

    if (entry.ip !== undefined && entry.ip !== null) {
      if (!isRecord(entry.ip)) {
        problems.add(`${at}.ip`, "should be an object with a type and an optional franchise");
      } else {
        oneOf(entry.ip.type, IP_TYPES, `${at}.ip.type`, problems);
        text(entry.ip.franchise, `${at}.ip.franchise`, problems);
      }
    }

    if (entry.characters !== undefined) {
      if (!Array.isArray(entry.characters)) {
        problems.add(`${at}.characters`, "should be a list of characters");
      } else {
        characterCount += entry.characters.length;
        entry.characters.forEach((character, characterIndex) => {
          const characterAt = `${at}.characters[${characterIndex}]`;
          if (!isRecord(character)) {
            problems.add(characterAt, "should be an object");
            return;
          }
          claim(
            taken,
            id(character.id, `${characterAt}.id`, problems),
            `${characterAt}.id`,
            problems,
          );
          text(character.name, `${characterAt}.name`, problems, true);
          text(character.description, `${characterAt}.description`, problems);
        });
      }
    }

    if (entry.related !== undefined) {
      if (!Array.isArray(entry.related)) {
        problems.add(`${at}.related`, "should be a list of relations");
      } else {
        relationCount += entry.related.length;
        entry.related.forEach((relation, relationIndex) => {
          const relationAt = `${at}.related[${relationIndex}]`;
          if (!isRecord(relation)) {
            problems.add(relationAt, "should be an object");
            return;
          }
          const other = text(relation.experienceId, `${relationAt}.experienceId`, problems, true);
          if (other !== null && other === experienceId) {
            problems.add(relationAt, "an experience can't be related to itself");
          }
          oneOf(relation.type, RELATION_TYPES, `${relationAt}.type`, problems);
          text(relation.notes, `${relationAt}.notes`, problems);
        });
      }
    }

    mediaCount += validateMedia(entry.media, `${at}.media`, context.sourceIds, taken, problems);
    validateSourceIds(entry.sourceIds, `${at}.sourceIds`, context.sourceIds, problems);

    for (const previous of stringList(entry.previousIds, `${at}.previousIds`, problems)) {
      if (previous === experienceId) {
        problems.add(`${at}.previousIds`, "contains the entry's current id");
      }
    }
  });

  // Relations may point at something an earlier pack imported, so only
  // ones naming something inside this pack can be checked here.
  experiences.forEach((entry, index) => {
    if (!isRecord(entry) || !Array.isArray(entry.related)) {
      return;
    }
    entry.related.forEach((relation, relationIndex) => {
      if (!isRecord(relation) || typeof relation.experienceId !== "string") {
        return;
      }
      if (!context.experienceIds.has(relation.experienceId)) {
        problems.warn(
          `experiences[${index}].related[${relationIndex}]`,
          `"${relation.experienceId}" isn't in this pack — it has to already be in the ` +
            "archive, or the relation is dropped",
        );
      }
    });
  });

  // --- declared counts --------------------------------------------------
  const declared = metadata && isRecord(metadata.counts) ? metadata.counts : null;
  if (declared) {
    const actual: Record<string, number> = {
      seasons: seasons.length,
      experiences: experiences.length,
      sources: sources.length,
      media: mediaCount,
    };
    for (const [key, count] of Object.entries(actual)) {
      const claimed = declared[key];
      if (typeof claimed === "number" && claimed !== count) {
        problems.warn(
          `pack.counts.${key}`,
          `the pack says ${claimed} but contains ${count} — it may be truncated`,
        );
      }
    }
  }

  if (problems.errors.length > 0) {
    const errors = problems.errors.slice(0, MAX_REPORTED_ERRORS);
    if (problems.errors.length > MAX_REPORTED_ERRORS) {
      errors.push(`…and ${problems.errors.length - MAX_REPORTED_ERRORS} more problems.`);
    }
    return { ok: false, errors };
  }

  return {
    ok: true,
    pack: value as unknown as HauntPack,
    warnings: problems.warnings,
    summary: {
      schema,
      packId: packId ?? "",
      packVersion: packVersion ?? "",
      generatedAt,
      hauntId: hauntId ?? "",
      hauntName: hauntName ?? "",
      provenance,
      seasons: seasons.length,
      experiences: experiences.length,
      experienceTypes: types.length,
      venues: venues.length,
      sources: sources.length,
      characters: characterCount,
      media: mediaCount,
      relations: relationCount,
    },
  };
}

/** Reads a pack from file text. Unparseable JSON is a bad pack, not a crash. */
export function readHauntPack(text: string): PackValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["This file isn't valid JSON, so it can't be a Haunt Pack."] };
  }
  return validateHauntPack(parsed);
}
