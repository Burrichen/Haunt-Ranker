import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getDatabase } from "../database/client";
import { useHauntScope } from "./useHauntScope";
import type { EntityId } from "../models/common";
import { rankingGroupScope, type RankingGroup, type RankingHauntScope } from "../models/ranking";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createRankingRepository } from "../repositories/rankingRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import {
  areRankingFiltersActive,
  buildCalculatedRanking,
  buildManualRanking,
  DEFAULT_RANKING_FILTERS,
  DEFAULT_RANKING_SORT,
  groupAttractionTypes,
  matchesRankingFilters,
  moveItem,
  applyVisibleOrder,
  type RankingFilters,
  type RankingMode,
  type RankingRow,
  type RankingSort,
} from "../utils/rankings";
import { parseRankingsParams, rankingsParamsToSearchParams } from "../utils/rankingsParams";

interface DataState {
  isLoading: boolean;
  error: string | null;
  /** Every attraction in the group, before user filtering. */
  rows: RankingRow[];
  /** The saved manual order for this group, or empty if there isn't one. */
  orderedIds: EntityId[];
}

const INITIAL_DATA: DataState = {
  isLoading: true,
  error: null,
  rows: [],
  orderedIds: [],
};

export interface Rankings {
  isLoading: boolean;
  error: string | null;

  group: RankingGroup;
  setGroup: (group: RankingGroup) => void;

  /** Whose list this is: one haunt's, or the All Haunts list. */
  haunt: RankingHauntScope;
  setHaunt: (haunt: RankingHauntScope) => void;

  /** Resolved mode — manual whenever a saved manual ranking exists, unless the URL says otherwise. */
  mode: RankingMode;
  setMode: (mode: RankingMode) => void;
  /** True once the user has saved an order for this group. */
  hasManualRanking: boolean;

  filters: RankingFilters;
  setFilters: (filters: RankingFilters) => void;
  clearFilters: () => void;
  areFiltersActive: boolean;
  availableYears: number[];

  sort: RankingSort;
  setSort: (sort: RankingSort) => void;

  /** The ranking itself, in display order. */
  ranked: RankingRow[];
  /** Rated attractions with no manual position yet — manual mode only. */
  unplaced: RankingRow[];
  /** Unrated attractions, deliberately kept out of the ranking rather than scored as zero. */
  unrated: RankingRow[];

  isSaving: boolean;
  saveError: string | null;

  /** Moves a visible row and persists the result immediately. */
  reorder: (from: number, to: number) => Promise<void>;
  /** Appends an unplaced attraction to the end of the manual order. */
  addToRanking: (attractionId: EntityId) => Promise<void>;
  /** Deletes the saved manual order for this group and returns to the calculated one. */
  resetToCalculated: () => Promise<void>;
}

/**
 * Loads a ranking group and owns every write to its manual order.
 *
 * Group/mode/filter/sort state lives in the URL, matching the attraction
 * browser, so leaving for a wiki page and coming back restores the view.
 * The manual order itself is the only thing persisted to the database, and
 * only ever by an explicit reorder — sorting, filtering and switching modes
 * never write.
 */
