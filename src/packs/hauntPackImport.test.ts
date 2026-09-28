// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlExecutor } from "../database/types";
import { buildRegistry } from "../hooks/useHauntRegistry";
import { createArchiveImportRepository } from "../repositories/archiveImportRepository";
import { createExperienceTypeRepository } from "../repositories/experienceTypeRepository";
import { createHauntPackRepository } from "../repositories/hauntPackRepository";
import { createHauntRepository } from "../repositories/hauntRepository";
import { createParkRepository } from "../repositories/parkRepository";
import { createTestDatabase } from "../test/createTestDatabase";
import { applyPackImport, PackImportError, preparePackImport } from "./importHauntPack";
import type { HauntPack } from "./hauntPack";

/**
 * The claim this whole system makes: a Halloween event nobody wrote code
 * for can be added by data alone, through the same path a real pack takes.
 *
 * The fixture is a fictional festival with its own vocabulary — Trails, not
 * Houses — its own venue, and a kind of experience neither shipped haunt
 * has. Nothing below special-cases it.
 */
const PACK_PATH = join(
  import.meta.dirname,
  "..",
  "test",
  "fixtures",
  "moonlight-fright-festival.hauntpack.json",
);

const PACK_TEXT = readFileSync(PACK_PATH, "utf8");
const HAUNT_ID = "moonlight-fright-festival";
const TRAIL_ID = "moonlight-fright-festival:2026:trail:hollow-road";

function packObject(): HauntPack {
  return JSON.parse(PACK_TEXT) as HauntPack;
}

