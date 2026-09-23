import type { EntityId } from "./common";
import type { ParkId } from "./park";

/**
 * What was true of one venue's version of an attraction and not of the
 * record as a whole.
 *
 * Hollywood and Orlando ran plenty of houses under the same name with
 * different layouts, facades, rooms and scares. Those are one canonical
 * attraction — one rating, one note, one place in a ranking — and the
 * differences live here rather than being flattened away or split into two
 * records.
 *
 * Every field is optional, and an absent one renders as nothing at all: the
 * wiki shows a venue subsection only where there is something to say.
 */
export interface AttractionVenueWiki {
  attractionId: EntityId;
  venueId: ParkId;
  overview: string | null;
  storyLore: string | null;
  experienceDescription: string | null;
  developmentNotes: string | null;
  locationNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttractionVenueWikiInput {
  attractionId: EntityId;
  venueId: ParkId;
  overview?: string | null;
  storyLore?: string | null;
  experienceDescription?: string | null;
  developmentNotes?: string | null;
  locationNotes?: string | null;
}

/** True when a section holds nothing, and so should not be rendered at all. */
export function isVenueWikiEmpty(section: AttractionVenueWiki): boolean {
  return (
    !section.overview &&
    !section.storyLore &&
    !section.experienceDescription &&
    !section.developmentNotes &&
    !section.locationNotes
  );
}
