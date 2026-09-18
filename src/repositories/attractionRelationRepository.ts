import { NotFoundError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type {
  AttractionRelation,
  AttractionRelationInput,
  RelationType,
} from "../models/attractionRelation";
import type { EntityId } from "../models/common";
import { generateId } from "./id";
import type { Repository } from "./types";

interface AttractionRelationRow {
  id: string;
  attraction_id: string;
  related_attraction_id: string;
  relation_type: RelationType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: AttractionRelationRow): AttractionRelation {
  return {
    id: row.id,
    attractionId: row.attraction_id,
    relatedAttractionId: row.related_attraction_id,
    relationType: row.relation_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type AttractionRelationRepository = Repository<
  AttractionRelation,
  AttractionRelationInput
> & {
  getForAttraction(attractionId: EntityId): Promise<AttractionRelation[]>;
};

export function createAttractionRelationRepository(db: SqlExecutor): AttractionRelationRepository {
  async function getAll(): Promise<AttractionRelation[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<AttractionRelationRow[]>(
        "SELECT * FROM attraction_relations ORDER BY created_at ASC",
      );
      return rows.map(mapRow);
    });
  }

  async function getById(id: EntityId): Promise<AttractionRelation | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<AttractionRelationRow[]>(
        "SELECT * FROM attraction_relations WHERE id = ?",
        [id],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    });
  }

  /** Relations where this attraction is either side of the pair. */
  async function getForAttraction(attractionId: EntityId): Promise<AttractionRelation[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<AttractionRelationRow[]>(
        `SELECT * FROM attraction_relations
         WHERE attraction_id = ? OR related_attraction_id = ?
         ORDER BY created_at ASC`,
        [attractionId, attractionId],
      );
      return rows.map(mapRow);
    });
  }

  async function create(input: AttractionRelationInput): Promise<AttractionRelation> {
    const id = generateId();
    await withDatabaseErrors(() =>
      db.execute(
        `INSERT INTO attraction_relations (id, attraction_id, related_attraction_id, relation_type, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          input.attractionId,
          input.relatedAttractionId,
          input.relationType,
          input.notes ?? null,
        ],
      ),
    );
    const created = await getById(id);
    if (!created) {
      throw new NotFoundError("AttractionRelation", id);
    }
    return created;
  }

  async function update(
    id: EntityId,
    input: Partial<AttractionRelationInput>,
  ): Promise<AttractionRelation> {
    const existing = await getById(id);
    if (!existing) {
      throw new NotFoundError("AttractionRelation", id);
    }

    const next = {
      attractionId: input.attractionId ?? existing.attractionId,
      relatedAttractionId: input.relatedAttractionId ?? existing.relatedAttractionId,
      relationType: input.relationType ?? existing.relationType,
      notes: input.notes === undefined ? existing.notes : input.notes,
    };

    await withDatabaseErrors(() =>
      db.execute(
        `UPDATE attraction_relations
         SET attraction_id = ?, related_attraction_id = ?, relation_type = ?, notes = ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [next.attractionId, next.relatedAttractionId, next.relationType, next.notes ?? null, id],
      ),
    );

    const updated = await getById(id);
    if (!updated) {
      throw new NotFoundError("AttractionRelation", id);
    }
    return updated;
  }

  async function deleteById(id: EntityId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute("DELETE FROM attraction_relations WHERE id = ?", [id]),
    );
  }

  return { getAll, getById, getForAttraction, create, update, delete: deleteById };
}
