import type { ArchiveOperation } from "../archive/importOperations";
import type { AttractionType } from "../models/attraction";
import { DEFAULT_HAUNT_ACCENT } from "../models/haunt";
import { DEFAULT_VENUE_ICON } from "../models/park";
import { toStoredCategory } from "../repositories/experienceTypeRepository";
import type { HauntPack, PackExperience, PackMedia, PackSeason } from "./hauntPack";
import type { PackState } from "./packState";

/** What an import would do, in numbers a person can check before agreeing to it. */
export interface PackCounts {
  created: number;
  updated: number;
  unchanged: number;
}

export type PackConflictKind = "manual-edit" | "other-haunt" | "id-in-use";

/**
 * Something the pack wants that the archive can't simply be given.
 *
 * A conflict is never resolved by guessing: the field is left exactly as it
 * is and reported here, so the person importing decides. That is the whole
 * reason a pack can be re-imported safely at all.
 */
export interface PackConflict {
  kind: PackConflictKind;
  /** The record the conflict is about. */
  id: string;
  name: string;
  /** The field in question, where it is one field. */
  field?: string;
  detail: string;
  /** What the archive holds now, and what the pack would have written. */
  current?: string | null;
  incoming?: string | null;
}

export interface PackPreview {
  schema: string;
  packId: string;
  packVersion: string;
  hauntId: string;
  hauntName: string;
  /** True when this haunt isn't in the archive yet. */
  isNewHaunt: boolean;
  generatedAt: string | null;
  provenance: string | null;
  seasons: PackCounts;
  experiences: PackCounts;
  experienceTypes: PackCounts;
  venues: PackCounts;
  sources: PackCounts;
  /** Media entries the pack references. Never files — only their metadata. */
  mediaReferences: number;
  /** Citations the import would add. Only ever added, never removed. */
  citationsAdded: number;
  characters: PackCounts;
  warnings: string[];
  conflicts: PackConflict[];
}

export interface PackImportPlan {
  operations: ArchiveOperation[];
  preview: PackPreview;
  /** Problems only the stored archive could reveal. Nothing is written if any exist. */
  errors: string[];
}

/** Columns that say where a record came from, not what it is. */
const PROVENANCE_COLUMNS = new Set([
  "pack_id",
  "pack_version",
  "pack_updated_at",
  "source_pack_id",
  "source_pack_version",
]);

function counts(): PackCounts {
  return { created: 0, updated: 0, unchanged: 0 };
}

