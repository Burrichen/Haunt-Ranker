import { useCallback, useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import type { Attraction, AttractionInput } from "../models/attraction";
import type { AttractionRelation, AttractionRelationInput } from "../models/attractionRelation";
import type { Character, CharacterInput } from "../models/character";
import type { EntityId } from "../models/common";
import type { EventYear } from "../models/eventYear";
import type { Media, MediaInput } from "../models/media";
import type { Source, SourceInput } from "../models/source";
import { deleteLocalMediaFile } from "../media/mediaFiles";
import { createAttractionRelationRepository } from "../repositories/attractionRelationRepository";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createCharacterRepository } from "../repositories/characterRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createSourceRepository } from "../repositories/sourceRepository";

export interface EditorRelation {
  relation: AttractionRelation;
  /** The attraction on the other side of the pair, whichever side that is. */
  other: Attraction | null;
}

export interface AttractionEditor {
  isLoading: boolean;
  error: string | null;
  notFound: boolean;

  /** `null` while creating a new attraction. */
  attraction: Attraction | null;
  years: EventYear[];
  /** Every other attraction, for picking a related one. */
  otherAttractions: Attraction[];
  characters: Character[];
  relations: EditorRelation[];
  sources: Source[];
  /** Every source in the archive, so an existing one can be cited rather than duplicated. */
  allSources: Source[];
  media: Media[];

  /** Creates or updates the core record. Resolves with the saved attraction's id. */
  save: (input: AttractionInput) => Promise<EntityId>;
  deleteAttraction: () => Promise<void>;

  addCharacter: (input: Omit<CharacterInput, "attractionId">) => Promise<void>;
  removeCharacter: (id: EntityId) => Promise<void>;
  addRelation: (input: Omit<AttractionRelationInput, "attractionId">) => Promise<void>;
  removeRelation: (id: EntityId) => Promise<void>;
  addSource: (input: SourceInput) => Promise<void>;
  updateSource: (id: EntityId, input: SourceInput) => Promise<void>;
  attachSource: (id: EntityId) => Promise<void>;
  /** Stops this attraction citing the source; the source itself stays. */
  removeSource: (id: EntityId) => Promise<void>;
  /** Removes the source from the archive entirely. */
  deleteSource: (id: EntityId) => Promise<void>;
  addMedia: (input: Omit<MediaInput, "owner">) => Promise<void>;
  removeMedia: (media: Media) => Promise<void>;
}

interface EditorData {
  attraction: Attraction | null;
  characters: Character[];
  relations: EditorRelation[];
  sources: Source[];
  media: Media[];
}

const EMPTY: EditorData = {
  attraction: null,
  characters: [],
  relations: [],
  sources: [],
  media: [],
};

/**
 * Everything the attraction editor reads and writes.
 *
 * Sub-records (characters, related attractions, sources, media) are saved the
 * moment they're added or removed rather than being staged with the main
 * form: they're separate rows in separate tables, and pretending otherwise
 * would mean inventing a transaction the repositories don't offer. The core
 * record is the only thing behind a Save button.
 */
