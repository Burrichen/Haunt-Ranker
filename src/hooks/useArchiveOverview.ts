import { useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import { HAUNT_IDS, type HauntId } from "../models/haunt";
import type { Rating } from "../models/rating";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { pickMediaSrc } from "../media/mediaFiles";
import { pickRandomSample } from "../utils/sample";

const SPOTLIGHT_COUNT = 6;

export interface ArchiveSpotlightItem {
  attraction: Attraction;
  eventYear: EventYear | null;
  /** A poster (or first available) media URL, or null if no artwork is on file. */
  posterUrl: string | null;
  /** `null` means genuinely unrated — never treat that as a rating of 0. */
  rating: Rating | null;
}

export interface ArchiveSummary {
  totalAttractions: number;
  houses: number;
  scareZones: number;
  /** Attractions with a rating — never inferred from a rating of 0. */
  reviewed: number;
}

/** What one haunt's archive holds — the figures its entry point shows. */
export interface HauntArchiveSummary {
  hauntId: HauntId;
  attractions: number;
  seasons: number;
  /** Attractions with a rating. Never inferred from a rating of 0. */
  reviewed: number;
  /** The span of seasons on file, e.g. 2010–2026, or null when there are none. */
  firstYear: number | null;
  lastYear: number | null;
}

export interface ArchiveOverview {
  isLoading: boolean;
  error: string | null;
  summary: ArchiveSummary;
  /** One entry per haunt, in a fixed order — neither is a footnote to the other. */
  haunts: HauntArchiveSummary[];
  /** A handful of attractions, chosen once per mount — stable for as long as the page stays open. */
  spotlight: ArchiveSpotlightItem[];
}

const EMPTY_SUMMARY: ArchiveSummary = {
  totalAttractions: 0,
  houses: 0,
  scareZones: 0,
  reviewed: 0,
};

const EMPTY_HAUNTS: HauntArchiveSummary[] = [HAUNT_IDS.hhn, HAUNT_IDS.knotts].map((hauntId) => ({
  hauntId,
  attractions: 0,
  seasons: 0,
  reviewed: 0,
  firstYear: null,
  lastYear: null,
}));

/**
 * Loads a light overview of the archive for the Home page: totals, and a
 * semi-random spotlight selection. Deliberately picks the spotlight once
 * per mount (not on every render) so it doesn't shuffle while the page is
 * open — see `pickRandomSample`.
 */
export function useArchiveOverview(): ArchiveOverview {
  const [state, setState] = useState<ArchiveOverview>({
    isLoading: true,
    error: null,
    summary: EMPTY_SUMMARY,
    haunts: EMPTY_HAUNTS,
    spotlight: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await getDatabase();
        const attractionRepo = createAttractionRepository(db);
        const eventYearRepo = createEventYearRepository(db);
        const mediaRepo = createMediaRepository(db);
        const ratingRepo = createRatingRepository(db);

        const [attractions, years, ratedIds] = await Promise.all([
          attractionRepo.getAll(),
          eventYearRepo.getAll(),
          ratingRepo.getRatedAttractionIds(),
        ]);

        const yearsById = new Map(years.map((year) => [year.id, year]));
        const picked = pickRandomSample(attractions, SPOTLIGHT_COUNT);

        const spotlight = await Promise.all(
          picked.map(async (attraction): Promise<ArchiveSpotlightItem> => {
            const [mediaList, rating] = await Promise.all([
              mediaRepo.getForAttraction(attraction.id),
              ratingRepo.getForAttraction(attraction.id),
            ]);
            return {
              attraction,
              eventYear: yearsById.get(attraction.eventYearId) ?? null,
              posterUrl: await pickMediaSrc(mediaList, "poster"),
              rating,
            };
          }),
        );

        if (cancelled) {
          return;
        }

        const rated = new Set(ratedIds);
        const haunts: HauntArchiveSummary[] = [HAUNT_IDS.hhn, HAUNT_IDS.knotts].map((hauntId) => {
          const seasons = years.filter((year) => year.hauntId === hauntId);
          const ownAttractions = attractions.filter(
            (attraction) => yearsById.get(attraction.eventYearId)?.hauntId === hauntId,
          );
          const calendarYears = seasons.map((season) => season.calendarYear);
          return {
            hauntId,
            attractions: ownAttractions.length,
            seasons: seasons.length,
            reviewed: ownAttractions.filter((attraction) => rated.has(attraction.id)).length,
            firstYear: calendarYears.length > 0 ? Math.min(...calendarYears) : null,
            lastYear: calendarYears.length > 0 ? Math.max(...calendarYears) : null,
          };
        });

        setState({
          isLoading: false,
          error: null,
          summary: {
            totalAttractions: attractions.length,
            houses: attractions.filter((a) => a.attractionType === "house").length,
            scareZones: attractions.filter((a) => a.attractionType === "scare_zone").length,
            reviewed: ratedIds.length,
          },
          haunts,
          spotlight,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState((previous) => ({
          ...previous,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Something went wrong loading the archive.",
        }));
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
