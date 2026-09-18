import { NotFoundError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import type { Note } from "../models/note";
import { generateId } from "./id";

interface NoteRow {
  id: string;
  attraction_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: NoteRow): Note {
  return {
    id: row.id,
    attractionId: row.attraction_id,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface NoteRepository {
  getForAttraction(attractionId: EntityId): Promise<Note | null>;
  /** Every note that exists — so a destructive action can say exactly what it would destroy. */
  getAll(): Promise<Note[]>;
  upsert(attractionId: EntityId, note: string): Promise<Note>;
  delete(attractionId: EntityId): Promise<void>;
}

export function createNoteRepository(db: SqlExecutor): NoteRepository {
  async function getForAttraction(attractionId: EntityId): Promise<Note | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<NoteRow[]>("SELECT * FROM user_notes WHERE attraction_id = ?", [
        attractionId,
      ]);
      return rows[0] ? mapRow(rows[0]) : null;
    });
  }

  async function getAll(): Promise<Note[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<NoteRow[]>("SELECT * FROM user_notes");
      return rows.map(mapRow);
    });
  }

  async function upsert(attractionId: EntityId, note: string): Promise<Note> {
    const existing = await getForAttraction(attractionId);

    if (existing) {
      await withDatabaseErrors(() =>
        db.execute(
          `UPDATE user_notes
           SET note = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE attraction_id = ?`,
          [note, attractionId],
        ),
      );
    } else {
      const id = generateId();
      await withDatabaseErrors(() =>
        db.execute("INSERT INTO user_notes (id, attraction_id, note) VALUES (?, ?, ?)", [
          id,
          attractionId,
          note,
        ]),
      );
    }

    const updated = await getForAttraction(attractionId);
    if (!updated) {
      throw new NotFoundError("Note", attractionId);
    }
    return updated;
  }

  async function deleteNote(attractionId: EntityId): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute("DELETE FROM user_notes WHERE attraction_id = ?", [attractionId]),
    );
  }

  return { getForAttraction, getAll, upsert, delete: deleteNote };
}
