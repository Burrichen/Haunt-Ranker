import { useCallback, useEffect, useState } from "react";
import { getDatabase } from "../database/client";
import type { EntityId } from "../models/common";
import type { EventYear, EventYearInput } from "../models/eventYear";
import type { Media, MediaInput } from "../models/media";
import type { Source, SourceInput } from "../models/source";
import { deleteLocalMediaFile } from "../media/mediaFiles";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createMediaRepository } from "../repositories/mediaRepository";
import { createSourceRepository } from "../repositories/sourceRepository";

export interface YearEditor {
  isLoading: boolean;
  error: string | null;
  notFound: boolean;

  eventYear: EventYear | null;
  sources: Source[];
  allSources: Source[];
  media: Media[];

  save: (input: Partial<EventYearInput>) => Promise<void>;

  addSource: (input: SourceInput) => Promise<void>;
  updateSource: (id: EntityId, input: SourceInput) => Promise<void>;
  attachSource: (id: EntityId) => Promise<void>;
  removeSource: (id: EntityId) => Promise<void>;
  deleteSource: (id: EntityId) => Promise<void>;
  addMedia: (input: Omit<MediaInput, "owner">) => Promise<void>;
  removeMedia: (media: Media) => Promise<void>;
}

/**
 * One event year's own record and provenance.
 *
 * A year cites sources of its own — a recap video or an official line-up
 * announcement describes the event, not any single house — and owns the
 * event artwork the Years pages show.
 */
export function useYearEditor(eventYearId: EntityId | undefined): YearEditor {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [eventYear, setEventYear] = useState<EventYear | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [allSources, setAllSources] = useState<Source[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!eventYearId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        const db = await getDatabase();
        const year = await createEventYearRepository(db).getById(eventYearId);
        if (!year) {
          if (!cancelled) {
            setNotFound(true);
          }
          return;
        }

        const sourceRepo = createSourceRepository(db);
        const [cited, everySource, yearMedia] = await Promise.all([
          sourceRepo.getForEventYear(year.id),
          sourceRepo.getAll(),
          createMediaRepository(db).getForEventYear(year.id),
        ]);

        if (cancelled) {
          return;
        }

        setEventYear(year);
        setSources(cited);
        setAllSources(everySource);
        setMedia(yearMedia);
        setNotFound(false);
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Couldn't load this event year.");
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
  }, [eventYearId, reloadToken]);

  const requireYear = useCallback((): EntityId => {
    if (!eventYearId) {
      throw new Error("Save the event year before adding records to it");
    }
    return eventYearId;
  }, [eventYearId]);

  const save = useCallback(
    async (input: Partial<EventYearInput>) => {
      const db = await getDatabase();
      await createEventYearRepository(db).update(requireYear(), input);
      reload();
    },
    [requireYear, reload],
  );

  const addSource = useCallback(
    async (input: SourceInput) => {
      const db = await getDatabase();
      const repo = createSourceRepository(db);
      const created = await repo.create(input);
      await repo.attachToEventYear(requireYear(), created.id);
      reload();
    },
    [requireYear, reload],
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
      await createSourceRepository(db).attachToEventYear(requireYear(), id);
      reload();
    },
    [requireYear, reload],
  );

  const removeSource = useCallback(
    async (id: EntityId) => {
      const db = await getDatabase();
      await createSourceRepository(db).detachFromEventYear(requireYear(), id);
      reload();
    },
    [requireYear, reload],
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
        owner: { eventYearId: requireYear() },
      });
      reload();
    },
    [requireYear, reload],
  );

  const removeMedia = useCallback(
    async (item: Media) => {
      const db = await getDatabase();
      await createMediaRepository(db).delete(item.id);
      if (item.localPath) {
        await deleteLocalMediaFile(item.localPath);
      }
      reload();
    },
    [reload],
  );

  return {
    isLoading,
    error,
    notFound,
    eventYear,
    sources,
    allSources,
    media,
    save,
    addSource,
    updateSource,
    attachSource,
    removeSource,
    deleteSource,
    addMedia,
    removeMedia,
  };
}
