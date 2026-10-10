// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlExecutor } from "../database/types";
import { createTestDatabase } from "../test/createTestDatabase";
import {
  baseNameOf,
  saveMissingArtwork,
  type FetchedImage,
  type OfflineCopyNetwork,
} from "./offlineCopies";

/**
 * The shared offline-copy logic, with the network faked: what's kept, what's
 * thrown away, and what's recorded.
 */
function image(status: number, contentType: string, size = 1000) {
  const keep = vi.fn(async () => undefined);
  const discard = vi.fn(async () => undefined);
  const fetched: FetchedImage = { status, contentType, size, keep, discard };
  return { fetched, keep, discard };
}

describe("saveMissingArtwork", () => {
  let db: SqlExecutor;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.execute(
      "INSERT INTO event_years (id, haunt_id, calendar_year, name) VALUES ('hhn-2015', 'hhn', 2015, 'HHN 2015')",
    );
    await db.execute(
      `INSERT INTO attractions (id, event_year_id, attraction_type, name, slug)
       VALUES ('insidious', 'hhn-2015', 'house', 'Insidious', 'insidious')`,
    );
    for (const [id, url, type, distribution] of [
      [
        "ok",
        "https://static.wikia.nocookie.net/x/images/b/bf/Insidious.jpg/revision/latest",
        "poster",
        "unclear",
      ],
      ["blocked", "https://example.com/blocked.jpg", "poster", "reference"],
      ["html", "https://example.com/page.jpg", "poster", "reference"],
      ["huge", "https://example.com/huge.jpg", "poster", "reference"],
      ["map", "https://example.com/guide.pdf", "map", "reference"],
    ]) {
      await db.execute(
        "INSERT INTO media (id, attraction_id, media_type, url, distribution) VALUES (?, 'insidious', ?, ?, ?)",
        [id, type, url, distribution],
      );
    }
  });

  it("keeps real images, discards the rest, and records only what it kept", async () => {
    const responses = {
      "https://static.wikia.nocookie.net/x/images/b/bf/Insidious.jpg/revision/latest": image(
        200,
        "image/webp",
      ),
      "https://example.com/blocked.jpg": image(403, "text/html"),
      "https://example.com/page.jpg": image(200, "text/html"),
      "https://example.com/huge.jpg": image(200, "image/jpeg", 20 * 1024 * 1024),
    } as Record<string, ReturnType<typeof image>>;
    const network: OfflineCopyNetwork = {
      getText: async () => ({ status: 404, body: "" }),
      getImage: async (url) => responses[url].fetched,
    };

    const outcomes = await saveMissingArtwork(db, network);

    expect(outcomes.map((o) => [o.row.id, o.kind])).toEqual([
      ["blocked", "skipped"],
      ["html", "skipped"],
      ["huge", "skipped"],
      ["ok", "saved"],
    ]);
    const ok =
      responses["https://static.wikia.nocookie.net/x/images/b/bf/Insidious.jpg/revision/latest"];
    expect(ok.keep).toHaveBeenCalledWith(
      expect.stringMatching(/^media\/insidious-[a-z0-9-]+\.webp$/),
    );
    for (const url of [
      "https://example.com/blocked.jpg",
      "https://example.com/page.jpg",
      "https://example.com/huge.jpg",
    ]) {
      expect(responses[url].discard).toHaveBeenCalled();
      expect(responses[url].keep).not.toHaveBeenCalled();
    }
    // The map is never fetched; only the kept image is marked as held.
    expect(
      await db.select("SELECT id, distribution FROM media WHERE local_path IS NOT NULL"),
    ).toEqual([{ id: "ok", distribution: "local" }]);
  });

  it("never fetches an image it already holds", async () => {
    await db.execute("UPDATE media SET local_path = 'media/held.jpg', distribution = 'local'");
    const getImage = vi.fn();

    expect(await saveMissingArtwork(db, { getText: vi.fn(), getImage })).toEqual([]);
    expect(getImage).not.toHaveBeenCalled();
  });
});

describe("baseNameOf", () => {
  it("names a Fandom file after the file, not after 'latest'", () => {
    expect(
      baseNameOf(
        "https://static.wikia.nocookie.net/h/images/b/bf/Insidious.jpg/revision/latest?cb=1",
      ),
    ).toBe("Insidious");
  });
});
