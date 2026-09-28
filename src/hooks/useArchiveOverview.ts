import { useEffect, useMemo, useState } from "react";
import { getDatabase } from "../database/client";
import { isInHauntScope } from "../models/haunt";
import { useHauntScope } from "./useHauntScope";
import { useHauntRegistry } from "./useHauntRegistry";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import { EMPTY_HAUNT_SUMMARIES, summarizeHaunts, type HauntArchiveSummary } from "../utils/haunts";
import type { Rating } from "../models/rating";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { posterFields } from "../media/mediaFiles";
import type { ArtworkFit } from "../media/mediaPolicy";
import { pickRandomSample } from "../utils/sample";

const SPOTLIGHT_COUNT = 6;

export interface ArchiveSpotlightItem {
  attraction: Attraction;
  eventYear: EventYear | null;
  /** A poster (or first available) media URL, or null if no artwork is on file. */
  posterUrl: string | null;
  posterFit?: ArtworkFit;
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

export type { HauntArchiveSummary };

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

/**
 * Loads a light overview of the archive for the Home page: totals, and a
 * semi-random spotlight selection. Deliberately picks the spotlight once
 * per mount (not on every render) so it doesn't shuffle while the page is
 * open — see `pickRandomSample`.
 */
export function useArchiveOverview(): ArchiveOverview {
  const { scope } = useHauntScope();
  const { haunts: registryHaunts } = useHauntRegistry();
  const [state, setState] = useState<ArchiveOverview>({
    isLoading: true,
    error: null,
    summary: EMPTY_SUMMARY,
    haunts: EMPTY_HAUNT_SUMMARIES,
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
              ...(await posterFields(mediaList)),
              rating,
            };
          }),
        );

        if (cancelled) {
          return;
        }

        const haunts = summarizeHaunts(
          attractions,
          years,
          ratedIds,
          registryHaunts.map((haunt) => haunt.id),
        );

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
  }, [registryHaunts]);

  // The haunts themselves are always all of them — Home offers every
  // collection — but what the page says about "the archive" follows the
  // haunt in view, so the spotlight and the totals describe one thing.
  const spotlight = useMemo(
    () => state.spotlight.filter((item) => isInHauntScope(item.eventYear?.hauntId, scope)),
    [state.spotlight, scope],
  );

  const summary = useMemo(() => {
    if (scope === "all") {
      return state.summary;
    }
    const own = state.haunts.find((haunt) => haunt.hauntId === scope);
    return own
      ? {
          totalAttractions: own.attractions,
          houses: own.walkthroughs,
          scareZones: own.scareZones,
          reviewed: own.reviewed,
        }
      : state.summary;
  }, [scope, state.haunts, state.summary]);

  return { ...state, summary, spotlight };
}
