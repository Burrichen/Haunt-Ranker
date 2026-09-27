import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { HauntId } from "../models/haunt";

/** What one haunt's archive holds — the figures its card and landing page show. */
export interface HauntArchiveSummary {
  hauntId: HauntId;
  attractions: number;
  seasons: number;
  /** Walk-throughs — houses at HHN, mazes at Knott's. */
  walkthroughs: number;
  scareZones: number;
  /** Attractions with a rating. Never inferred from a rating of 0. */
  reviewed: number;
  /** The span of seasons on file, e.g. 2010–2026, or null when there are none. */
  firstYear: number | null;
  lastYear: number | null;
}

export function emptyHauntSummary(hauntId: HauntId): HauntArchiveSummary {
  return {
    hauntId,
    attractions: 0,
    seasons: 0,
    walkthroughs: 0,
    scareZones: 0,
    reviewed: 0,
    firstYear: null,
    lastYear: null,
  };
}

export const EMPTY_HAUNT_SUMMARIES: HauntArchiveSummary[] = [];

/**
 * The archive, counted one haunt at a time.
 *
 * Always returns an entry per haunt given, in the order given, so a haunt
 * with nothing in it yet is listed and says so rather than disappearing —
 * an empty archive is a fact about the data, not a missing collection.
 */
export function summarizeHaunts(
  attractions: Attraction[],
  seasons: EventYear[],
  ratedAttractionIds: Iterable<string>,
  /** The haunts to count, in the order they should be listed. */
  hauntIds: HauntId[],
): HauntArchiveSummary[] {
  const seasonsById = new Map(seasons.map((season) => [season.id, season]));
  const rated = new Set(ratedAttractionIds);

  return hauntIds.map((hauntId) => {
    const ownSeasons = seasons.filter((season) => season.hauntId === hauntId);
    const own = attractions.filter(
      (attraction) => seasonsById.get(attraction.eventYearId)?.hauntId === hauntId,
    );
    const calendarYears = ownSeasons.map((season) => season.calendarYear);

    return {
      hauntId,
      attractions: own.length,
      seasons: ownSeasons.length,
      walkthroughs: own.filter((attraction) => attraction.attractionType === "house").length,
      scareZones: own.filter((attraction) => attraction.attractionType === "scare_zone").length,
      reviewed: own.filter((attraction) => rated.has(attraction.id)).length,
      firstYear: calendarYears.length > 0 ? Math.min(...calendarYears) : null,
      lastYear: calendarYears.length > 0 ? Math.max(...calendarYears) : null,
    };
  });
}

/** 0 when a haunt holds nothing, so a coverage bar always has something defined to draw. */
export function reviewCoveragePercent(summary: HauntArchiveSummary): number {
  return summary.attractions === 0 ? 0 : (summary.reviewed / summary.attractions) * 100;
}

/** "2010–2026", "2024", or null where no season is on file. */
export function seasonSpanLabel(summary: HauntArchiveSummary): string | null {
  const { firstYear, lastYear } = summary;
  if (firstYear === null || lastYear === null) {
    return null;
  }
  return firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`;
}
