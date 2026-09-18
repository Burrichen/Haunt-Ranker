// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFixtureAttraction, createFixtureEventYear } from "../test/fixtures";
import { openTestDatabaseFile, type FileTestDatabase } from "../test/createTestDatabase";
import { createNoteRepository } from "./noteRepository";
import { createRatingRepository } from "./ratingRepository";

/**
 * Reviews are the one thing in this app a user can't recreate from an
 * import, so these tests close the database connection entirely and reopen
 * the same file — the closest a test can get to quitting and relaunching
 * the app.
 */
describe("review persistence across a restart", () => {
  let directory: string;
  let filePath: string;
  let open: FileTestDatabase | null;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "haunt-ranker-review-"));
    filePath = join(directory, "haunt-ranker.db");
    open = null;
  });

  afterEach(() => {
    open?.close();
    rmSync(directory, { recursive: true, force: true });
  });

  async function seedAttraction(): Promise<string> {
    const session = openTestDatabaseFile(filePath);
    const eventYear = await createFixtureEventYear(session.db);
    const attraction = await createFixtureAttraction(session.db, eventYear.id);
    session.close();
    return attraction.id;
  }

  /** Reopens the same file the way a relaunched app would, schema already in place. */
  function restart(): FileTestDatabase {
    open?.close();
    open = openTestDatabaseFile(filePath, { migrate: false });
    return open;
  }

  it("a saved rating and note are still there after the database is closed and reopened", async () => {
    const attractionId = await seedAttraction();

    const first = restart();
    await createRatingRepository(first.db).upsert(attractionId, { theme: 4, fun: 3.5, fear: 5 });
    await createNoteRepository(first.db).upsert(attractionId, "The finale room was the best part.");

    const second = restart();
    const rating = await createRatingRepository(second.db).getForAttraction(attractionId);
    const note = await createNoteRepository(second.db).getForAttraction(attractionId);

    expect(rating).toMatchObject({ theme: 4, fun: 3.5, fear: 5, total: 12.5 });
    expect(note?.note).toBe("The finale room was the best part.");
  });

  it("an edited rating persists the new values, not the originals", async () => {
    const attractionId = await seedAttraction();

    const first = restart();
    await createRatingRepository(first.db).upsert(attractionId, { theme: 1, fun: 1, fear: 1 });

    const second = restart();
    await createRatingRepository(second.db).upsert(attractionId, { theme: 5, fun: 4.5, fear: 0 });

    const third = restart();
    const rating = await createRatingRepository(third.db).getForAttraction(attractionId);

    expect(rating).toMatchObject({ theme: 5, fun: 4.5, fear: 0, total: 9.5 });
  });

  it("a cleared rating stays cleared — genuinely unrated, with the note kept", async () => {
    const attractionId = await seedAttraction();

    const first = restart();
    await createRatingRepository(first.db).upsert(attractionId, { theme: 2, fun: 2, fear: 2 });
    await createNoteRepository(first.db).upsert(attractionId, "Worth another look next year.");

    const second = restart();
    await createRatingRepository(second.db).delete(attractionId);

    const third = restart();
    await expect(
      createRatingRepository(third.db).getForAttraction(attractionId),
    ).resolves.toBeNull();
    // Clearing a score is not a request to throw away the user's writing.
    await expect(
      createNoteRepository(third.db).getForAttraction(attractionId),
    ).resolves.toMatchObject({ note: "Worth another look next year." });
  });
});
