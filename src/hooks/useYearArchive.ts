import { useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import type { EventYear } from "../models/eventYear";
import type { Media } from "../models/media";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { createSeasonAppearanceRepository } from "../repositories/seasonAppearanceRepository";
import { pickMediaSrc } from "../media/mediaFiles";
import { computeYearStats, type YearAttraction, type YearStats } from "../utils/years";
import { classifySeasonLineage, type SeasonLineage } from "../utils/seasonLineage";

export interface YearArchive {
  isLoading: boolean;
  error: string | null;
  notFound: boolean;
  eventYear: EventYear | null;
  /** Real event artwork if any exists — never a generated stand-in. */
  artworkUrl: string | null;
  houses: YearAttraction[];
  scareZones: YearAttraction[];
  /**
   * The season's line-up split into what was new and what came back, from
   * verified debut years and earlier appearances only.
   */
  lineage: SeasonLineage<YearAttraction>;
  stats: YearStats | null;
}

const EMPTY_LINEAGE: SeasonLineage<YearAttraction> = {
  newThisYear: [],
  returning: [],
  unclassified: [],
  isIncomplete: false,
};

const INITIAL_STATE: YearArchive = {
  isLoading: true,
  error: null,
  notFound: false,
  eventYear: null,
  artworkUrl: null,
  houses: [],
  scareZones: [],
  lineage: EMPTY_LINEAGE,
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

        const attractionRepo = createAttractionRepository(db);
        const [ownAttractions, ratings, yearMedia, allMedia, appearances, allSeasons] =
          await Promise.all([
            attractionRepo.getByEventYear(eventYear.id),
            createRatingRepository(db).getAll(),
            createMediaRepository(db).getForEventYear(eventYear.id),
            createMediaRepository(db).getAll(),
            createSeasonAppearanceRepository(db).getAll(),
            createEventYearRepository(db).getAll(),
          ]);

        // A season's line-up is everything that appeared in it, which is not
        // the same as everything whose record belongs to it: a maze that
        // returns is one record, filed under its debut season, appearing
        // here as well.
        const returningIds = appearances
          .filter((appearance) => appearance.seasonId === eventYear.id)
          .map((appearance) => appearance.attractionId)
          .filter((id) => !ownAttractions.some((attraction) => attraction.id === id));
        const returningAttractions = (
          await Promise.all(returningIds.map((id) => attractionRepo.getById(id)))
        ).filter((attraction): attraction is NonNullable<typeof attraction> => attraction !== null);
        const attractions = [...ownAttractions, ...returningAttractions];

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
          lineage: classifySeasonLineage(
            items,
            eventYear,
            appearances,
            new Map(allSeasons.map((season) => [season.id, season.calendarYear])),
          ),
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