describe("importing a haunt the app has never heard of", () => {
  let db: SqlExecutor;
  let ids: number;

  async function importPack(input: string | HauntPack = PACK_TEXT) {
    const packs = createHauntPackRepository(db);
    const prepared = preparePackImport(input, await packs.readState());
    return applyPackImport(prepared, {
      archive: createArchiveImportRepository(db),
      packs,
      newId: () => `import-${(ids += 1)}`,
    });
  }

  async function rows<T>(sql: string, args: unknown[] = []): Promise<T[]> {
    return db.select<T[]>(sql, args);
  }

  /** The registry the interface would build, from what the import left. */
  async function registry() {
    return buildRegistry({
      haunts: await createHauntRepository(db).getAll(),
      venues: await createParkRepository(db).getAll(),
      experienceTypes: await createExperienceTypeRepository(db).getAll(),
    });
  }

  beforeEach(() => {
    db = createTestDatabase();
    ids = 0;
  });

  it("adds the haunt, its venue, its vocabulary and its seasons", async () => {
    const preview = await importPack();

    expect(preview.isNewHaunt).toBe(true);
    expect(preview.hauntName).toBe("Moonlight Fright Festival");
    expect(preview.seasons.created).toBe(1);
    expect(preview.experiences.created).toBe(4);
    expect(preview.sources.created).toBe(3);
    expect(preview.conflicts).toEqual([]);

    const haunts = await rows<{ id: string; accent: string }>(
      "SELECT id, accent FROM haunts ORDER BY sort_order",
    );
    expect(haunts).toContainEqual({ id: HAUNT_ID, accent: "green" });

    const venues = await rows<{ id: string; icon: string }>(
      "SELECT id, icon FROM parks WHERE haunt_id = ?",
      [HAUNT_ID],
    );
    expect(venues).toEqual([{ id: "moonlight-fright-festival:harrow-orchard", icon: "trees" }]);
  });

  it("calls its walk-throughs what it calls them, with no code naming it", async () => {
    await importPack();
    const built = await registry();

    expect(built.label("house", HAUNT_ID)).toBe("Trail");
    expect(built.label("house", HAUNT_ID, "many")).toBe("Trails");
    expect(built.label("show", HAUNT_ID, "many")).toBe("Shows");
    // The two shipped haunts are untouched by it.
    expect(built.label("house", "hhn", "many")).toBe("Houses");
    expect(built.label("house", "knotts-scary-farm", "many")).toBe("Mazes");
    // And a list spanning every haunt reads them all out.
    expect(built.label("house", null, "many")).toBe("Houses, Mazes & Trails");
  });

  it("holds a kind of experience neither shipped haunt has", async () => {
    await importPack();

    const shows = await rows<{ name: string; attraction_type: string }>(
      `SELECT a.name, a.attraction_type FROM attractions a
       JOIN event_years e ON e.id = a.event_year_id
       WHERE e.haunt_id = ? AND a.attraction_type = 'show'`,
      [HAUNT_ID],
    );
    expect(shows).toEqual([{ name: "The Last Pressing", attraction_type: "show" }]);
  });

  it("records where every record came from", async () => {
    await importPack();

    const imported = await rows<{ source_pack_id: string; source_pack_version: string }>(
      "SELECT source_pack_id, source_pack_version FROM attractions WHERE id = ?",
      [TRAIL_ID],
    );
    expect(imported).toEqual([
      { source_pack_id: "moonlight-fright-festival", source_pack_version: "2026.1.0" },
    ]);

    const log = await createHauntPackRepository(db).listImports();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      packId: "moonlight-fright-festival",
      packVersion: "2026.1.0",
      schemaId: "haunt-ranker.haunt-pack/v1",
      hauntId: HAUNT_ID,
    });
    expect(log[0].provenanceNotes).toMatch(/Fictional development pack/);
  });

  it("changes nothing on a second import of the same pack", async () => {
    await importPack();
    const second = await importPack();

    expect(second.experiences).toEqual({ created: 0, updated: 0, unchanged: 4 });
    expect(second.seasons).toEqual({ created: 0, updated: 0, unchanged: 1 });
    expect(second.citationsAdded).toBe(0);
    expect(second.conflicts).toEqual([]);
  });

  describe("a later version of the same pack", () => {
    beforeEach(async () => {
      await importPack();
    });

    it("corrects facts, adds a season, an experience and a source", async () => {
      const update = packObject();
      update.pack.version = "2026.2.0";
      update.experiences[0].summary = "A lantern-lit walk, corrected.";
      update.seasons.push({
        id: "moonlight-fright-festival:2027",
        calendarYear: 2027,
        name: "Moonlight Fright Festival 2027",
      });
      update.experiences.push({
        id: "moonlight-fright-festival:2027:trail:the-orchard-gate",
        seasonId: "moonlight-fright-festival:2027",
        typeId: "moonlight-fright-festival:type:trail",
        name: "The Orchard Gate",
        venues: ["moonlight-fright-festival:harrow-orchard"],
      });
      update.sources?.push({
        id: "moonlight-fright-festival:source:programme-2027",
        type: "official_site",
        title: "Moonlight Fright Festival 2027 programme",
      });

      const preview = await importPack(update);

      expect(preview.seasons).toMatchObject({ created: 1, unchanged: 1 });
      expect(preview.experiences).toMatchObject({ created: 1, updated: 1, unchanged: 3 });
      expect(preview.sources).toMatchObject({ created: 1, unchanged: 3 });

      const corrected = await rows<{ short_summary: string; source_pack_version: string }>(
        "SELECT short_summary, source_pack_version FROM attractions WHERE id = ?",
        [TRAIL_ID],
      );
      expect(corrected[0].short_summary).toBe("A lantern-lit walk, corrected.");
      expect(corrected[0].source_pack_version).toBe("2026.2.0");
    });

    it("never touches a rating, a note or a ranking", async () => {
      await db.execute(
        "INSERT INTO user_ratings (id, attraction_id, theme, fun, fear) VALUES ('rt1', ?, 4, 4.5, 3)",
        [TRAIL_ID],
      );
      await db.execute(
        "INSERT INTO user_notes (id, attraction_id, note) VALUES ('n1', ?, 'Mine.')",
        [TRAIL_ID],
      );
      await db.execute(
        "INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ('k1', 'houses:all', ?, 0)",
        [TRAIL_ID],
      );

      const update = packObject();
      update.pack.version = "2026.3.0";
      update.experiences[0].summary = "Corrected again.";
      await importPack(update);

      expect(await rows("SELECT attraction_id, total FROM user_ratings")).toEqual([
        { attraction_id: TRAIL_ID, total: 11.5 },
      ]);
      expect(await rows("SELECT note FROM user_notes")).toEqual([{ note: "Mine." }]);
      expect(await rows("SELECT position FROM user_rankings")).toEqual([{ position: 0 }]);
    });

    it("records which pack a source came from, and defends an edit to one", async () => {
      const sourceId = "moonlight-fright-festival:source:programme-2026";

      const imported = await rows<{ source_pack_id: string; source_pack_version: string }>(
        "SELECT source_pack_id, source_pack_version FROM sources WHERE id = ?",
        [sourceId],
      );
      expect(imported[0]).toEqual({
        source_pack_id: "moonlight-fright-festival",
        source_pack_version: "2026.1.0",
      });

      // Someone corrects the citation in Admin Mode.
      await db.execute(
        `UPDATE sources
         SET publisher = 'Harrow Orchard Trust',
             manual_edit_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [sourceId],
      );

      const update = packObject();
      update.pack.version = "2026.5.0";
      update.sources = (update.sources ?? []).map((source) =>
        source.id === sourceId ? { ...source, publisher: "Moonlight Fright Festival" } : source,
      );
      const preview = await importPack(update);

      expect(preview.conflicts).toContainEqual(
        expect.objectContaining({
          kind: "manual-edit",
          id: sourceId,
          field: "publisher",
          current: "Harrow Orchard Trust",
          incoming: "Moonlight Fright Festival",
        }),
      );
      const kept = await rows<{ publisher: string }>("SELECT publisher FROM sources WHERE id = ?", [
        sourceId,
      ]);
      expect(kept[0].publisher).toBe("Harrow Orchard Trust");
    });

    it("flags a hand-edited field instead of overwriting it", async () => {
      // Admin Mode edits stamp the record; the pack must notice.
      await db.execute(
        `UPDATE attractions
         SET short_summary = 'Corrected by hand.',
             manual_edit_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [TRAIL_ID],
      );

      const update = packObject();
      update.pack.version = "2026.4.0";
      update.experiences[0].summary = "What the pack would have said.";
      update.experiences[0].location = "The old cart track, corrected";
      const preview = await importPack(update);

      const conflict = preview.conflicts.find((entry) => entry.field === "short_summary");
      expect(conflict).toMatchObject({
        kind: "manual-edit",
        id: TRAIL_ID,
        current: "Corrected by hand.",
        incoming: "What the pack would have said.",
      });

      const stored = await rows<{ short_summary: string; location_notes: string }>(
        "SELECT short_summary, location_notes FROM attractions WHERE id = ?",
        [TRAIL_ID],
      );
      // The edit stands, and so does everything else already written: the
      // archive knows the record was edited, not which field, so nothing
      // that already says something is overwritten.
      expect(stored[0].short_summary).toBe("Corrected by hand.");
      expect(stored[0].location_notes).toBe("The old cart track");
      expect(preview.conflicts.map((entry) => entry.field)).toContain("location_notes");
    });

    it("fills a field the edit left empty, because adding costs nobody their work", async () => {
      await db.execute(
        `UPDATE attractions
         SET story_lore = NULL, manual_edit_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [TRAIL_ID],
      );

      const update = packObject();
      update.pack.version = "2026.5.0";
      update.experiences[0].wiki = { ...update.experiences[0].wiki, story: "Newly documented." };
      await importPack(update);

      expect(await rows("SELECT story_lore FROM attractions WHERE id = ?", [TRAIL_ID])).toEqual([
        { story_lore: "Newly documented." },
      ]);
    });
  });

  describe("what it refuses", () => {
    it("refuses a file that isn't a pack, before touching anything", async () => {
      await expect(importPack("{not json")).rejects.toThrow(PackImportError);
      expect(await rows("SELECT COUNT(*) as count FROM haunts")).toEqual([{ count: 2 }]);
    });

    it("refuses a schema this build can't read", async () => {
      const future = packObject();
      future.schema = "haunt-ranker.haunt-pack/v9";

      await expect(importPack(future)).rejects.toThrow(/can't be read/);
    });

    it("refuses to claim a record that belongs to another haunt", async () => {
      await importPack();

      // A second pack, for a different haunt, naming a record the first one
      // owns. Ids are how a pack corrects its own records; this is the line
      // between correcting one and taking it.
      const intruder = packObject();
      const rename = (id: string) => id.replace(HAUNT_ID, "rival-haunt");
      intruder.pack.id = "rival-pack";
      intruder.haunt = { ...intruder.haunt, id: "rival-haunt", name: "Rival Haunt" };
      intruder.experienceTypes = intruder.experienceTypes.map((type) => ({
        ...type,
        id: rename(type.id),
        hauntId: "rival-haunt",
      }));
      intruder.venues = intruder.venues.map((venue) => ({
        ...venue,
        id: rename(venue.id),
        hauntId: "rival-haunt",
      }));
      intruder.seasons = intruder.seasons.map((season) => ({ ...season, id: rename(season.id) }));
      intruder.experiences = [
        {
          // The one id it does not rename: the record it is reaching for.
          id: TRAIL_ID,
          seasonId: intruder.seasons[0].id,
          typeId: intruder.experienceTypes[0].id,
          name: "Hollow Road",
          venues: [intruder.venues[0].id],
        },
      ];

      const refusal = await importPack(intruder).catch((error: unknown) => error);
      expect(refusal).toBeInstanceOf(PackImportError);
      expect((refusal as PackImportError).problems.join(" ")).toMatch(
        /already in the archive under "moonlight-fright-festival"/,
      );

      // And the record it reached for is exactly as it was.
      const stored = await rows<{ source_pack_id: string; name: string }>(
        "SELECT source_pack_id, name FROM attractions WHERE id = ?",
        [TRAIL_ID],
      );
      expect(stored[0].source_pack_id).toBe(HAUNT_ID);
      expect(await rows("SELECT id FROM haunts WHERE id = 'rival-haunt'")).toEqual([]);
    });

    it("leaves the archive exactly as it was when a write fails", async () => {
      const broken = packObject();
      // A relation naming a record that exists nowhere is only a warning;
      // this instead breaks a foreign key the database itself enforces.
      broken.pack.id = "moonlight-broken";
      broken.experiences[0].id = "moonlight-fright-festival:2026:trail:new-one";
      broken.experiences[0].seasonId = "moonlight-fright-festival:2026";
      broken.seasons = [];

      const before = await rows("SELECT id FROM attractions ORDER BY id");
      await expect(importPack(broken)).rejects.toThrow();
      expect(await rows("SELECT id FROM attractions ORDER BY id")).toEqual(before);
    });
  });

  it("has nowhere to put a rating, a note or a ranking", async () => {
    const smuggled = JSON.parse(PACK_TEXT) as Record<string, unknown>;
    const experiences = smuggled.experiences as Array<Record<string, unknown>>;
    experiences[0].rating = { theme: 5, fun: 5, fear: 5 };
    experiences[0].note = "Not mine to write.";

    await importPack(smuggled as unknown as HauntPack);

    // The fields survive as inert JSON and reach nothing: the planner has
    // no path from a pack field to a personal table.
    expect(await rows("SELECT COUNT(*) as count FROM user_ratings")).toEqual([{ count: 0 }]);
    expect(await rows("SELECT COUNT(*) as count FROM user_notes")).toEqual([{ count: 0 }]);
  });

  describe("the namespacing warning", () => {
    const namespace = /isn't namespaced to this haunt/;

    /** A small pack for a haunt the migrations already seed, reusing its seeded ids. */
    function knottsPack(venueId: string): HauntPack {
      return {
        schema: "haunt-ranker.haunt-pack/v1",
        pack: { id: "knotts-namespace-check", version: "1" },
        haunt: { id: "knotts-scary-farm", name: "Knott's Scary Farm", shortName: "Knott's" },
        experienceTypes: [
          {
            id: "knotts-scary-farm:type:maze",
            category: "house",
            labelOne: "Maze",
            labelMany: "Mazes",
          },
        ],
        venues: [{ id: venueId, name: "Knott's Berry Farm" }],
        seasons: [
          { id: "knotts-scary-farm:2024", calendarYear: 2024, name: "Knott's Scary Farm 2024" },
        ],
        experiences: [
          {
            id: "knotts-scary-farm:2024:maze:widows",
            seasonId: "knotts-scary-farm:2024",
            typeId: "knotts-scary-farm:type:maze",
            name: "Widows",
            venues: [venueId],
          },
        ],
      };
    }

    it("doesn't flag an id the archive already holds for the same haunt", async () => {
      const prepared = preparePackImport(
        knottsPack("knotts-berry-farm"),
        await createHauntPackRepository(db).readState(),
      );

      expect(prepared.preview.warnings.filter((w) => namespace.test(w))).toEqual([]);
    });

    it("still flags an un-namespaced id the pack has invented", async () => {
      const prepared = preparePackImport(
        knottsPack("buena-park"),
        await createHauntPackRepository(db).readState(),
      );

      expect(prepared.preview.warnings).toEqual([expect.stringMatching(namespace)]);
    });
  });

  it("keeps this machine's offline copy of an image when the pack is imported again", async () => {
    const pack = packObject();
    pack.experiences[0].media = [
      {
        id: "moonlight-fright-festival:2026:media:poster",
        kind: "poster",
        url: "https://example.invalid/poster.jpg",
        distribution: "reference",
      },
    ];
    await importPack(pack);
    await db.execute(
      "UPDATE media SET local_path = 'media/poster-abc.jpg', distribution = 'local' WHERE id = ?",
      ["moonlight-fright-festival:2026:media:poster"],
    );

    pack.pack.version = "2026.1.1";
    pack.experiences[0].media[0].attribution = "Corrected credit";
    await importPack(pack);

    expect(await rows("SELECT local_path, distribution, attribution FROM media")).toEqual([
      {
        local_path: "media/poster-abc.jpg",
        distribution: "local",
        attribution: "Corrected credit",
      },
    ]);
  });
});
