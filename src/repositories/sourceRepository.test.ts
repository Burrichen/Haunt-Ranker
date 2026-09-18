// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { ConstraintViolationError } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { SourceType } from "../models/source";
import { createFixtureAttraction, createFixtureEventYear } from "../test/fixtures";
import { createTestDatabase } from "../test/createTestDatabase";
import { createSourceRepository, type SourceRepository } from "./sourceRepository";

describe("SourceRepository", () => {
  let db: SqlExecutor;
  let sources: SourceRepository;
  let attractionId: string;
  let eventYearId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    sources = createSourceRepository(db);
    const eventYear = await createFixtureEventYear(db);
    eventYearId = eventYear.id;
    attractionId = (await createFixtureAttraction(db, eventYear.id)).id;
  });

  it("supports youtube as a source type", async () => {
    const created = await sources.create({
      sourceType: "youtube",
      title: "Full walkthrough",
      url: "https://youtube.com/watch?v=example",
      publisher: "Some Channel",
    });

    expect(created.sourceType).toBe("youtube");
  });

  it("attaches and lists sources for an attraction", async () => {
    const source = await sources.create({ sourceType: "article", title: "Preview article" });
    await sources.attachToAttraction(attractionId, source.id);

    const forAttraction = await sources.getForAttraction(attractionId);
    expect(forAttraction.map((s) => s.id)).toEqual([source.id]);
  });

  it("attaching the same source twice does not duplicate or error", async () => {
    const source = await sources.create({ sourceType: "article", title: "Preview article" });
    await sources.attachToAttraction(attractionId, source.id);
    await sources.attachToAttraction(attractionId, source.id);

    const forAttraction = await sources.getForAttraction(attractionId);
    expect(forAttraction).toHaveLength(1);
  });

  it("detaches a source without deleting the source itself", async () => {
    const source = await sources.create({ sourceType: "article", title: "Preview article" });
    await sources.attachToAttraction(attractionId, source.id);
    await sources.detachFromAttraction(attractionId, source.id);

    await expect(sources.getForAttraction(attractionId)).resolves.toEqual([]);
    await expect(sources.getById(source.id)).resolves.not.toBeNull();
  });

  it("allows one source to be cited by more than one attraction", async () => {
    const eventYear = await createFixtureEventYear(db, { calendarYear: 2023, name: "Other" });
    const otherAttractionId = (await createFixtureAttraction(db, eventYear.id, { slug: "other" }))
      .id;
    const source = await sources.create({ sourceType: "official_site", title: "Event page" });

    await sources.attachToAttraction(attractionId, source.id);
    await sources.attachToAttraction(otherAttractionId, source.id);

    expect((await sources.getForAttraction(attractionId)).map((s) => s.id)).toEqual([source.id]);
    expect((await sources.getForAttraction(otherAttractionId)).map((s) => s.id)).toEqual([
      source.id,
    ]);
  });

  it("removes attraction links when the source is deleted", async () => {
    const source = await sources.create({ sourceType: "article", title: "Preview article" });
    await sources.attachToAttraction(attractionId, source.id);

    await sources.delete(source.id);

    await expect(sources.getForAttraction(attractionId)).resolves.toEqual([]);
  });

  describe("event years", () => {
    it("cites a source from an event year, not just an attraction", async () => {
      const source = await sources.create({
        sourceType: "youtube",
        title: "Shadowfest 2101 recap",
        url: "https://youtube.invalid/watch?v=recap",
        publisher: "A Channel",
      });

      await sources.attachToEventYear(eventYearId, source.id);

      const cited = await sources.getForEventYear(eventYearId);
      expect(cited.map((item) => item.title)).toEqual(["Shadowfest 2101 recap"]);
      // Citing it for the year doesn't cite it for every attraction in it.
      await expect(sources.getForAttraction(attractionId)).resolves.toEqual([]);
    });

    it("lets one source be cited by an attraction and a year at once", async () => {
      const source = await sources.create({ sourceType: "article", title: "Event preview" });

      await sources.attachToAttraction(attractionId, source.id);
      await sources.attachToEventYear(eventYearId, source.id);

      expect(await sources.getForAttraction(attractionId)).toHaveLength(1);
      expect(await sources.getForEventYear(eventYearId)).toHaveLength(1);
    });

    it("detaches from a year without deleting the source", async () => {
      const source = await sources.create({ sourceType: "article", title: "Event preview" });
      await sources.attachToEventYear(eventYearId, source.id);

      await sources.detachFromEventYear(eventYearId, source.id);

      await expect(sources.getForEventYear(eventYearId)).resolves.toEqual([]);
      await expect(sources.getById(source.id)).resolves.not.toBeNull();
    });

    it("ignores a repeated citation rather than failing", async () => {
      const source = await sources.create({ sourceType: "article", title: "Event preview" });

      await sources.attachToEventYear(eventYearId, source.id);
      await sources.attachToEventYear(eventYearId, source.id);

      expect(await sources.getForEventYear(eventYearId)).toHaveLength(1);
    });

    it("removes year links when the source is deleted", async () => {
      const source = await sources.create({ sourceType: "article", title: "Event preview" });
      await sources.attachToEventYear(eventYearId, source.id);

      await sources.delete(source.id);

      await expect(sources.getForEventYear(eventYearId)).resolves.toEqual([]);
    });
  });

  it("stores every field a citation needs", async () => {
    const source = await sources.create({
      sourceType: "promotional",
      title: "2101 line-up flyer",
      url: "https://example.invalid/flyer",
      publisher: "Universal",
      publishedAt: "2101-08-01",
      notes: "Scanned from a physical flyer.",
    });

    expect(source).toMatchObject({
      sourceType: "promotional",
      title: "2101 line-up flyer",
      url: "https://example.invalid/flyer",
      publisher: "Universal",
      publishedAt: "2101-08-01",
      notes: "Scanned from a physical flyer.",
    });
  });

  it("edits a source in place, for every record citing it", async () => {
    const source = await sources.create({ sourceType: "article", title: "Typo'd title" });
    await sources.attachToAttraction(attractionId, source.id);

    await sources.update(source.id, { title: "Corrected title", sourceType: "official_site" });

    const cited = await sources.getForAttraction(attractionId);
    expect(cited[0]).toMatchObject({ title: "Corrected title", sourceType: "official_site" });
  });

  it("rejects an unsupported source type", async () => {
    const error = await sources
      .create({ sourceType: "carrier_pigeon" as SourceType, title: "??" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConstraintViolationError);
    expect((error as ConstraintViolationError).constraint).toBe("check");
  });
});
