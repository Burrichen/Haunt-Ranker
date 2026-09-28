import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getDatabase } from "../database/client";
import { isInHauntScope } from "../models/haunt";
import { useHauntScope } from "./useHauntScope";
import type { Media } from "../models/media";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { createSeasonAppearanceRepository } from "../repositories/seasonAppearanceRepository";
import { posterFields, seasonArtworkFields } from "../media/mediaFiles";
import {
  buildYearRanking,
  summarizeYear,
  type YearAttraction,
  type YearRanking,
  type YearRankingSort,
  type YearSummary,
} from "../utils/years";
import { parseYearsParams, yearsParamsToSearchParams, type YearsView } from "../utils/yearsParams";

interface DataState {
  isLoading: boolean;
  error: string | null;
  summaries: YearSummary[];
}

const INITIAL_DATA: DataState = { isLoading: true, error: null, summaries: [] };

export interface YearsOverview {
  isLoading: boolean;
  error: string | null;
  /** Every event year, newest first. */
  summaries: YearSummary[];
  view: YearsView;
  setView: (view: YearsView) => void;
  sort: YearRankingSort;
  setSort: (sort: YearRankingSort) => void;
  /** The same years split into rankable and too-thinly-reviewed. */
  ranking: YearRanking;
}

/**
 * Loads every event year with the counts and averages the overview needs.
 * View and sort live in the URL, matching the rest of the app, so leaving
 * for a year page and coming back restores what was on screen.
 */
export function useYearsOverview(): YearsOverview {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<DataState>(INITIAL_DATA);
  const { scope } = useHauntScope();

  const { view, sort } = useMemo(() => parseYearsParams(searchParams), [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await getDatabase();
        const [years, attractions, ratings, media, appearances] = await Promise.all([
          createEventYearRepository(db).getAll(),
          createAttractionRepository(db).getAll(),
          createRatingRepository(db).getAll(),
          createMediaRepository(db).getAll(),
          createSeasonAppearanceRepository(db).getAll(),
        ]);

        if (cancelled) {
          return;
        }

        const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));
        const mediaByYear = new Map<string, Media[]>();
        const mediaByAttraction = new Map<string, Media[]>();
        for (const item of media) {
          if (item.eventYearId) {
            mediaByYear.set(item.eventYearId, [...(mediaByYear.get(item.eventYearId) ?? []), item]);
          }
          if (item.attractionId) {
            mediaByAttraction.set(item.attractionId, [
              ...(mediaByAttraction.get(item.attractionId) ?? []),
              item,
            ]);
          }
        }

        // A season's line-up is everything that appeared in it, as on the
        // season's own page — a maze that returns is one record, filed under
        // the season it's filed under, and appears in the others.
        const appearedIn = new Map<string, Set<string>>();
        for (const appearance of appearances) {
          const seasons = appearedIn.get(appearance.attractionId) ?? new Set<string>();
          seasons.add(appearance.seasonId);
          appearedIn.set(appearance.attractionId, seasons);
        }

        const summaries = await Promise.all(
          years.map(async (eventYear) => {
            const items: YearAttraction[] = await Promise.all(
              attractions
                .filter(
                  (attraction) =>
                    attraction.eventYearId === eventYear.id ||
                    appearedIn.get(attraction.id)?.has(eventYear.id),
                )
                .map(async (attraction) => ({
                  attraction,
                  rating: ratingByAttraction.get(attraction.id) ?? null,
                  ...(await posterFields(mediaByAttraction.get(attraction.id) ?? [])),
                })),
            );

            const artwork = await seasonArtworkFields(mediaByYear.get(eventYear.id) ?? []);
            return summarizeYear(eventYear, items, artwork.artworkUrl, artwork.artworkFit);
          }),
        );

        setData({ isLoading: false, error: null, summaries });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setData({
          isLoading: false,
          error: error instanceof Error ? error.message : "Something went wrong loading the years.",
          summaries: [],
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setView = useCallback(
    (nextView: YearsView) => {
      setSearchParams(yearsParamsToSearchParams({ view: nextView, sort }), { replace: true });
    },
    [setSearchParams, sort],
  );

  const setSort = useCallback(
    (nextSort: YearRankingSort) => {
      setSearchParams(yearsParamsToSearchParams({ view, sort: nextSort }), { replace: true });
    },
    [setSearchParams, view],
  );

  // Seasons belong to a haunt, so the haunt in view decides which are
  // listed and which are ranked against each other.
  const summaries = useMemo(
    () => data.summaries.filter((summary) => isInHauntScope(summary.eventYear.hauntId, scope)),
    [data.summaries, scope],
  );

  const ranking = useMemo(() => buildYearRanking(summaries, sort), [summaries, sort]);

  return {
    isLoading: data.isLoading,
    error: data.error,
    summaries,
    view,
    setView,
    sort,
    setSort,
    ranking,
  };
}
