import { useCallback, useEffect, useMemo, useState } from "react";
import { getDatabase } from "../database/client";
import type { Attraction } from "../models/attraction";
import type { EntityId } from "../models/common";
import type { EventYear, EventYearInput } from "../models/eventYear";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createNoteRepository } from "../repositories/noteRepository";
import { createRatingRepository } from "../repositories/ratingRepository";

export interface AdminAttractionRow {
  attraction: Attraction;
  eventYear: EventYear | null;
  /** What deleting this record would take with it, beyond the archive facts. */
  ratingTotal: number | null;
  hasNote: boolean;
}

export interface AdminArchive {
  isLoading: boolean;
  error: string | null;
  years: EventYear[];
  attractions: AdminAttractionRow[];
  /** How many attractions each event year still holds — a year is only removable at zero. */
  attractionCountByYear: Map<EntityId, number>;

  createYear: (input: EventYearInput) => Promise<void>;
  updateYear: (id: EntityId, input: Partial<EventYearInput>) => Promise<void>;
  deleteYear: (id: EntityId) => Promise<void>;
  deleteAttraction: (id: EntityId) => Promise<void>;
}

/**
 * The admin console's data.
 *
 * Every mutation goes through the ordinary repositories — admin mode gets no
 * privileged path around their validation — and rejects by throwing, so the
 * caller can show the failure instead of silently doing nothing.
 */
export function useAdminArchive(): AdminArchive {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [years, setYears] = useState<EventYear[]>([]);
  const [attractions, setAttractions] = useState<AdminAttractionRow[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await getDatabase();
        const [loadedYears, loadedAttractions, ratings, notes] = await Promise.all([
          createEventYearRepository(db).getAll(),
          createAttractionRepository(db).getAll(),
          createRatingRepository(db).getAll(),
          createNoteRepository(db).getAll(),
        ]);

        if (cancelled) {
          return;
        }

        const yearsById = new Map(loadedYears.map((year) => [year.id, year]));
        const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));
        const notedAttractions = new Set(notes.map((note) => note.attractionId));

        setYears(loadedYears);
        setAttractions(
          loadedAttractions.map((attraction) => ({
            attraction,
            eventYear: yearsById.get(attraction.eventYearId) ?? null,
            ratingTotal: ratingByAttraction.get(attraction.id)?.total ?? null,
            hasNote: notedAttractions.has(attraction.id),
          })),
        );
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Couldn't load the archive.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const attractionCountByYear = useMemo(() => {
    const counts = new Map<EntityId, number>();
    for (const row of attractions) {
      counts.set(row.attraction.eventYearId, (counts.get(row.attraction.eventYearId) ?? 0) + 1);
    }
    return counts;
  }, [attractions]);

  const createYear = useCallback(
    async (input: EventYearInput) => {
      const db = await getDatabase();
      await createEventYearRepository(db).create(input);
      reload();
    },
    [reload],
  );

  const updateYear = useCallback(
    async (id: EntityId, input: Partial<EventYearInput>) => {
      const db = await getDatabase();
      await createEventYearRepository(db).update(id, input);
      reload();
    },
    [reload],
  );

  const deleteYear = useCallback(
    async (id: EntityId) => {
      const db = await getDatabase();
      await createEventYearRepository(db).delete(id);
      reload();
    },
    [reload],
  );

  const deleteAttraction = useCallback(
    async (id: EntityId) => {
      const db = await getDatabase();
      await createAttractionRepository(db).delete(id);
      reload();
    },
    [reload],
  );

  return {
    isLoading,
    error,
    years,
    attractions,
    attractionCountByYear,
    createYear,
    updateYear,
    deleteYear,
    deleteAttraction,
  };
}
