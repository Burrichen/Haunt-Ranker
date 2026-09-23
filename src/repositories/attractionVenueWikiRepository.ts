import { ConstraintViolationError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { AttractionVenueWiki, AttractionVenueWikiInput } from "../models/attractionVenueWiki";
import { isVenueWikiEmpty } from "../models/attractionVenueWiki";
import type { EntityId } from "../models/common";
import type { ParkId } from "../models/park";

interface VenueWikiRow {
  attraction_id: string;
  venue_id: string;
  overview: string | null;
  story_lore: string | null;
  experience_description: string | null;
  development_notes: string | null;
  location_notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: VenueWikiRow): AttractionVenueWiki {
  return {
    attractionId: row.attraction_id,
    venueId: row.venue_id as ParkId,
    overview: row.overview,
    storyLore: row.story_lore,
    experienceDescription: row.experience_description,
    developmentNotes: row.development_notes,
    locationNotes: row.location_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

export interface AttractionVenueWikiRepository {
  /**
   * The venue-specific sections for one attraction, empty ones excluded —
   * the wiki never renders a heading with nothing under it.
   */
  getByAttraction(attractionId: EntityId): Promise<AttractionVenueWiki[]>;
  /** Writes one venue's sections, replacing whatever was there. */
  save(input: AttractionVenueWikiInput): Promise<AttractionVenueWiki | null>;
  remove(attractionId: EntityId, venueId: ParkId): Promise<void>;
}

export function createAttractionVenueWikiRepository(
  db: SqlExecutor,
): AttractionVenueWikiRepository {
  async function get(attractionId: EntityId, venueId: ParkId): Promise<AttractionVenueWiki | null> {
    const rows = await db.select<VenueWikiRow[]>(
      "SELECT * FROM attraction_venue_wiki WHERE attraction_id = ? AND venue_id = ?",
      [attractionId, venueId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async function getByAttraction(attractionId: EntityId): Promise<AttractionVenueWiki[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<VenueWikiRow[]>(
        "SELECT * FROM attraction_venue_wiki WHERE attraction_id = ? ORDER BY venue_id ASC",
        [attractionId],
      );
      return rows.map(mapRow).filter((section) => !isVenueWikiEmpty(section));
    });
  }

  async function remove(attractionId: EntityId, venueId: ParkId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute("DELETE FROM attraction_venue_wiki WHERE attraction_id = ? AND venue_id = ?", [
        attractionId,
        venueId,
      ]),
    );
  }

  /**
   * Saving nothing deletes the row rather than storing five nulls, so
   * "there is nothing venue-specific here" has exactly one representation.
   */
  async function save(input: AttractionVenueWikiInput): Promise<AttractionVenueWiki | null> {
    if (!input.attractionId || !input.venueId) {
      throw new ConstraintViolationError(
        "A venue section needs both an attraction and a venue",
        "foreign_key",
      );
    }

    const values = {
      overview: blankToNull(input.overview),
      storyLore: blankToNull(input.storyLore),
      experienceDescription: blankToNull(input.experienceDescription),
      developmentNotes: blankToNull(input.developmentNotes),
      locationNotes: blankToNull(input.locationNotes),
    };

    if (Object.values(values).every((value) => value === null)) {
      await remove(input.attractionId, input.venueId);
      return null;
    }

    return withDatabaseErrors(async () => {
      await db.execute(
        `INSERT INTO attraction_venue_wiki (
           attraction_id, venue_id, overview, story_lore, experience_description,
           development_notes, location_notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (attraction_id, venue_id) DO UPDATE SET
           overview = excluded.overview,
           story_lore = excluded.story_lore,
           experience_description = excluded.experience_description,
           development_notes = excluded.development_notes,
           location_notes = excluded.location_notes,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        [
          input.attractionId,
          input.venueId,
          values.overview,
          values.storyLore,
          values.experienceDescription,
          values.developmentNotes,
          values.locationNotes,
        ],
      );
      return get(input.attractionId, input.venueId);
    });
  }

  return { getByAttraction, save, remove };
}
