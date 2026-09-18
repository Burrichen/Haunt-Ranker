// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { createFixtureAttraction, createFixtureEventYear } from "../test/fixtures";
import { createTestDatabase } from "../test/createTestDatabase";
import { createMediaRepository, type MediaRepository } from "./mediaRepository";

describe("MediaRepository", () => {
  let db: SqlExecutor;
  let media: MediaRepository;
  let attractionId: string;
  let eventYearId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    media = createMediaRepository(db);
    const eventYear = await createFixtureEventYear(db);
    eventYearId = eventYear.id;
    attractionId = (await createFixtureAttraction(db, eventYear.id)).id;
  });

  it("attaches media to an attraction, tracking provenance and license notes", async () => {
    const created = await media.create({
      owner: { attractionId },
      mediaType: "poster",
      url: "https://example.com/poster.jpg",
      attribution: "Official press kit",
      licenseNotes: "Used with permission from the event's press office.",
    });

    expect(created.attractionId).toBe(attractionId);
    expect(created.eventYearId).toBeNull();
    expect(created.licenseNotes).toBe("Used with permission from the event's press office.");

    await expect(media.getForAttraction(attractionId)).resolves.toEqual([created]);
  });

  it("attaches media to an event year instead of an attraction", async () => {
    const created = await media.create({
      owner: { eventYearId },
      mediaType: "event_artwork",
      localPath: "media/2024-key-art.png",
    });

    expect(created.eventYearId).toBe(eventYearId);
    expect(created.attractionId).toBeNull();
    await expect(media.getForEventYear(eventYearId)).resolves.toEqual([created]);
  });

  it("the database rejects media with neither owner set", async () => {
    await expect(
      db.execute(`INSERT INTO media (id, media_type, url) VALUES (?, ?, ?)`, [
        "orphan-media",
        "poster",
        "https://example.com/x.jpg",
      ]),
    ).rejects.toThrow(/CHECK constraint failed/i);
  });

  it("the database rejects media with both owners set", async () => {
    await expect(
      db.execute(
        `INSERT INTO media (id, attraction_id, event_year_id, media_type, url) VALUES (?, ?, ?, ?, ?)`,
        ["both-owners", attractionId, eventYearId, "poster", "https://example.com/x.jpg"],
      ),
    ).rejects.toThrow(/CHECK constraint failed/i);
  });

  it("the database rejects media with neither a url nor a local path", async () => {
    await expect(
      db.execute(`INSERT INTO media (id, attraction_id, media_type) VALUES (?, ?, ?)`, [
        "no-source",
        attractionId,
        "poster",
      ]),
    ).rejects.toThrow(/CHECK constraint failed/i);
  });

  it("update can move media from one owner to another", async () => {
    const created = await media.create({
      owner: { attractionId },
      mediaType: "logo",
      url: "https://example.com/logo.png",
    });

    const moved = await media.update(created.id, { owner: { eventYearId } });

    expect(moved.attractionId).toBeNull();
    expect(moved.eventYearId).toBe(eventYearId);
  });

  describe("distribution policy", () => {
    it("defaults to reference-only — nothing is assumed distributable", async () => {
      const created = await media.create({
        owner: { attractionId },
        mediaType: "poster",
        url: "https://example.invalid/poster.jpg",
      });

      expect(created.distribution).toBe("reference");
    });

    it("records a user's own file as local, with a managed relative path", async () => {
      const created = await media.create({
        owner: { attractionId },
        mediaType: "local_image",
        localPath: "media/my-photo-abc123.jpg",
        distribution: "local",
      });

      expect(created).toMatchObject({
        distribution: "local",
        localPath: "media/my-photo-abc123.jpg",
        url: null,
      });
    });

    it("records a deliberate decision to bundle an asset", async () => {
      const created = await media.create({
        owner: { attractionId },
        mediaType: "logo",
        url: "https://example.invalid/ours.svg",
        distribution: "bundled",
        licenseNotes: "Our own artwork.",
      });

      expect(created.distribution).toBe("bundled");
    });

    it("can be changed later without touching anything else", async () => {
      const created = await media.create({
        owner: { attractionId },
        mediaType: "poster",
        url: "https://example.invalid/poster.jpg",
        attribution: "Universal",
      });

      const updated = await media.update(created.id, { distribution: "bundled" });

      expect(updated).toMatchObject({
        distribution: "bundled",
        attribution: "Universal",
        url: "https://example.invalid/poster.jpg",
      });
    });

    it("rejects a policy that isn't one of the three", async () => {
      await expect(
        db.execute(
          `INSERT INTO media (id, attraction_id, media_type, url, distribution)
           VALUES ('bad', ?, 'poster', 'https://example.invalid/x.jpg', 'ship-it')`,
          [attractionId],
        ),
      ).rejects.toThrow(/CHECK constraint failed/i);
    });
  });

  it("is removed when its attraction is deleted", async () => {
    const created = await media.create({
      owner: { attractionId },
      mediaType: "promotional_image",
      url: "https://example.com/promo.jpg",
    });

    await db.execute("DELETE FROM attractions WHERE id = ?", [attractionId]);

    await expect(media.getById(created.id)).resolves.toBeNull();
  });
});
