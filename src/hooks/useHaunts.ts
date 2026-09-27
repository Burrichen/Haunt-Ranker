import { useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import { useHauntRegistry } from "./useHauntRegistry";
import type { EventYear } from "../models/eventYear";
import type { HauntId } from "../models/haunt";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import {
  EMPTY_HAUNT_SUMMARIES,
  emptyHauntSummary,
  summarizeHaunts,
  type HauntArchiveSummary,
} from "../utils/haunts";
import { computeYearStats, type YearAttraction, type YearStats } from "../utils/years";

export interface HauntsOverview {
  isLoading: boolean;
  error: string | null;
  /** One entry per haunt, in the app's fixed order. */
  haunts: HauntArchiveSummary[];
}

/** Every haunt with what its archive holds — the Haunts page's whole data need. */
export function useHaunts(): HauntsOverview {
  const { haunts: registryHaunts } = useHauntRegistry();
  const [state, setState] = useState<HauntsOverview>({
    isLoading: true,
    error: null,
    haunts: EMPTY_HAUNT_SUMMARIES,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await getDatabase();
        const [attractions, seasons, ratedIds] = await Promise.all([
          createAttractionRepository(db).getAll(),
          createEventYearRepository(db).getAll(),
          createRatingRepository(db).getRatedAttractionIds(),
        ]);

        if (cancelled) {
          return;
        }
        setState({
          isLoading: false,
          error: null,
          haunts: summarizeHaunts(
            attractions,
            seasons,
            ratedIds,
            registryHaunts.map((haunt) => haunt.id),
          ),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Something went wrong loading the haunts.",
          haunts: EMPTY_HAUNT_SUMMARIES,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [registryHaunts]);

  return state;
}

export interface HauntLanding {
  isLoading: boolean;
  error: string | null;
  summary: HauntArchiveSummary;
  /** This haunt's seasons, newest first. */
  seasons: EventYear[];
  /**
   * What can be said about the haunt's ratings, or null when too little of
   * it has been reviewed to average — the same threshold the year pages use.
   */
  stats: YearStats | null;
}

/** One haunt's overview: what its archive holds, its seasons, and its ratings. */
export function useHauntLanding(hauntId: HauntId): HauntLanding {
  const { haunts: registryHaunts } = useHauntRegistry();
  const [state, setState] = useState<HauntLanding>({
    isLoading: true,
    error: null,
    summary: emptyHauntSummary(hauntId),
    seasons: [],
    stats: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await getDatabase();
        const [attractions, allSeasons, ratings, ratedIds] = await Promise.all([
          createAttractionRepository(db).getAll(),
          createEventYearRepository(db).getAll(),
          createRatingRepository(db).getAll(),
          createRatingRepository(db).getRatedAttractionIds(),
        ]);

        if (cancelled) {
          return;
        }

        const seasons = allSeasons
          .filter((season) => season.hauntId === hauntId)
          .sort((a, b) => b.calendarYear - a.calendarYear);
        const seasonIds = new Set(seasons.map((season) => season.id));
        const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));

        const items: YearAttraction[] = attractions
          .filter((attraction) => seasonIds.has(attraction.eventYearId))
          .map((attraction) => ({
            attraction,
            rating: ratingByAttraction.get(attraction.id) ?? null,
            posterUrl: null,
          }));

        const summary =
          summarizeHaunts(
            attractions,
            allSeasons,
            ratedIds,
            registryHaunts.map((haunt) => haunt.id),
          ).find((entry) => entry.hauntId === hauntId) ?? emptyHauntSummary(hauntId);

        setState({
          isLoading: false,
          error: null,
          summary,
          seasons,
          // The same honesty rule as a year page: below the threshold it
          // says it hasn't enough to average rather than averaging anyway.
          stats: items.length === 0 ? null : computeYearStats(items),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Something went wrong loading this haunt.",
          summary: emptyHauntSummary(hauntId),
          seasons: [],
          stats: null,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hauntId, registryHaunts]);

  return state;
}
