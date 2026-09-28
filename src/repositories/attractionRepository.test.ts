// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { ConstraintViolationError } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { AttractionType } from "../models/attraction";
import { createTestDatabase } from "../test/createTestDatabase";
import { createFixtureEventYear } from "../test/fixtures";
import { createAttractionRepository, type AttractionRepository } from "./attractionRepository";

describe("AttractionRepository", () => {
  let db: SqlExecutor;
  let attractions: AttractionRepository;
  let eventYearId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    attractions = createAttractionRepository(db);
    eventYearId = (await createFixtureEventYear(db)).id;
  });

  it("creates an attraction and reads back nullable facts as null", async () => {
    const created = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "The Deed",
      slug: "the-deed",
      parkIds: ["orlando"],
    });

    expect(created.name).toBe("The Deed");
    expect(created.ipType).toBeNull();
    expect(created.franchiseName).toBeNull();
    expect(created.openingDate).toBeNull();
    expect(created.parkIds).toEqual(["orlando"]);
  });

  it("supports Hollywood only, Orlando only, and both via a real relationship", async () => {
    const hollywoodOnly = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "Hollywood House",
      slug: "hollywood-house",
      parkIds: ["hollywood"],
    });
    const orlandoOnly = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "Orlando House",
      slug: "orlando-house",
      parkIds: ["orlando"],
    });
    const both = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "Both Parks House",
      slug: "both-parks-house",
      parkIds: ["hollywood", "orlando"],
    });

    expect((await attractions.getById(hollywoodOnly.id))?.parkIds).toEqual(["hollywood"]);
    expect((await attractions.getById(orlandoOnly.id))?.parkIds).toEqual(["orlando"]);
    expect((await attractions.getById(both.id))?.parkIds?.slice().sort()).toEqual([
      "hollywood",
      "orlando",
    ]);
  });

  it("setParks replaces the prior park assignment rather than adding to it", async () => {
    const created = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "House",
      slug: "house",
      parkIds: ["hollywood"],
    });

    await attractions.setParks(created.id, ["orlando"]);
    expect((await attractions.getById(created.id))?.parkIds).toEqual(["orlando"]);
  });

  it("refuses to strip an attraction's last park, even through setParks directly", async () => {
    const created = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "House",
      slug: "house",
      parkIds: ["hollywood"],
    });

    await expect(attractions.setParks(created.id, [])).rejects.toBeInstanceOf(
      ConstraintViolationError,
    );
    expect((await attractions.getById(created.id))?.parkIds).toEqual(["hollywood"]);
  });

  it("filters by event year", async () => {
    const otherYearId = (await createFixtureEventYear(db, { calendarYear: 2023, name: "Other" }))
      .id;

    const house = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "A House",
      slug: "a-house",
      parkIds: ["hollywood"],
    });
    const secondHouse = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "A Second House",
      slug: "a-second-house",
      parkIds: ["hollywood"],
    });
    await attractions.create({
      eventYearId: otherYearId,
      attractionType: "house",
      name: "Other Year House",
      slug: "other-year-house",
      parkIds: ["hollywood"],
    });

    const thisYear = await attractions.getByEventYear(eventYearId);
    expect(thisYear.map((a) => a.id).sort()).toEqual([house.id, secondHouse.id].sort());

    const houses = await attractions.getByType("house");
    expect(houses.map((a) => a.id)).toContain(house.id);
  });

  it("refuses a scare zone or a show — houses and mazes are all the archive records", async () => {
    for (const retired of ["scare_zone", "show", "other"]) {
      await expect(
        attractions.create({
          eventYearId,
          attractionType: retired as AttractionType,
          name: `A ${retired}`,
          slug: `a-${retired}`,
          parkIds: ["hollywood"],
        }),
      ).rejects.toBeInstanceOf(ConstraintViolationError);
    }
    const house = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "A House",
      slug: "a-house",
      parkIds: ["hollywood"],
    });
    await expect(
      attractions.update(house.id, { attractionType: "scare_zone" as AttractionType }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
    expect(await attractions.getAll()).toHaveLength(1);
  });

  it("never reads back a retired category, even one written behind its back", async () => {
    // The schema still accepts the old values so old data can be read and
    // its personal rows preserved; the repository is what keeps them out
    // of the interface.
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
       VALUES ('stray-zone', ?, 'scare_zone', 'Stray Zone', 'stray-zone')`,
      [eventYearId],
    );

    expect(await attractions.getAll()).toEqual([]);
    expect(await attractions.getByEventYear(eventYearId)).toEqual([]);
    expect(await attractions.getById("stray-zone")).toBeNull();
  });

  it("updates only provided fields, leaving park assignment untouched when omitted", async () => {
    const created = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "Original Name",
      slug: "original-slug",
      parkIds: ["hollywood", "orlando"],
    });

    const updated = await attractions.update(created.id, { name: "New Name" });

    expect(updated.name).toBe("New Name");
    expect(updated.slug).toBe("original-slug");
    expect(updated.parkIds?.slice().sort()).toEqual(["hollywood", "orlando"]);
  });

  it("stamps an edit made here, as a record of when it was last corrected by hand", async () => {
    const created = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "The Deed",
      slug: "the-deed",
      parkIds: ["orlando"],
    });

    const [fresh] = await db.select<Array<{ manual_edit_at: string | null }>>(
      "SELECT manual_edit_at FROM attractions WHERE id = ?",
      [created.id],
    );
    // Nothing has been edited by hand yet.
    expect(fresh.manual_edit_at).toBeNull();

    await attractions.update(created.id, { shortSummary: "Corrected by hand." });

    const [edited] = await db.select<Array<{ manual_edit_at: string | null }>>(
      "SELECT manual_edit_at FROM attractions WHERE id = ?",
      [created.id],
    );
    expect(edited.manual_edit_at).not.toBeNull();
  });

  it("rejects an invalid attraction_type at the database level", async () => {
    const error = await attractions
      .create({
        eventYearId,
        attractionType: "not_a_real_type" as AttractionType,
        name: "Bad",
        slug: "bad",
        parkIds: [],
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConstraintViolationError);
    expect((error as ConstraintViolationError).constraint).toBe("check");
  });

  describe("required facts", () => {
    function validInput() {
      return {
        eventYearId,
        attractionType: "house" as const,
        name: "Valid",
        slug: "valid",
        parkIds: ["hollywood" as const],
      };
    }

    it.each([
      ["a blank name", { name: "   " }],
      ["no event year", { eventYearId: "" }],
      ["no park", { parkIds: [] }],
    ])("refuses to create an attraction with %s", async (_label, overrides) => {
      const error = await attractions
        .create({ ...validInput(), ...overrides })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ConstraintViolationError);
    });

    it.each([
      ["a blank name", { name: "" }],
      ["no park", { parkIds: [] }],
    ])("refuses to update an attraction to have %s", async (_label, overrides) => {
      const created = await attractions.create(validInput());

      await expect(attractions.update(created.id, overrides)).rejects.toBeInstanceOf(
        ConstraintViolationError,
      );

      // The rejected write leaves the record exactly as it was.
      expect(await attractions.getById(created.id)).toMatchObject({
        name: "Valid",
        parkIds: ["hollywood"],
      });
    });

    it("accepts an attraction that knows almost nothing beyond the required facts", async () => {
      const sparse = await attractions.create({
        eventYearId,
        attractionType: "house",
        name: "Barely Documented",
        slug: "barely-documented",
        parkIds: ["orlando"],
      });

      // Partial knowledge is the normal case for an archive, not an error.
      expect(sparse).toMatchObject({
        name: "Barely Documented",
        ipType: null,
        franchiseName: null,
        shortSummary: null,
        fullOverview: null,
        openingDate: null,
      });
    });
  });

  it("rejects a duplicate slug within the same event year", async () => {
    await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "First",
      slug: "dup",
      parkIds: ["hollywood"],
    });

    const error = await attractions
      .create({
        eventYearId,
        attractionType: "house",
        name: "Second",
        slug: "dup",
        parkIds: ["hollywood"],
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConstraintViolationError);
    expect((error as ConstraintViolationError).constraint).toBe("unique");
  });

  it("rejects an attraction referencing a non-existent event year", async () => {
    const error = await attractions
      .create({
        eventYearId: "does-not-exist",
        attractionType: "house",
        name: "Orphan",
        slug: "orphan",
        parkIds: ["hollywood"],
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConstraintViolationError);
    expect((error as ConstraintViolationError).constraint).toBe("foreign_key");
  });

  it("cascades park assignments when the attraction is deleted", async () => {
    const created = await attractions.create({
      eventYearId,
      attractionType: "house",
      name: "Doomed",
      slug: "doomed",
      parkIds: ["hollywood", "orlando"],
    });

    await attractions.delete(created.id);

    const rows = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM attraction_parks WHERE attraction_id = ?",
      [created.id],
    );
    expect(rows[0].count).toBe(0);
  });
});
