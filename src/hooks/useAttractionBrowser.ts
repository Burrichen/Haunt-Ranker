import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getDatabase } from "../database/client";
import { pickMediaSrc } from "../media/mediaFiles";
import type { AttractionType } from "../models/attraction";
import type { Media } from "../models/media";
import { allTimeScope } from "../models/ranking";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createRankingRepository } from "../repositories/rankingRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import {
  areFiltersActive as computeAreFiltersActive,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  filterAndSortRows,
  type AttractionBrowserFilters,
  type AttractionBrowserRow,
  type SortOption,
} from "../utils/attractionBrowser";
import {
  attractionBrowserParamsToSearchParams,
  parseAttractionBrowserParams,
} from "../utils/attractionBrowserParams";

interface DataState {
  isLoading: boolean;
  error: string | null;
  allRows: AttractionBrowserRow[];
  hasManualRanking: boolean;
}

const INITIAL_DATA_STATE: DataState = {
  isLoading: true,
  error: null,
  allRows: [],
  hasManualRanking: false,
};

export interface AttractionBrowser {
  isLoading: boolean;
  error: string | null;
  /** Filtered, sorted rows ready to render. */
  rows: AttractionBrowserRow[];
  /** Every year present in the unfiltered dataset, newest first — for building the year filter. */
  availableYears: number[];
  /** Whether a manual ranking exists for this type at all — "Personal Ranking" sort is hidden otherwise. */
  hasManualRanking: boolean;
  filters: AttractionBrowserFilters;
  setFilters: (filters: AttractionBrowserFilters) => void;
  sort: SortOption;
  setSort: (sort: SortOption) => void;
  clearFilters: () => void;
  areFiltersActive: boolean;
}

/**
 * Loads every attraction of one type plus everything the browser needs to
 * filter/sort/display it (event years, media, ratings, manual ranking),
 * and derives the visible rows from the page's own URL search params —
 * filter/sort state is the URL, so opening an attraction and returning
 * restores exactly where the user left off. View mode is a separate,
 * locally-persisted preference (see `useAttractionViewMode`), not part of
 * the URL.
 */
export function useAttractionBrowser(attractionType: AttractionType): AttractionBrowser {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<DataState>(INITIAL_DATA_STATE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setData((previous) => ({ ...previous, isLoading: true, error: null }));
      try {
        const db = await getDatabase();
        const attractionRepo = createAttractionRepository(db);
        const eventYearRepo = createEventYearRepository(db);
        const mediaRepo = createMediaRepository(db);
        const ratingRepo = createRatingRepository(db);
        const rankingRepo = createRankingRepository(db);

        const [attractions, years, mediaList, ratings, rankingEntries] = await Promise.all([
          attractionRepo.getByType(attractionType),
          eventYearRepo.getAll(),
          mediaRepo.getAll(),
          ratingRepo.getAll(),
          rankingRepo.getScope(allTimeScope(attractionType)),
        ]);

        if (cancelled) {
          return;
        }

        const yearsById = new Map(years.map((year) => [year.id, year]));
        const mediaByAttraction = new Map<string, Media[]>();
        for (const media of mediaList) {
          if (!media.attractionId) {
            continue;
          }
          const list = mediaByAttraction.get(media.attractionId) ?? [];
          list.push(media);
          mediaByAttraction.set(media.attractionId, list);
        }
        const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));
        const positionByAttraction = new Map(
          rankingEntries.map((entry) => [entry.attractionId, entry.position]),
        );

        const allRows: AttractionBrowserRow[] = await Promise.all(
          attractions.map(async (attraction) => ({
            attraction,
            eventYear: yearsById.get(attraction.eventYearId) ?? null,
            posterUrl: await pickMediaSrc(mediaByAttraction.get(attraction.id) ?? [], "poster"),
            rating: ratingByAttraction.get(attraction.id) ?? null,
            rankingPosition: positionByAttraction.get(attraction.id) ?? null,
          })),
        );

        setData({
          isLoading: false,
          error: null,
          allRows,
          hasManualRanking: rankingEntries.length > 0,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setData({
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Something went wrong loading the archive.",
          allRows: [],
          hasManualRanking: false,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [attractionType]);

  const { filters, sort: rawSort } = useMemo(
    () => parseAttractionBrowserParams(searchParams),
    [searchParams],
  );

  // "Personal Ranking" only makes sense once a manual ranking actually
  // exists — fall back gracefully rather than silently showing an empty
  // or misleadingly-ordered list.
  const sort: SortOption = rawSort === "manual" && !data.hasManualRanking ? DEFAULT_SORT : rawSort;

  const updateParams = useCallback(
    (nextFilters: AttractionBrowserFilters, nextSort: SortOption) => {
      setSearchParams(attractionBrowserParamsToSearchParams(nextFilters, nextSort), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const setFilters = useCallback(
    (next: AttractionBrowserFilters) => updateParams(next, sort),
    [updateParams, sort],
  );
  const setSort = useCallback(
    (next: SortOption) => updateParams(filters, next),
    [updateParams, filters],
  );
  const clearFilters = useCallback(() => updateParams(DEFAULT_FILTERS, sort), [updateParams, sort]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const row of data.allRows) {
      if (row.eventYear) {
        years.add(row.eventYear.calendarYear);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [data.allRows]);

  const rows = useMemo(
    () => filterAndSortRows(data.allRows, filters, sort),
    [data.allRows, filters, sort],
  );

  return {
    isLoading: data.isLoading,
    error: data.error,
    rows,
    availableYears,
    hasManualRanking: data.hasManualRanking,
    filters,
    setFilters,
    sort,
    setSort,
    clearFilters,
    areFiltersActive: computeAreFiltersActive(filters),
  };
}
