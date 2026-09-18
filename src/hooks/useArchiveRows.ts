import { useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import type { StatisticsRow } from "../utils/statistics";

export interface ArchiveRows {
  isLoading: boolean;
  error: string | null;
  /** Every attraction with its event year and review, or `null` where unrated. */
  rows: StatisticsRow[];
}

const INITIAL: ArchiveRows = { isLoading: true, error: null, rows: [] };

/**
 * The whole archive joined into one flat row per attraction — the shape both
 * the dashboard and the explorer count from. Shared so the two can't drift
 * into loading or joining the data differently and quietly disagreeing.
 */
export function useArchiveRows(): ArchiveRows {
  const [state, setState] = useState<ArchiveRows>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await getDatabase();
        const [attractions, years, ratings] = await Promise.all([
          createAttractionRepository(db).getAll(),
          createEventYearRepository(db).getAll(),
          createRatingRepository(db).getAll(),
        ]);

        if (cancelled) {
          return;
        }

        const yearsById = new Map(years.map((year) => [year.id, year]));
        const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));

        setState({
          isLoading: false,
          error: null,
          rows: attractions.map((attraction) => ({
            attraction,
            eventYear: yearsById.get(attraction.eventYearId) ?? null,
            rating: ratingByAttraction.get(attraction.id) ?? null,
          })),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Something went wrong loading the archive.",
          rows: [],
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
