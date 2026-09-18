import { NotFoundError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { Character, CharacterInput } from "../models/character";
import type { EntityId } from "../models/common";
import { generateId } from "./id";
import type { Repository } from "./types";

interface CharacterRow {
  id: string;
  attraction_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: CharacterRow): Character {
  return {
    id: row.id,
    attractionId: row.attraction_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CharacterRepository = Repository<Character, CharacterInput> & {
  getByAttraction(attractionId: EntityId): Promise<Character[]>;
};

export function createCharacterRepository(db: SqlExecutor): CharacterRepository {
  async function getAll(): Promise<Character[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<CharacterRow[]>("SELECT * FROM characters ORDER BY name ASC");
      return rows.map(mapRow);
    });
  }

  async function getById(id: EntityId): Promise<Character | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<CharacterRow[]>("SELECT * FROM characters WHERE id = ?", [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    });
  }

  async function getByAttraction(attractionId: EntityId): Promise<Character[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<CharacterRow[]>(
        "SELECT * FROM characters WHERE attraction_id = ? ORDER BY name ASC",
        [attractionId],
      );
      return rows.map(mapRow);
    });
  }

  async function create(input: CharacterInput): Promise<Character> {
    const id = generateId();
    await withDatabaseErrors(() =>
      db.execute(
        "INSERT INTO characters (id, attraction_id, name, description) VALUES (?, ?, ?, ?)",
        [id, input.attractionId, input.name, input.description ?? null],
      ),
    );
    const created = await getById(id);
    if (!created) {
      throw new NotFoundError("Character", id);
    }
    return created;
  }

  async function update(id: EntityId, input: Partial<CharacterInput>): Promise<Character> {
    const existing = await getById(id);
    if (!existing) {
      throw new NotFoundError("Character", id);
    }

    const next = {
      attractionId: input.attractionId ?? existing.attractionId,
      name: input.name ?? existing.name,
      description: input.description === undefined ? existing.description : input.description,
    };

    await withDatabaseErrors(() =>
      db.execute(
        `UPDATE characters
         SET attraction_id = ?, name = ?, description = ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [next.attractionId, next.name, next.description ?? null, id],
      ),
    );

    const updated = await getById(id);
    if (!updated) {
      throw new NotFoundError("Character", id);
    }
    return updated;
  }

  async function deleteById(id: EntityId): Promise<void> {
    await withDatabaseErrors(() => db.execute("DELETE FROM characters WHERE id = ?", [id]));
  }

  return { getAll, getById, getByAttraction, create, update, delete: deleteById };
}
