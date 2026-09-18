// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { createFixtureAttraction, createFixtureEventYear } from "../test/fixtures";
import { createTestDatabase } from "../test/createTestDatabase";
import { createCharacterRepository, type CharacterRepository } from "./characterRepository";

describe("CharacterRepository", () => {
  let db: SqlExecutor;
  let characters: CharacterRepository;
  let attractionId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    characters = createCharacterRepository(db);
    const eventYear = await createFixtureEventYear(db);
    attractionId = (await createFixtureAttraction(db, eventYear.id)).id;
  });

  it("starts with zero characters for a new attraction", async () => {
    await expect(characters.getByAttraction(attractionId)).resolves.toEqual([]);
  });

  it("creates, updates and deletes a character", async () => {
    const created = await characters.create({
      attractionId,
      name: "The Storyteller",
      description: null,
    });
    expect(created.description).toBeNull();

    const updated = await characters.update(created.id, { description: "The narrator role." });
    expect(updated.description).toBe("The narrator role.");
    expect(updated.name).toBe("The Storyteller");

    await characters.delete(created.id);
    await expect(characters.getById(created.id)).resolves.toBeNull();
  });

  it("allows more than one character per attraction", async () => {
    await characters.create({ attractionId, name: "First" });
    await characters.create({ attractionId, name: "Second" });

    const all = await characters.getByAttraction(attractionId);
    expect(all.map((c) => c.name).sort()).toEqual(["First", "Second"]);
  });

  it("is removed when its attraction is deleted", async () => {
    await characters.create({ attractionId, name: "Doomed" });
    await db.execute("DELETE FROM attractions WHERE id = ?", [attractionId]);

    await expect(characters.getByAttraction(attractionId)).resolves.toEqual([]);
  });
});