function nullable(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** The columns of a stored row that differ from what the pack says. */
function changed(
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

/**
 * Whether a record has been edited by hand since the pack last wrote it.
 *
 * A record nobody has touched is the pack's to correct. One somebody has
 * edited is theirs, and a pack that disagrees with it raises a conflict
 * rather than quietly winning.
 */
function editedByHand(row: Record<string, unknown>): boolean {
  const manual = row.manual_edit_at;
  if (typeof manual !== "string" || manual === "") {
    return false;
  }
  const lastPack = row.pack_updated_at;
  // A tie counts as an edit. Two writes can land in the same millisecond,
  // and when it can't be told apart the person's edit is the one that
  // stands — being told about a conflict costs a reader a moment, losing a
  // correction costs them the correction.
  return typeof lastPack !== "string" || lastPack === "" || manual >= lastPack;
}

function seasonRow(
  season: PackSeason,
  hauntId: string,
  packId: string,
  version: string,
  stampedAt: string,
) {
  return {
    haunt_id: hauntId,
    calendar_year: season.calendarYear,
    name: season.name,
    description: nullable(season.description),
    source_notes: nullable(season.sourceNotes),
    starts_on: nullable(season.dates?.start),
    ends_on: nullable(season.dates?.end),
    pack_id: packId,
    pack_version: version,
    pack_updated_at: stampedAt,
  };
}

function experienceRow(
  experience: PackExperience,
  category: AttractionType,
  packId: string,
  version: string,
  stampedAt: string,
) {
  return {
    event_year_id: experience.seasonId,
    attraction_type: category,
    experience_type_id: experience.typeId,
    name: experience.name,
    slug: experience.slug ?? experience.id,
    variant_name: nullable(experience.variantName),
    ip_type: experience.ip ? experience.ip.type : null,
    franchise_name: experience.ip ? nullable(experience.ip.franchise) : null,
    short_summary: nullable(experience.summary),
    full_overview: nullable(experience.wiki?.overview),
    story_lore: nullable(experience.wiki?.story),
    experience_description: nullable(experience.wiki?.experience),
    development_notes: nullable(experience.wiki?.development),
    opening_date: nullable(experience.dates?.start),
    closing_date: nullable(experience.dates?.end),
    location_notes: nullable(experience.location),
    debut_year: experience.debutYear ?? null,
    source_pack_id: packId,
    source_pack_version: version,
    pack_updated_at: stampedAt,
  };
}

function mediaRow(media: PackMedia, owner: Record<string, string | null>) {
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

/**
 * Works out every write a pack would make, before any of them run.
 *
 * Three rules shape the result:
 *
 *  1. **Nothing personal is touched.** No operation here can name
 *     `user_ratings`, `user_notes` or `user_rankings`; a pack has no field
 *     that could describe one.
 *  2. **A record edited by hand is not overwritten.** Where a pack would
 *     change a field somebody has edited since the last import, the field
 *     is left alone and a conflict is reported. Fields that are empty are
 *     still filled — that adds, and adding costs nobody their work.
 *  3. **Nothing is deleted.** A pack corrects and adds. Venue assignments
 *     are the one replacement, because a venue left behind is a wrong fact
 *     rather than a preference.
 */
export function planPackImport(pack: HauntPack, state: PackState): PackImportPlan {
  const operations: ArchiveOperation[] = [];
  const relationOperations: ArchiveOperation[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const conflicts: PackConflict[] = [];

  const packId = pack.pack.id;
  const version = pack.pack.version;
  // One timestamp for the whole import: every row this pack writes says it
  // was written now, which is what a later hand edit is compared against.
  const stampedAt = new Date().toISOString();
  const hauntId = pack.haunt.id;
  const existingHaunt = state.haunts.get(hauntId);

  const preview: PackPreview = {
    schema: pack.schema,
    packId,
    packVersion: version,
    hauntId,
    hauntName: pack.haunt.name,
    isNewHaunt: existingHaunt === undefined,
    generatedAt: pack.pack.generatedAt ?? null,
    provenance: pack.pack.provenance ?? null,
    seasons: counts(),
    experiences: counts(),
    experienceTypes: counts(),
    venues: counts(),
    sources: counts(),
    mediaReferences: 0,
    citationsAdded: 0,
    characters: counts(),
    warnings,
    conflicts,
  };

  /**
   * Writes a row, or corrects the one already there.
   *
   * Provenance columns — which pack wrote this, at which version — are
   * written alongside a real correction but never count as one on their
   * own. Otherwise every record in the archive would read as "updated"
   * each time a pack's version number moved, which tells the reader
   * nothing and hides the changes that matter.
   */
  function upsert(
    table: string,
    id: string,
    row: Record<string, unknown>,
    existing: Record<string, unknown> | undefined,
    tally: PackCounts,
  ): void {
    if (!existing) {
      operations.push({ kind: "insert", table, id, row: { id, ...row } });
      tally.created += 1;
      return;
    }

    const facts = Object.fromEntries(
      Object.entries(row).filter(([column]) => !PROVENANCE_COLUMNS.has(column)),
    );
    const factChanges = changed(facts, existing).changes;
    if (Object.keys(factChanges).length === 0) {
      tally.unchanged += 1;
      return;
    }

    const full = changed(row, existing);
    operations.push({ kind: "update", table, id, changes: full.changes, previous: full.previous });
    tally.updated += 1;
  }

  /**
   * The same write, for a record a person may have edited here.
   *
   * If they have, the pack fills what the record doesn't say yet and reports
   * every field where the two disagree instead of taking it. The edit stands
   * and the disagreement is visible; nothing is resolved by guessing.
   */
  function upsertRespectingEdits(
    table: string,
    id: string,
    name: string,
    desired: Record<string, unknown>,
    existing: Record<string, unknown> | undefined,
    tally: PackCounts,
  ): void {
    if (!existing || !editedByHand(existing)) {
      upsert(table, id, desired, existing, tally);
      return;
    }

    const safe: Record<string, unknown> = {};
    for (const [column, value] of Object.entries(desired)) {
      const current = existing[column] ?? null;
      if ((value ?? null) === current) {
        continue;
      }
      if (current === null || PROVENANCE_COLUMNS.has(column)) {
        safe[column] = value ?? null;
        continue;
      }
      conflicts.push({
        kind: "manual-edit",
        id,
        name,
        field: column,
        detail: "Edited here since this pack last wrote it, so the pack's value was not applied.",
        current: String(current),
        incoming: value === null || value === undefined ? null : String(value),
      });
    }

    if (Object.keys(safe).length === 0) {
      tally.unchanged += 1;
      return;
    }
    const { changes, previous } = changed(safe, existing);
    operations.push({ kind: "update", table, id, changes, previous });
    tally.updated += 1;
  }

  // --- the haunt itself -------------------------------------------------
  upsert(
    "haunts",
    hauntId,
    {
      name: pack.haunt.name,
      short_name: pack.haunt.shortName,
      description: nullable(pack.haunt.description),
      tagline: nullable(pack.haunt.tagline),
      accent: pack.haunt.accent ?? DEFAULT_HAUNT_ACCENT,
      venues_label: nullable(pack.haunt.venuesLabel),
      sort_order: pack.haunt.sortOrder ?? 100,
      pack_id: packId,
      pack_version: version,
      pack_updated_at: stampedAt,
    },
    existingHaunt,
    counts(),
  );

  // --- what it calls things ---------------------------------------------
  for (const type of pack.experienceTypes) {
    const existing = state.experienceTypes.get(type.id);
    if (existing && existing.haunt_id !== hauntId) {
      conflicts.push({
        kind: "other-haunt",
        id: type.id,
        name: type.labelMany,
        detail: `This experience type already belongs to ${String(existing.haunt_id)}.`,
      });
      continue;
    }
    upsert(
      "experience_types",
      type.id,
      {
        haunt_id: hauntId,
        category: toStoredCategory(type.category),
        label_one: type.labelOne,
        label_many: type.labelMany,
        description: nullable(type.description),
        sort_order: type.sortOrder ?? 100,
        pack_id: packId,
      },
      existing,
      preview.experienceTypes,
    );
  }

  // --- venues -------------------------------------------------------------
  for (const venue of pack.venues) {
    const existing = state.venues.get(venue.id);
    if (existing && existing.haunt_id !== hauntId) {
      conflicts.push({
        kind: "other-haunt",
        id: venue.id,
        name: venue.name,
        detail: `A venue with this id already belongs to ${String(existing.haunt_id)}.`,
      });
      continue;
    }
    upsert(
      "parks",
      venue.id,
      {
        name: venue.name,
        haunt_id: hauntId,
        icon: venue.icon ?? DEFAULT_VENUE_ICON,
        sort_order: venue.sortOrder ?? 100,
        pack_id: packId,
      },
      existing,
      preview.venues,
    );
  }

  // --- sources (cited by everything else) ---------------------------------
  for (const source of pack.sources ?? []) {
    upsertRespectingEdits(
      "sources",
      source.id,
      source.title,
      {
        source_type: source.type,
        title: source.title,
        url: nullable(source.url),
        publisher: nullable(source.publisher),
        published_at: nullable(source.publishedAt),
        notes: nullable(source.notes),
        source_pack_id: packId,
        source_pack_version: version,
        pack_updated_at: stampedAt,
      },
      state.sources.get(source.id),
      preview.sources,
    );
  }

  // --- seasons -------------------------------------------------------------
  for (const season of pack.seasons) {
    const existing = state.seasons.get(season.id);
    if (existing && existing.haunt_id !== hauntId) {
      conflicts.push({
        kind: "other-haunt",
        id: season.id,
        name: season.name,
        detail: `A season with this id already belongs to ${String(existing.haunt_id)}.`,
      });
      continue;
    }

    upsert(
      "event_years",
      season.id,
      seasonRow(season, hauntId, packId, version, stampedAt),
      existing,
      preview.seasons,
    );

    for (const sourceId of season.sourceIds ?? []) {
      if (!state.seasonSources.has(`${season.id}|${sourceId}`)) {
        operations.push({
          kind: "link",
          table: "event_year_sources",
          key: { event_year_id: season.id, source_id: sourceId },
        });
        preview.citationsAdded += 1;
      }
    }

    for (const media of season.media ?? []) {
      preview.mediaReferences += 1;
      upsert(
        "media",
        media.id,
        mediaRow(media, { attraction_id: null, event_year_id: season.id, haunt_id: null }),
        state.media.get(media.id),
        counts(),
      );
    }
  }

  // --- experiences ----------------------------------------------------------
  const typeCategory = new Map(pack.experienceTypes.map((type) => [type.id, type.category]));
  const packSeasonIds = new Set(pack.seasons.map((season) => season.id));
  const packExperienceIds = new Set(pack.experiences.map((experience) => experience.id));

  for (const experience of pack.experiences) {
    const existing = state.attractions.get(experience.id);
    const category = typeCategory.get(experience.typeId) ?? "other";

    // Two ways a pack could reach into another collection, both refused:
    // naming a season that isn't its own, and claiming an id that already
    // belongs to a record filed under another haunt.
    const seasonHaunt = state.seasons.get(experience.seasonId)?.haunt_id;
    if (
      !packSeasonIds.has(experience.seasonId) &&
      seasonHaunt !== undefined &&
      seasonHaunt !== hauntId
    ) {
      errors.push(
        `${experience.id} names season "${experience.seasonId}", which belongs to another haunt.`,
      );
      continue;
    }
    const storedHaunt = existing
      ? state.seasons.get(existing.event_year_id as string)?.haunt_id
      : undefined;
    if (storedHaunt !== undefined && storedHaunt !== hauntId) {
      errors.push(
        `${experience.id} is already in the archive under "${String(storedHaunt)}", ` +
          "so this pack can't claim it.",
      );
      continue;
    }

    const desired = experienceRow(experience, category, packId, version, stampedAt);

    upsertRespectingEdits(
      "attractions",
      experience.id,
      experience.name,
      desired,
      existing,
      preview.experiences,
    );

    // Venues: the pack's list replaces what's stored, because a venue left
    // behind is a wrong fact rather than a preference someone chose.
    const desiredVenues = new Set(experience.venues);
    for (const venue of desiredVenues) {
      if (!state.attractionVenues.has(`${experience.id}|${venue}`)) {
        operations.push({
          kind: "link",
          table: "attraction_parks",
          key: { attraction_id: experience.id, park_id: venue },
        });
      }
    }
    for (const key of state.attractionVenues) {
      const [owner, venue] = key.split("|");
      if (owner === experience.id && !desiredVenues.has(venue)) {
        operations.push({
          kind: "unlink",
          table: "attraction_parks",
          key: { attraction_id: experience.id, park_id: venue },
        });
      }
    }

    // Appearances: its own season, plus any others the pack verifies. Only
    // ever added — a pack saying nothing about a season is not evidence
    // that it didn't run there.
    for (const seasonId of [experience.seasonId, ...(experience.alsoAppearedIn ?? [])]) {
      if (!state.appearances.has(`${experience.id}|${seasonId}`)) {
        operations.push({
          kind: "link",
          table: "season_appearances",
          key: { attraction_id: experience.id, season_id: seasonId },
        });
      }
    }

    // What differed at one venue.
    const venueSections = new Map(
      (experience.venueWiki ?? []).map((section) => [
        section.venue,
        {
          attraction_id: experience.id,
          venue_id: section.venue,
          overview: nullable(section.overview),
          story_lore: nullable(section.story),
          experience_description: nullable(section.experience),
          development_notes: nullable(section.development),
          location_notes: nullable(section.location),
        } as Record<string, string | null>,
      ]),
    );
    for (const [venueId, row] of venueSections) {
      const key = `${experience.id}|${venueId}`;
      const stored = state.venueWiki.get(key);
      const same =
        stored !== undefined &&
        [
          "overview",
          "story_lore",
          "experience_description",
          "development_notes",
          "location_notes",
        ].every((column) => (stored[column] ?? null) === row[column]);
      if (same) {
        continue;
      }
      if (stored !== undefined) {
        operations.push({
          kind: "unlink",
          table: "attraction_venue_wiki",
          key: { attraction_id: experience.id, venue_id: venueId },
        });
      }
      operations.push({ kind: "link", table: "attraction_venue_wiki", key: row });
    }

    // Citations, including the ones that speak for one venue.
    const venueOfSource = new Map<string, string>();
    for (const section of experience.venueWiki ?? []) {
      for (const sourceId of section.sourceIds ?? []) {
        venueOfSource.set(sourceId, section.venue);
      }
    }
    for (const sourceId of new Set([...(experience.sourceIds ?? []), ...venueOfSource.keys()])) {
      if (!state.attractionSources.has(`${experience.id}|${sourceId}`)) {
        operations.push({
          kind: "link",
          table: "attraction_sources",
          key: {
            attraction_id: experience.id,
            source_id: sourceId,
            venue_id: venueOfSource.get(sourceId) ?? null,
          },
        });
        preview.citationsAdded += 1;
      }
    }

    for (const character of experience.characters ?? []) {
      upsert(
        "characters",
        character.id,
        {
          attraction_id: experience.id,
          name: character.name,
          description: nullable(character.description),
        },
        state.characters.get(character.id),
        preview.characters,
      );
    }

    for (const media of experience.media ?? []) {
      preview.mediaReferences += 1;
      upsert(
        "media",
        media.id,
        mediaRow(media, { attraction_id: experience.id, event_year_id: null, haunt_id: null }),
        state.media.get(media.id),
        counts(),
      );
    }

    // Relations go last: one may point at an experience defined further
    // down the same pack, and the row has to exist first.
    for (const relation of experience.related ?? []) {
      const other = relation.experienceId;
      if (!packExperienceIds.has(other) && !state.attractions.has(other)) {
        warnings.push(
          `${experience.name}: related experience "${other}" isn't in this pack or the archive, ` +
            "so the relation was skipped.",
        );
        continue;
      }
      const key = `${experience.id}|${other}|${relation.type}`;
      if (state.relations.has(key)) {
        continue;
      }
      relationOperations.push({
        kind: "insert",
        table: "attraction_relations",
        id: `${experience.id}--${relation.type}--${other}`,
        row: {
          id: `${experience.id}--${relation.type}--${other}`,
          attraction_id: experience.id,
          related_attraction_id: other,
          relation_type: relation.type,
          notes: nullable(relation.notes),
        },
      });
    }
  }

  return { operations: [...operations, ...relationOperations], preview, errors };
}
