import { useCallback, useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import type { Attraction } from "../models/attraction";
import type { AttractionRelation } from "../models/attractionRelation";
import type { Character } from "../models/character";
import type { EventYear } from "../models/eventYear";
import type { Media } from "../models/media";
import type { Note } from "../models/note";
import type { Rating, RatingInput } from "../models/rating";
import type { Source } from "../models/source";
import { createAttractionRelationRepository } from "../repositories/attractionRelationRepository";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createCharacterRepository } from "../repositories/characterRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createNoteRepository } from "../repositories/noteRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { createSourceRepository } from "../repositories/sourceRepository";

export interface RelatedAttractionItem {
  relation: AttractionRelation;
  attraction: Attraction;
  eventYear: EventYear | null;
  /** `null` means genuinely unrated — never treat that as a rating of 0. */
  rating: Rating | null;
}

export interface AttractionWikiData {
  isLoading: boolean;
  error: string | null;
  /** True once loading has finished and no attraction with this id exists. */
  notFound: boolean;
  attraction: Attraction | null;
  eventYear: EventYear | null;
  media: Media[];
  characters: Character[];
  sources: Source[];
  /** `null` means genuinely unrated — never treat that as a rating of 0. */
  rating: Rating | null;
  /** The user's own free-text note, kept separate from the archive's facts. */
  note: Note | null;
  relatedItems: RelatedAttractionItem[];
}

export interface AttractionWikiActions {
  /**
   * Persists the rating and note together, as one explicit save. Rejects
   * on a validation or database failure so the editor can keep the user's
   * unsaved input on screen rather than losing it.
   */
  saveReview(input: RatingInput, note: string): Promise<void>;
  /**
   * Deletes the rating row so the attraction is genuinely unrated again —
   * not rated zero. The note is deliberately kept: it's separate writing
   * the user never asked to throw away.
   */
  clearRating(): Promise<void>;
}

export type AttractionWiki = AttractionWikiData & AttractionWikiActions;

const INITIAL_STATE: AttractionWikiData = {
  isLoading: true,
  error: null,
  notFound: false,
  attraction: null,
  eventYear: null,
  media: [],
  characters: [],
  sources: [],
  rating: null,
  note: null,
  relatedItems: [],
};

/**
 * Loads everything one attraction's wiki page needs: the archive record
 * itself plus its event year, media, characters, sources and personal
 * rating, and — for every related attraction — enough of the same shape
 * to render an `AttractionPreviewCard`. Related-attraction lookups go
 * through the same per-id repository methods used elsewhere in the app;
 * this is fine at the "a handful of relations per attraction" scale the
 * archive actually has, so it isn't worth adding batched-by-id queries
 * just for this page.
 *
 * Also owns the two review mutations, so a save updates what's on screen
 * without a refetch or a page reload.
 */
export function useAttractionWiki(attractionId: string | undefined): AttractionWiki {
  const [state, setState] = useState<AttractionWikiData>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!attractionId) {
        if (!cancelled) {
          setState({ ...INITIAL_STATE, isLoading: false, notFound: true });
        }
        return;
      }

      setState((previous) => ({ ...previous, isLoading: true, error: null, notFound: false }));

      try {
        const db = await getDatabase();
        const attractionRepo = createAttractionRepository(db);
        const eventYearRepo = createEventYearRepository(db);
        const mediaRepo = createMediaRepository(db);
        const characterRepo = createCharacterRepository(db);
        const sourceRepo = createSourceRepository(db);
        const ratingRepo = createRatingRepository(db);
        const noteRepo = createNoteRepository(db);
        const relationRepo = createAttractionRelationRepository(db);

        const attraction = await attractionRepo.getById(attractionId);
        if (!attraction) {
          if (!cancelled) {
            setState({ ...INITIAL_STATE, isLoading: false, notFound: true });
          }
          return;
        }

        const [eventYear, media, characters, sources, rating, note, relations] = await Promise.all([
          eventYearRepo.getById(attraction.eventYearId),
          mediaRepo.getForAttraction(attraction.id),
          characterRepo.getByAttraction(attraction.id),
          sourceRepo.getForAttraction(attraction.id),
          ratingRepo.getForAttraction(attraction.id),
          noteRepo.getForAttraction(attraction.id),
          relationRepo.getForAttraction(attraction.id),
        ]);

        const otherIds = Array.from(
          new Set(
            relations.map((relation) =>
              relation.attractionId === attraction.id
                ? relation.relatedAttractionId
                : relation.attractionId,
            ),
          ),
        );

        const otherAttractions = await Promise.all(
          otherIds.map((id) => attractionRepo.getById(id)),
        );
        const attractionById = new Map(
          otherAttractions
            .filter((other): other is Attraction => other !== null)
            .map((other) => [other.id, other]),
        );

        const relatedYearIds = Array.from(
          new Set(Array.from(attractionById.values()).map((other) => other.eventYearId)),
        );
        const relatedYears = await Promise.all(
          relatedYearIds.map((id) => eventYearRepo.getById(id)),
        );
        const yearById = new Map(
          relatedYears
            .filter((year): year is EventYear => year !== null)
            .map((year) => [year.id, year]),
        );

        const relatedAttractionIds = Array.from(attractionById.keys());
        const relatedRatings = await Promise.all(
          relatedAttractionIds.map((id) => ratingRepo.getForAttraction(id)),
        );
        const ratingById = new Map(
          relatedAttractionIds.map((id, index) => [id, relatedRatings[index]]),
        );

        const relatedItems: RelatedAttractionItem[] = relations.flatMap((relation) => {
          const otherId =
            relation.attractionId === attraction.id
              ? relation.relatedAttractionId
              : relation.attractionId;
          const other = attractionById.get(otherId);
          if (!other) {
            return [];
          }
          return [
            {
              relation,
              attraction: other,
              eventYear: yearById.get(other.eventYearId) ?? null,
              rating: ratingById.get(other.id) ?? null,
            },
          ];
        });

        if (cancelled) {
          return;
        }

        setState({
          isLoading: false,
          error: null,
          notFound: false,
          attraction,
          eventYear,
          media,
          characters,
          sources,
          rating,
          note,
          relatedItems,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          ...INITIAL_STATE,
          isLoading: false,
          error: error instanceof Error ? error.message : "Something went wrong.",
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [attractionId]);

  const saveReview = useCallback(
    async (input: RatingInput, noteText: string) => {
      if (!attractionId) {
        return;
      }
      const db = await getDatabase();
      const rating = await createRatingRepository(db).upsert(attractionId, input);

      const noteRepo = createNoteRepository(db);
      const trimmed = noteText.trim();
      let note: Note | null = null;
      if (trimmed) {
        note = await noteRepo.upsert(attractionId, trimmed);
      } else {
        await noteRepo.delete(attractionId);
      }

      setState((previous) => ({ ...previous, rating, note }));
    },
    [attractionId],
  );

  const clearRating = useCallback(async () => {
    if (!attractionId) {
      return;
    }
    const db = await getDatabase();
    await createRatingRepository(db).delete(attractionId);
    setState((previous) => ({ ...previous, rating: null }));
  }, [attractionId]);

  return { ...state, saveReview, clearRating };
}
