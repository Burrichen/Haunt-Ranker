import { NotFoundError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import type { Media, MediaDistribution, MediaInput, MediaType } from "../models/media";
import { generateId } from "./id";
import type { Repository } from "./types";

interface MediaRow {
  id: string;
  attraction_id: string | null;
  event_year_id: string | null;
  media_type: MediaType;
  url: string | null;
  local_path: string | null;
  source_id: string | null;
  attribution: string | null;
  license_notes: string | null;
  distribution: MediaDistribution;
  created_at: string;
  updated_at: string;
}

function mapRow(row: MediaRow): Media {
  return {
    id: row.id,
    attractionId: row.attraction_id,
    eventYearId: row.event_year_id,
    mediaType: row.media_type,
    url: row.url,
    localPath: row.local_path,
    sourceId: row.source_id,
    attribution: row.attribution,
    licenseNotes: row.license_notes,
    distribution: row.distribution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type MediaRepository = Repository<Media, MediaInput> & {
  getForAttraction(attractionId: EntityId): Promise<Media[]>;
  getForEventYear(eventYearId: EntityId): Promise<Media[]>;
};

export function createMediaRepository(db: SqlExecutor): MediaRepository {
  async function getAll(): Promise<Media[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<MediaRow[]>("SELECT * FROM media ORDER BY created_at ASC");
      return rows.map(mapRow);
    });
  }

  async function getById(id: EntityId): Promise<Media | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<MediaRow[]>("SELECT * FROM media WHERE id = ?", [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    });
  }

  async function getForAttraction(attractionId: EntityId): Promise<Media[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<MediaRow[]>(
        "SELECT * FROM media WHERE attraction_id = ? ORDER BY created_at ASC",
        [attractionId],
      );
      return rows.map(mapRow);
    });
  }

  async function getForEventYear(eventYearId: EntityId): Promise<Media[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<MediaRow[]>(
        "SELECT * FROM media WHERE event_year_id = ? ORDER BY created_at ASC",
        [eventYearId],
      );
      return rows.map(mapRow);
    });
  }

  async function create(input: MediaInput): Promise<Media> {
    const id = generateId();
    const attractionId = "attractionId" in input.owner ? input.owner.attractionId : null;
    const eventYearId = "eventYearId" in input.owner ? input.owner.eventYearId : null;

    await withDatabaseErrors(() =>
      db.execute(
        `INSERT INTO media (
           id, attraction_id, event_year_id, media_type, url, local_path, source_id,
           attribution, license_notes, distribution
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          attractionId,
          eventYearId,
          input.mediaType,
          input.url ?? null,
          input.localPath ?? null,
          input.sourceId ?? null,
          input.attribution ?? null,
          input.licenseNotes ?? null,
          input.distribution ?? "reference",
        ],
      ),
    );
    const created = await getById(id);
    if (!created) {
      throw new NotFoundError("Media", id);
    }
    return created;
  }

  async function update(id: EntityId, input: Partial<MediaInput>): Promise<Media> {
    const existing = await getById(id);
    if (!existing) {
      throw new NotFoundError("Media", id);
    }

    const owner = input.owner;
    const attractionId = owner
      ? "attractionId" in owner
        ? owner.attractionId
        : null
      : existing.attractionId;
    const eventYearId = owner
      ? "eventYearId" in owner
        ? owner.eventYearId
        : null
      : existing.eventYearId;

    const next = {
      mediaType: input.mediaType ?? existing.mediaType,
      url: input.url === undefined ? existing.url : input.url,
      localPath: input.localPath === undefined ? existing.localPath : input.localPath,
      sourceId: input.sourceId === undefined ? existing.sourceId : input.sourceId,
      attribution: input.attribution === undefined ? existing.attribution : input.attribution,
      licenseNotes: input.licenseNotes === undefined ? existing.licenseNotes : input.licenseNotes,
      distribution: input.distribution ?? existing.distribution,
    };

    await withDatabaseErrors(() =>
      db.execute(
        `UPDATE media
         SET attraction_id = ?, event_year_id = ?, media_type = ?, url = ?, local_path = ?,
             source_id = ?, attribution = ?, license_notes = ?, distribution = ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [
          attractionId,
          eventYearId,
          next.mediaType,
          next.url ?? null,
          next.localPath ?? null,
          next.sourceId ?? null,
          next.attribution ?? null,
          next.licenseNotes ?? null,
          next.distribution,
          id,
        ],
      ),
    );

    const updated = await getById(id);
    if (!updated) {
      throw new NotFoundError("Media", id);
    }
    return updated;
  }

  async function deleteById(id: EntityId): Promise<void> {
    await withDatabaseErrors(() => db.execute("DELETE FROM media WHERE id = ?", [id]));
  }

  return { getAll, getById, getForAttraction, getForEventYear, create, update, delete: deleteById };
}
