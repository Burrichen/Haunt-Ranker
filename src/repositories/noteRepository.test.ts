// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { createFixtureAttraction, createFixtureEventYear } from "../test/fixtures";
import { createTestDatabase } from "../test/createTestDatabase";
import { createNoteRepository, type NoteRepository } from "./noteRepository";

describe("NoteRepository", () => {
  let db: SqlExecutor;
  let notes: NoteRepository;
  let attractionId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    notes = createNoteRepository(db);
    const eventYear = await createFixtureEventYear(db);
    attractionId = (await createFixtureAttraction(db, eventYear.id)).id;
  });

  it("is null when no note has been written yet", async () => {
    await expect(notes.getForAttraction(attractionId)).resolves.toBeNull();
  });

  it("creates a note, then updates it in place rather than duplicating", async () => {
    const first = await notes.upsert(attractionId, "First impression.");
    expect(first.note).toBe("First impression.");

    const second = await notes.upsert(attractionId, "Revised after a second visit.");
    expect(second.note).toBe("Revised after a second visit.");
    expect(second.id).toBe(first.id);

    const rows = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM user_notes WHERE attraction_id = ?",
      [attractionId],
    );
    expect(rows[0].count).toBe(1);
  });

  it("deletes a note", async () => {
    await notes.upsert(attractionId, "Temporary note.");
    await notes.delete(attractionId);

    await expect(notes.getForAttraction(attractionId)).resolves.toBeNull();
  });
});