export function useAttractionEditor(attractionId: EntityId | undefined): AttractionEditor {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [years, setYears] = useState<EventYear[]>([]);
  const [otherAttractions, setOtherAttractions] = useState<Attraction[]>([]);
  const [allSources, setAllSources] = useState<Source[]>([]);
  const [data, setData] = useState<EditorData>(EMPTY);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await getDatabase();
        const attractionRepo = createAttractionRepository(db);
        const [loadedYears, allAttractions, loadedSources] = await Promise.all([
          createEventYearRepository(db).getAll(),
          attractionRepo.getAll(),
          createSourceRepository(db).getAll(),
        ]);

        if (cancelled) {
          return;
        }

        setYears(loadedYears);
        setOtherAttractions(allAttractions.filter((item) => item.id !== attractionId));
        setAllSources(loadedSources);

        if (!attractionId) {
          setData(EMPTY);
          setNotFound(false);
          setError(null);
          return;
        }

        const attraction = allAttractions.find((item) => item.id === attractionId) ?? null;
        if (!attraction) {
          setNotFound(true);
          setData(EMPTY);
          return;
        }

        const [characters, rawRelations, sources, media] = await Promise.all([
          createCharacterRepository(db).getByAttraction(attraction.id),
          createAttractionRelationRepository(db).getForAttraction(attraction.id),
          createSourceRepository(db).getForAttraction(attraction.id),
          createMediaRepository(db).getForAttraction(attraction.id),
        ]);

        if (cancelled) {
          return;
        }

        const byId = new Map(allAttractions.map((item) => [item.id, item]));
        setData({
          attraction,
          characters,
          relations: rawRelations.map((relation) => ({
            relation,
            other:
              byId.get(
                relation.attractionId === attraction.id
                  ? relation.relatedAttractionId
                  : relation.attractionId,
              ) ?? null,
          })),
          sources,
          media,
        });
        setNotFound(false);
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Couldn't load this attraction.");
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
  }, [attractionId, reloadToken]);

  const save = useCallback(
    async (input: AttractionInput) => {
      const db = await getDatabase();
      const repo = createAttractionRepository(db);

      if (!attractionId) {
        const created = await repo.create(input);
        return created.id;
      }

      // Editing archive facts touches only the archive tables — the user's
      // rating, note and ranking positions are separate rows and are never
      // part of this write.
      await repo.update(attractionId, input);
      reload();
      return attractionId;
    },
    [attractionId, reload],
  );

  const requireAttraction = useCallback((): EntityId => {
    if (!attractionId) {
      throw new Error("Save the attraction before adding related records to it");
    }
    return attractionId;
  }, [attractionId]);

  const deleteAttraction = useCallback(async () => {
    const db = await getDatabase();
    await createAttractionRepository(db).delete(requireAttraction());
  }, [requireAttraction]);

  const addCharacter = useCallback(
    async (input: Omit<CharacterInput, "attractionId">) => {
      const db = await getDatabase();
      await createCharacterRepository(db).create({ ...input, attractionId: requireAttraction() });
      reload();
    },
    [requireAttraction, reload],
  );

  const removeCharacter = useCallback(
    async (id: EntityId) => {
      const db = await getDatabase();
      await createCharacterRepository(db).delete(id);
      reload();
    },
    [reload],
  );

  const addRelation = useCallback(
    async (input: Omit<AttractionRelationInput, "attractionId">) => {
      const db = await getDatabase();
      await createAttractionRelationRepository(db).create({
        ...input,
        attractionId: requireAttraction(),
      });
      reload();
    },
    [requireAttraction, reload],
  );

  const removeRelation = useCallback(
    async (id: EntityId) => {
      const db = await getDatabase();
      await createAttractionRelationRepository(db).delete(id);
      reload();
    },
    [reload],
  );

  const addSource = useCallback(
    async (input: SourceInput) => {
      const db = await getDatabase();
      const repo = createSourceRepository(db);
      const created = await repo.create(input);
      await repo.attachToAttraction(requireAttraction(), created.id);
      reload();
    },
    [requireAttraction, reload],
  );

  const updateSource = useCallback(
    async (id: EntityId, input: SourceInput) => {
      const db = await getDatabase();
      await createSourceRepository(db).update(id, input);
      reload();
    },
    [reload],
  );

  const attachSource = useCallback(
    async (id: EntityId) => {
      const db = await getDatabase();
      await createSourceRepository(db).attachToAttraction(requireAttraction(), id);
      reload();
    },
    [requireAttraction, reload],
  );

  const removeSource = useCallback(
    async (id: EntityId) => {
      const db = await getDatabase();
      // Detached from this attraction, not deleted — a source can be cited by
      // more than one record, and those still need it.
      await createSourceRepository(db).detachFromAttraction(requireAttraction(), id);
      reload();
    },
    [requireAttraction, reload],
  );

  const deleteSource = useCallback(
    async (id: EntityId) => {
      const db = await getDatabase();
      await createSourceRepository(db).delete(id);
      reload();
    },
    [reload],
  );

  const addMedia = useCallback(
    async (input: Omit<MediaInput, "owner">) => {
      const db = await getDatabase();
      await createMediaRepository(db).create({
        ...input,
        owner: { attractionId: requireAttraction() },
      });
      reload();
    },
    [requireAttraction, reload],
  );

  const removeMedia = useCallback(
    async (media: Media) => {
      const db = await getDatabase();
      await createMediaRepository(db).delete(media.id);
      // A managed copy exists only for this record, so it goes with it. A
      // remote reference has nothing to clean up.
      if (media.localPath) {
        await deleteLocalMediaFile(media.localPath);
      }
      reload();
    },
    [reload],
  );

  return {
    isLoading,
    error,
    notFound,
    attraction: data.attraction,
    years,
    otherAttractions,
    characters: data.characters,
    relations: data.relations,
    sources: data.sources,
    allSources,
    media: data.media,
    save,
    deleteAttraction,
    addCharacter,
    removeCharacter,
    addRelation,
    removeRelation,
    addSource,
    updateSource,
    attachSource,
    removeSource,
    deleteSource,
    addMedia,
    removeMedia,
  };
}
