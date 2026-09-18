// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { ConstraintViolationError } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import { createFixtureAttraction, createFixtureEventYear } from "../test/fixtures";
import { createTestDatabase } from "../test/createTestDatabase";
import {
  createAttractionRelationRepository,
  type AttractionRelationRepository,
} from "./attractionRelationRepository";

describe("AttractionRelationRepository", () => {
  let db: SqlExecutor;
  let relations: AttractionRelationRepository;
  let attractionA: string;
  let attractionB: string;

  beforeEach(async () => {
    db = createTestDatabase();
    relations = createAttractionRelationRepository(db);
    const eventYear = await createFixtureEventYear(db);
    attractionA = (await createFixtureAttraction(db, eventYear.id, { slug: "a" })).id;
    attractionB = (await createFixtureAttraction(db, eventYear.id, { slug: "b" })).id;
  });

  it("creates a relation and finds it from either side", async () => {
    const created = await relations.create({
      attractionId: attractionA,
      relatedAttractionId: attractionB,
      relationType: "sequel",
    });
    expect(created.notes).toBeNull();

    const fromA = await relations.getForAttraction(attractionA);
    const fromB = await relations.getForAttraction(attractionB);
    expect(fromA.map((r) => r.id)).toContain(created.id);
    expect(fromB.map((r) => r.id)).toContain(created.id);
  });

  it("rejects an attraction being related to itself", async () => {
    const error = await relations
      .create({
        attractionId: attractionA,
        relatedAttractionId: attractionA,
        relationType: "sequel",
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConstraintViolationError);
    expect((error as ConstraintViolationError).constraint).toBe("check");
  });

  it("rejects a duplicate relation of the same type between the same pair", async () => {
    await relations.create({
      attractionId: attractionA,
      relatedAttractionId: attractionB,
      relationType: "same_franchise",
    });

    const error = await relations
      .create({
        attractionId: attractionA,
        relatedAttractionId: attractionB,
        relationType: "same_franchise",
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConstraintViolationError);
    expect((error as ConstraintViolationError).constraint).toBe("unique");
  });

  it("allows two different relation types between the same pair", async () => {
    await relations.create({
      attractionId: attractionA,
      relatedAttractionId: attractionB,
      relationType: "sequel",
    });
    await relations.create({
      attractionId: attractionA,
      relatedAttractionId: attractionB,
      relationType: "same_franchise",
    });

    const all = await relations.getForAttraction(attractionA);
    expect(all).toHaveLength(2);
  });

  it("updates and deletes a relation", async () => {
    const created = await relations.create({
      attractionId: attractionA,
      relatedAttractionId: attractionB,
      relationType: "related_concept",
    });

    const updated = await relations.update(created.id, { notes: "Shares a set designer." });
    expect(updated.notes).toBe("Shares a set designer.");

    await relations.delete(created.id);
    await expect(relations.getById(created.id)).resolves.toBeNull();
  });

  it("is removed when either attraction in the pair is deleted", async () => {
    const created = await relations.create({
      attractionId: attractionA,
      relatedAttractionId: attractionB,
      relationType: "previous_version",
    });

    await db.execute("DELETE FROM attractions WHERE id = ?", [attractionB]);

    await expect(relations.getById(created.id)).resolves.toBeNull();
  });
});
