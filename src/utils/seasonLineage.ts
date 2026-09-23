import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { SeasonAppearance } from "../models/seasonAppearance";

/**
 * Which of a season's attractions were new that year and which came back.
 *
 * At a haunt where attractions return — Knott's most of all — that is the
 * question a season page is asked. It is answered only from what the
 * archive has actually recorded: a verified debut year, or an appearance in
 * an earlier season. Anything the archive cannot place stays unclassified
 * rather than being guessed into a section, and the page says so.
 */
export interface SeasonLineage<T> {
  newThisYear: T[];
  returning: T[];
  /** Records the archive can't yet place either way. */
  unclassified: T[];
  /** True when something could not be placed, so the page must say the record is incomplete. */
  isIncomplete: boolean;
}

export type LineagePlacement = "new" | "returning" | "unknown";

/** Where one attraction sits in a season, on the evidence the archive holds. */
export function placeInSeason(
  attraction: Pick<Attraction, "id" | "debutYear">,
  season: Pick<EventYear, "id" | "calendarYear">,
  appearances: SeasonAppearance[],
  seasonYears: Map<string, number>,
): LineagePlacement {
  if (attraction.debutYear !== null && attraction.debutYear !== undefined) {
    return attraction.debutYear === season.calendarYear ? "new" : "returning";
  }

  const ranEarlier = appearances.some((appearance) => {
    if (appearance.attractionId !== attraction.id || appearance.seasonId === season.id) {
      return false;
    }
    const year = seasonYears.get(appearance.seasonId);
    return year !== undefined && year < season.calendarYear;
  });

  // An earlier appearance proves it came back. The absence of one proves
  // nothing at all: the archive may simply not hold that year yet.
  return ranEarlier ? "returning" : "unknown";
}

export function classifySeasonLineage<
  T extends { attraction: Pick<Attraction, "id" | "debutYear"> },
>(
  items: T[],
  season: Pick<EventYear, "id" | "calendarYear">,
  appearances: SeasonAppearance[],
  seasonYears: Map<string, number>,
): SeasonLineage<T> {
  const lineage: SeasonLineage<T> = {
    newThisYear: [],
    returning: [],
    unclassified: [],
    isIncomplete: false,
  };

  for (const item of items) {
    const placement = placeInSeason(item.attraction, season, appearances, seasonYears);
    if (placement === "new") {
      lineage.newThisYear.push(item);
    } else if (placement === "returning") {
      lineage.returning.push(item);
    } else {
      lineage.unclassified.push(item);
    }
  }

  lineage.isIncomplete = lineage.unclassified.length > 0;
  return lineage;
}
