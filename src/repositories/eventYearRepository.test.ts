// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { ConstraintViolationError, NotFoundError } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import { createTestDatabase } from "../test/createTestDatabase";
import { createEventYearRepository, type EventYearRepository } from "./eventYearRepository";

describe("EventYearRepository", () => {
  let db: SqlExecutor;
  let years: EventYearRepository;

  beforeEach(() => {
    db = createTestDatabase();
    years = createEventYearRepository(db);
  });

  it("creates and reads back an event year, leaving unset facts null", async () => {
    const created = await years.create({ calendarYear: 2024, name: "HHN 2024" });

    expect(created.id).toBeTruthy();
    expect(created.calendarYear).toBe(2024);
    expect(created.name).toBe("HHN 2024");
    expect(created.description).toBeNull();
    expect(created.sourceNotes).toBeNull();
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();

    const fetched = await years.getById(created.id);
    expect(fetched).toEqual(created);
  });

  it("returns null for a missing id instead of throwing", async () => {
    await expect(years.getById("missing")).resolves.toBeNull();
  });

  it("lists all years, newest calendar year first", async () => {
    await years.create({ calendarYear: 2022, name: "HHN 2022" });
    await years.create({ calendarYear: 2024, name: "HHN 2024" });
    await years.create({ calendarYear: 2023, name: "HHN 2023" });

    const all = await years.getAll();
    expect(all.map((year) => year.calendarYear)).toEqual([2024, 2023, 2022]);
  });

  it("updates only the fields provided, leaving the rest untouched", async () => {
    const created = await years.create({
      calendarYear: 2024,
      name: "HHN 2024",
      description: "Original description",
    });

    const updated = await years.update(created.id, { description: "Updated description" });

    expect(updated.name).toBe("HHN 2024");
    expect(updated.calendarYear).toBe(2024);
    expect(updated.description).toBe("Updated description");
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime(),
    );
  });

  it("throws NotFoundError when updating or deleting a missing year", async () => {
    await expect(years.update("missing", { name: "x" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletes a year", async () => {
    const created = await years.create({ calendarYear: 2024, name: "HHN 2024" });
    await years.delete(created.id);

    await expect(years.getById(created.id)).resolves.toBeNull();
  });

  it("rejects a duplicate (calendarYear, name) pair as a constraint violation", async () => {
    await years.create({ calendarYear: 2024, name: "HHN 2024" });

    const error = await years
      .create({ calendarYear: 2024, name: "HHN 2024" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConstraintViolationError);
    expect((error as ConstraintViolationError).constraint).toBe("unique");
  });

  describe("required facts", () => {
    it.each([
      ["a blank name", { calendarYear: 2024, name: "  " }],
      ["a fractional year", { calendarYear: 2024.5, name: "HHN" }],
      ["an implausible year", { calendarYear: 12, name: "HHN" }],
      ["a year that isn't a number", { calendarYear: Number.NaN, name: "HHN" }],
    ])("refuses to create an event year with %s", async (_label, input) => {
      await expect(years.create(input)).rejects.toBeInstanceOf(ConstraintViolationError);
    });

    it("refuses to update an event year into an invalid one, leaving it untouched", async () => {
      const created = await years.create({ calendarYear: 2024, name: "HHN 2024" });

      await expect(years.update(created.id, { name: "" })).rejects.toBeInstanceOf(
        ConstraintViolationError,
      );

      expect(await years.getById(created.id)).toMatchObject({
        calendarYear: 2024,
        name: "HHN 2024",
      });
    });

    it("accepts a year with no description or source notes", async () => {
      const sparse = await years.create({ calendarYear: 2025, name: "HHN 2025" });
      expect(sparse).toMatchObject({ description: null, sourceNotes: null });
    });
  });
});
