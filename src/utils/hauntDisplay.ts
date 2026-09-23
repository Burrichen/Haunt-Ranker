import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import { HAUNT_NAMES, type HauntId } from "../models/haunt";

/**
 * How a card, row or header dates an attraction.
 *
 * A record with a verified debut year says so — "Debut 2024" — because for a
 * haunt whose attractions return year after year, the year it started is the
 * fact worth showing. Everything else shows the season it belongs to. A debut
 * is never inferred from the season: if nobody established it, the season is
 * all the app knows, and it says only that.
 */
export function attractionDateLabel(
  attraction: Pick<Attraction, "debutYear">,
  eventYear: Pick<EventYear, "calendarYear"> | null,
): string | null {
  if (attraction.debutYear !== null && attraction.debutYear !== undefined) {
    return `Debut ${attraction.debutYear}`;
  }
  return eventYear ? String(eventYear.calendarYear) : null;
}

/** The haunt's full name, for the places a record has to say which archive it is from. */
export function hauntNameOf(hauntId: HauntId | null | undefined): string | null {
  return hauntId ? HAUNT_NAMES[hauntId].name : null;
}
