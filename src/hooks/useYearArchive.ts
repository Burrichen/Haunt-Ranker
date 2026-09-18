import { useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import type { EventYear } from "../models/eventYear";
import type { Media } from "../models/media";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { pickMediaSrc } from "../media/mediaFiles";
import { computeYearStats, type YearAttraction, type YearStats } from "../utils/years";

export interface YearArchive {
  isLoading: boolean;
  error: string | null;
  notFound: boolean;
  eventYear: EventYear | null;
  /** Real event artwork if any exists — never a generated stand-in. */
  artworkUrl: string | null;
  houses: YearAttraction[];
  scareZones: YearAttraction[];
  stats: YearStats | null;
}

const INITIAL_STATE: YearArchive = {
  isLoading: true,
  error: null,
  notFound: false,
  eventYear: null,
  artworkUrl: null,
  houses: [],
  scareZones: [],
  stats: null,
};

/** Loads one event year: its artwork, its attractions split by type, and its statistics. */
export function useYearArchive(eventYearId: string | undefined): YearArchive {
  const [state, setState] = useState<YearArchive>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!eventYearId) {
        if (!cancelled) {
          setState({ ...INITIAL_STATE, isLoading: false, notFound: true });
        }
        return;
      }

      try {
        const db = await getDatabase();
        const eventYear = await createEventYearRepository(db).getById(eventYearId);
        if (!eventYear) {
          if (!cancelled) {
            setState({ ...INITIAL_STATE, isLoading: false, notFound: true });
          }
          return;
        }

        const [attractions, ratings, yearMedia, allMedia] = await Promise.all([
          createAttractionRepository(db).getByEventYear(eventYear.id),
          createRatingRepository(db).getAll(),
          createMediaRepository(db).getForEventYear(eventYear.id),
          createMediaRepository(db).getAll(),
        ]);

        if (cancelled) {
          return;
        }

        const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));
        const mediaByAttraction = new Map<string, Media[]>();
        for (const item of allMedia) {
          if (item.attractionId) {
            mediaByAttraction.set(item.attractionId, [
              ...(mediaByAttraction.get(item.attractionId) ?? []),
              item,
            ]);
          }
        }

        const items: YearAttraction[] = await Promise.all(
          attractions.map(async (attraction) => ({
            attraction,
            rating: ratingByAttraction.get(attraction.id) ?? null,
            posterUrl: await pickMediaSrc(mediaByAttraction.get(attraction.id) ?? [], "poster"),
          })),
        );

        setState({
          isLoading: false,
          error: null,
          notFound: false,
          eventYear,
          artworkUrl: await pickMediaSrc(yearMedia, "event_artwork"),
          houses: items.filter((item) => item.attraction.attractionType === "house"),
          scareZones: items.filter((item) => item.attraction.attractionType === "scare_zone"),
          stats: computeYearStats(items),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          ...INITIAL_STATE,
          isLoading: false,
          error: error instanceof Error ? error.message : "Something went wrong loading this year.",
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventYearId]);

  return state;
}
