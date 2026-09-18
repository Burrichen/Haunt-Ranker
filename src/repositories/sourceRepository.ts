import { NotFoundError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import type { Source, SourceInput, SourceType } from "../models/source";
import { generateId } from "./id";
import type { Repository } from "./types";

interface SourceRow {
  id: string;
  source_type: SourceType;
  title: string;
  url: string | null;
  publisher: string | null;
  published_at: string | null;
  notes: string | null;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SourceRow): Source {
  return {
    id: row.id,
    sourceType: row.source_type,
    title: row.title,
    url: row.url,
    publisher: row.publisher,
    publishedAt: row.published_at,
    notes: row.notes,
    isSample: row.is_sample === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type SourceRepository = Repository<Source, SourceInput> & {
  getForAttraction(attractionId: EntityId): Promise<Source[]>;
  attachToAttraction(attractionId: EntityId, sourceId: EntityId): Promise<void>;
  detachFromAttraction(attractionId: EntityId, sourceId: EntityId): Promise<void>;
  /** An event year cites sources of its own — a recap video covers the event, not one house. */
  getForEventYear(eventYearId: EntityId): Promise<Source[]>;
  attachToEventYear(eventYearId: EntityId, sourceId: EntityId): Promise<void>;
  detachFromEventYear(eventYearId: EntityId, sourceId: EntityId): Promise<void>;
};

export function createSourceRepository(db: SqlExecutor): SourceRepository {
  async function getAll(): Promise<Source[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<SourceRow[]>("SELECT * FROM sources ORDER BY title ASC");
      return rows.map(mapRow);
    });
  }

  async function getById(id: EntityId): Promise<Source | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<SourceRow[]>("SELECT * FROM sources WHERE id = ?", [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    });
  }

  /** Every source cited by the given attraction, via the attraction_sources join. */
  async function getForAttraction(attractionId: EntityId): Promise<Source[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<SourceRow[]>(
        `SELECT sources.* FROM sources
         JOIN attraction_sources ON attraction_sources.source_id = sources.id
         WHERE attraction_sources.attraction_id = ?
         ORDER BY sources.title ASC`,
        [attractionId],
      );
      return rows.map(mapRow);
    });
  }

  async function attachToAttraction(attractionId: EntityId, sourceId: EntityId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute(
        "INSERT OR IGNORE INTO attraction_sources (attraction_id, source_id) VALUES (?, ?)",
        [attractionId, sourceId],
      ),
    );
  }

  async function detachFromAttraction(attractionId: EntityId, sourceId: EntityId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute("DELETE FROM attraction_sources WHERE attraction_id = ? AND source_id = ?", [
        attractionId,
        sourceId,
      ]),
    );
  }

  async function getForEventYear(eventYearId: EntityId): Promise<Source[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<SourceRow[]>(
        `SELECT sources.* FROM sources
         JOIN event_year_sources ON event_year_sources.source_id = sources.id
         WHERE event_year_sources.event_year_id = ?
         ORDER BY sources.title ASC`,
        [eventYearId],
      );
      return rows.map(mapRow);
    });
  }

  async function attachToEventYear(eventYearId: EntityId, sourceId: EntityId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute(
        "INSERT OR IGNORE INTO event_year_sources (event_year_id, source_id) VALUES (?, ?)",
        [eventYearId, sourceId],
      ),
    );
  }

  async function detachFromEventYear(eventYearId: EntityId, sourceId: EntityId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute("DELETE FROM event_year_sources WHERE event_year_id = ? AND source_id = ?", [
        eventYearId,
        sourceId,
      ]),
    );
  }

  async function create(input: SourceInput): Promise<Source> {
    const id = generateId();
    await withDatabaseErrors(() =>
      db.execute(
        `INSERT INTO sources (id, source_type, title, url, publisher, published_at, notes, is_sample)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.sourceType,
          input.title,
          input.url ?? null,
          input.publisher ?? null,
          input.publishedAt ?? null,
          input.notes ?? null,
          input.isSample ? 1 : 0,
        ],
      ),
    );
    const created = await getById(id);
    if (!created) {
      throw new NotFoundError("Source", id);
    }
    return created;
  }

  async function update(id: EntityId, input: Partial<SourceInput>): Promise<Source> {
    const existing = await getById(id);
    if (!existing) {
      throw new NotFoundError("Source", id);
    }

    const next = {
      sourceType: input.sourceType ?? existing.sourceType,
      title: input.title ?? existing.title,
      url: input.url === undefined ? existing.url : input.url,
      publisher: input.publisher === undefined ? existing.publisher : input.publisher,
      publishedAt: input.publishedAt === undefined ? existing.publishedAt : input.publishedAt,
      notes: input.notes === undefined ? existing.notes : input.notes,
      isSample: input.isSample === undefined ? existing.isSample : input.isSample,
    };

    await withDatabaseErrors(() =>
      db.execute(
        `UPDATE sources
         SET source_type = ?, title = ?, url = ?, publisher = ?, published_at = ?, notes = ?,
             is_sample = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [
          next.sourceType,
          next.title,
          next.url ?? null,
          next.publisher ?? null,
          next.publishedAt ?? null,
          next.notes ?? null,
          next.isSample ? 1 : 0,
          id,
        ],
      ),
    );

    const updated = await getById(id);
    if (!updated) {
      throw new NotFoundError("Source", id);
    }
    return updated;
  }

  async function deleteById(id: EntityId): Promise<void> {
    await withDatabaseErrors(() => db.execute("DELETE FROM sources WHERE id = ?", [id]));
  }

  return {
    getAll,
    getById,
    getForAttraction,
    attachToAttraction,
    detachFromAttraction,
    getForEventYear,
    attachToEventYear,
    detachFromEventYear,
    create,
    update,
    delete: deleteById,
  };
}