export function useRankings(): Rankings {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<DataState>(INITIAL_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { scope, setScope } = useHauntScope();
  const params = useMemo(() => parseRankingsParams(searchParams), [searchParams]);
  const { group, filters, sort } = params;
  // A link can pin a haunt; otherwise this page shows the one the rest of
  // the app is showing, rather than resetting to a different archive.
  const haunt = searchParams.get("haunt") === null ? scope : params.haunt;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setData((previous) => ({ ...previous, isLoading: true, error: null }));
      try {
        const db = await getDatabase();
        const [attractions, years, ratings, entries] = await Promise.all([
          createAttractionRepository(db).getAll(),
          createEventYearRepository(db).getAll(),
          createRatingRepository(db).getAll(),
          createRankingRepository(db).getScope(rankingGroupScope(group, haunt)),
        ]);

        if (cancelled) {
          return;
        }

        const yearsById = new Map(years.map((year) => [year.id, year]));
        const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));
        const types = groupAttractionTypes(group);

        const rows: RankingRow[] = attractions
          .filter((attraction) => types.includes(attraction.attractionType))
          .map((attraction) => ({
            attraction,
            eventYear: yearsById.get(attraction.eventYearId) ?? null,
            rating: ratingByAttraction.get(attraction.id) ?? null,
          }))
          // A haunt's list holds only that haunt's attractions; All Haunts
          // holds them all, as its own list rather than a merge of the two.
          .filter((row) => haunt === "all" || row.eventYear?.hauntId === haunt);

        setData({
          isLoading: false,
          error: null,
          rows,
          orderedIds: entries.map((entry) => entry.attractionId),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setData({
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Something went wrong loading your rankings.",
          rows: [],
          orderedIds: [],
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [group, haunt]);

  const hasManualRanking = data.orderedIds.length > 0;
  // A saved manual order takes precedence: it's what the user sees by
  // default, and the calculated view becomes the opt-in one.
  const mode: RankingMode = params.mode ?? (hasManualRanking ? "manual" : "calculated");

  const updateParams = useCallback(
    (next: Partial<Parameters<typeof rankingsParamsToSearchParams>[0]>) => {
      setSearchParams(rankingsParamsToSearchParams({ ...params, ...next }), { replace: true });
    },
    [params, setSearchParams],
  );

  const setGroup = useCallback(
    (nextGroup: RankingGroup) => {
      // Mode is deliberately unpinned when switching groups, so each group
      // falls back to its own default rather than inheriting the last one's.
      updateParams({ group: nextGroup, mode: null, filters: DEFAULT_RANKING_FILTERS });
    },
    [updateParams],
  );
  const setHaunt = useCallback(
    (nextHaunt: RankingHauntScope) => {
      // Each list keeps its own order, so switching haunts only changes
      // which one is being looked at — it never writes to either. The
      // choice is the app-wide one, so the nav and every other page follow.
      setScope(nextHaunt);
      updateParams({ haunt: nextHaunt, mode: null, filters: DEFAULT_RANKING_FILTERS });
    },
    [setScope, updateParams],
  );
  const setMode = useCallback(
    (nextMode: RankingMode) => updateParams({ mode: nextMode }),
    [updateParams],
  );
  const setFilters = useCallback(
    (nextFilters: RankingFilters) => updateParams({ filters: nextFilters }),
    [updateParams],
  );
  const clearFilters = useCallback(
    () => updateParams({ filters: DEFAULT_RANKING_FILTERS }),
    [updateParams],
  );
  const setSort = useCallback(
    (nextSort: RankingSort) => updateParams({ sort: nextSort }),
    [updateParams],
  );

  const visibleRows = useMemo(
    () => data.rows.filter((row) => matchesRankingFilters(row, filters)),
    [data.rows, filters],
  );

  /**
   * The order a manual reorder is applied against. Before anything is saved
   * this is the calculated order over *every* row, not just the visible
   * ones, so a first drag under an active filter can't drop the rest of the
   * list on the floor.
   */
  const fullOrder = useMemo(() => {
    if (hasManualRanking) {
      return data.orderedIds;
    }
    return buildCalculatedRanking(data.rows).ranked.map((row) => row.attraction.id);
  }, [hasManualRanking, data.orderedIds, data.rows]);

  const lists = useMemo(() => {
    if (mode === "manual") {
      // Manual order is the user's, so the exploratory sort deliberately
      // doesn't touch it — it only orders the side lists.
      return buildManualRanking(visibleRows, fullOrder, DEFAULT_RANKING_SORT);
    }
    const { ranked, unrated } = buildCalculatedRanking(visibleRows, sort);
    return { ranked, unplaced: [] as RankingRow[], unrated };
  }, [mode, visibleRows, fullOrder, sort]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const row of data.rows) {
      if (row.eventYear) {
        years.add(row.eventYear.calendarYear);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [data.rows]);

  const persistOrder = useCallback(
    async (nextOrder: EntityId[]) => {
      setIsSaving(true);
      setSaveError(null);
      try {
        const db = await getDatabase();
        await createRankingRepository(db).setScope(rankingGroupScope(group, haunt), nextOrder);
        setData((previous) => ({ ...previous, orderedIds: nextOrder }));
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Couldn't save your ranking order.");
      } finally {
        setIsSaving(false);
      }
    },
    [group, haunt],
  );

  const reorder = useCallback(
    async (from: number, to: number) => {
      const visibleIds = lists.ranked.map((row) => row.attraction.id);
      const reordered = moveItem(visibleIds, from, to);
      if (reordered === visibleIds) {
        return;
      }
      await persistOrder(applyVisibleOrder(fullOrder, reordered));
    },
    [lists.ranked, fullOrder, persistOrder],
  );

  const addToRanking = useCallback(
    async (attractionId: EntityId) => {
      await persistOrder([...fullOrder, attractionId]);
    },
    [fullOrder, persistOrder],
  );

  const resetToCalculated = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const db = await getDatabase();
      await createRankingRepository(db).clearScope(rankingGroupScope(group, haunt));
      setData((previous) => ({ ...previous, orderedIds: [] }));
      updateParams({ mode: "calculated" });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Couldn't reset your ranking.");
    } finally {
      setIsSaving(false);
    }
  }, [group, haunt, updateParams]);

  return {
    isLoading: data.isLoading,
    error: data.error,
    group,
    setGroup,
    haunt,
    setHaunt,
    mode,
    setMode,
    hasManualRanking,
    filters,
    setFilters,
    clearFilters,
    areFiltersActive: areRankingFiltersActive(filters),
    availableYears,
    sort,
    setSort,
    ranked: lists.ranked,
    unplaced: lists.unplaced,
    unrated: lists.unrated,
    isSaving,
    saveError,
    reorder,
    addToRanking,
    resetToCalculated,
  };
}
