// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { readBackup } from "../backup/backupFormat";
import { buildRegistry } from "../hooks/useHauntRegistry";
import { isInHauntScope } from "../models/haunt";
import { rankingGroupScope } from "../models/ranking";
import { createBackupRepository } from "../repositories/backupRepository";
import { createExperienceTypeRepository } from "../repositories/experienceTypeRepository";
import { createHauntRepository } from "../repositories/hauntRepository";
import { createParkRepository } from "../repositories/parkRepository";
import { createRankingRepository } from "../repositories/rankingRepository";
import { createTestDatabase, createTestDatabaseFromDump } from "../test/createTestDatabase";
import { takeHhnSnapshot, type AttractionFacts, type HhnSnapshot } from "../test/hhnSnapshot";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import { buildYearRanking, summarizeYear } from "../utils/years";
import type { SqlExecutor } from "./types";

/**
 * Halloween Horror Nights, before and after multi-haunt support.
 *
 * The "before" half was recorded by the pre-multi-haunt build itself
 * (475b8cd, schema 7): its own importer loaded its own HHN archive, a
 * person's ratings, notes and rankings were written on top, and its own
 * code recorded everything the screens show. See
 * scripts/make-hhn-v7-fixture.ts.
 *
 * The "after" half is that exact database, taken through every migration
 * since (0008 onwards) and read back by the current code, looking at HHN.
 *
 * Two changes are intended and nothing else is:
 *
 * - 0009 folds an Orlando record and a Hollywood record of the same
 *   attraction in the same season into one canonical record, carrying both
 *   venues. So every check below maps a merged-away id onto the record it
 *   merged into.
 * - 0014 takes scare zones out of the archive, and moves every rating, note
 *   and ranking position on them into `legacy_personal_data`. So the
 *   recorded half is compared as `BEFORE_HOUSES` — itself, less its zones —
 *   and the zones' personal data is checked for separately.
 *
 * Otherwise the two halves must agree exactly.
 */

const FIXTURE = join(import.meta.dirname, "..", "test", "fixtures", "hhn-v7");
const BEFORE = JSON.parse(readFileSync(join(FIXTURE, "snapshot.json"), "utf8")) as HhnSnapshot;

const houseIds = new Set(
  Object.entries(BEFORE.attractions)
    .filter(([, facts]) => facts.attractionType === "house")
    .map(([id]) => id),
);
const zoneIds = new Set(Object.keys(BEFORE.attractions).filter((id) => !houseIds.has(id)));
const isHouse = (id: unknown) => houseIds.has(String(id));
const onlyHouses = <T>(record: Record<string, T>) =>
  Object.fromEntries(Object.entries(record).filter(([id]) => isHouse(id)));

/**
 * The recorded half as 0014 leaves it: no zones, nothing that belonged to a
 * zone, and no source that only a zone cited.
 */
const BEFORE_HOUSES: HhnSnapshot = (() => {
  const media = BEFORE.media.filter(
    (row) => row.attraction_id === null || isHouse(row.attraction_id),
  );
  const zoneOnlyCandidates = new Set(
    Object.entries(BEFORE.citations)
      .filter(([id]) => zoneIds.has(id))
      .flatMap(([, sources]) => sources),
  );
  const stillCited = new Set([
    ...Object.entries(BEFORE.citations)
      .filter(([id]) => isHouse(id))
      .flatMap(([, sources]) => sources),
    ...Object.values(BEFORE.seasonCitations).flat(),
    ...media.filter((row) => row.source_id !== null).map((row) => String(row.source_id)),
  ]);
  return {
    ...BEFORE,
    attractions: onlyHouses(BEFORE.attractions),
    citations: onlyHouses(BEFORE.citations),
    sources: BEFORE.sources.filter(
      (row) => !zoneOnlyCandidates.has(String(row.id)) || stillCited.has(String(row.id)),
    ),
    media,
    characters: BEFORE.characters.filter((row) => isHouse(row.attraction_id)),
    relations: BEFORE.relations.filter(
      (row) => isHouse(row.attraction_id) && isHouse(row.related_attraction_id),
    ),
    ratings: onlyHouses(BEFORE.ratings),
    notes: onlyHouses(BEFORE.notes),
    manualOrders: { houses: BEFORE.manualOrders.houses },
  };
})();

let db: SqlExecutor;
let after: HhnSnapshot;
/** Merged-away id → the canonical id it became. */
let mergedInto: Map<string, string>;
/** Canonical id → every id that became it, itself included. */
let groups: Map<string, string[]>;
/** Every id in a merge, on either side. */
let involved: Set<string>;
/** Pairs 0009 refused to merge because both halves held personal data. */
let conflicts: Array<{ subject_id: string; other_id: string }>;

const map = (id: string) => mergedInto.get(id) ?? id;
const dedupe = (ids: string[]) => [...new Set(ids)];
/** What a list of ids from before should hold now, as a set. */
const expectedMembers = (ids: string[]) => dedupe(ids.map(map)).sort();
/** Order, with every merged record taken out of both sides. */
const withoutMerged = (ids: string[]) => ids.filter((id) => !involved.has(id));

beforeAll(async () => {
  db = createTestDatabaseFromDump(readFileSync(join(FIXTURE, "archive.sql"), "utf8"), 7);
  after = await takeHhnSnapshot(db, {
    rankingScope: (group) => rankingGroupScope(group, "hhn"),
    inScope: (season) => isInHauntScope(season?.hauntId, "hhn"),
  });

  const merged = await db.select<Array<{ subject_id: string; other_id: string }>>(
    "SELECT subject_id, other_id FROM migration_conflicts WHERE kind = 'cross_park_merged'",
  );
  mergedInto = new Map(merged.map((row) => [row.subject_id, row.other_id]));
  groups = new Map();
  for (const [from, to] of mergedInto) {
    groups.set(to, [...(groups.get(to) ?? [to]), from]);
  }
  involved = new Set([...mergedInto.keys(), ...mergedInto.values()]);
  conflicts = await db.select(
    "SELECT subject_id, other_id FROM migration_conflicts WHERE kind = 'cross_park_personal_data'",
  );
});

describe("HHN after the multi-haunt migrations", () => {
  describe("seasons", () => {
    it("keeps every season exactly as it was", () => {
      expect(after.seasons).toEqual(BEFORE.seasons);
      expect(after.seasons).toHaveLength(16);
    });

    it("files every one of them under HHN", async () => {
      expect(
        await db.select("SELECT haunt_id, COUNT(*) AS count FROM event_years GROUP BY haunt_id"),
      ).toEqual([{ haunt_id: "hhn", count: 16 }]);
    });
  });

  describe("houses", () => {
    it("merges only split Orlando/Hollywood pairs, and nothing else goes", () => {
      const beforeIds = Object.keys(BEFORE_HOUSES.attractions);
      const afterIds = Object.keys(after.attractions);
      const mergedHouses = [...mergedInto.keys()].filter(isHouse);

      expect(afterIds.sort()).toEqual(beforeIds.filter((id) => !mergedInto.has(id)).sort());
      expect(afterIds.length).toBe(beforeIds.length - mergedHouses.length);

      for (const [from, to] of mergedInto) {
        const a = BEFORE.attractions[from];
        const b = BEFORE.attractions[to];
        expect(a.eventYearId, from).toBe(b.eventYearId);
        expect(a.attractionType, from).toBe(b.attractionType);
        expect(a.name.trim().toLowerCase(), from).toBe(b.name.trim().toLowerCase());
        expect([...a.parkIds, ...b.parkIds].sort(), from).toEqual(["hollywood", "orlando"]);
      }
    });

    it("leaves no HHN attraction duplicated, except pairs kept apart to protect personal data", async () => {
      const duplicates = await db.select<Array<{ ids: string }>>(
        `SELECT GROUP_CONCAT(a.id) AS ids
         FROM attractions a JOIN event_years e ON e.id = a.event_year_id
         WHERE e.haunt_id = 'hhn'
         GROUP BY a.event_year_id, a.attraction_type, LOWER(TRIM(a.name))
         HAVING COUNT(*) > 1`,
      );
      const protectedIds = new Set(conflicts.flatMap((row) => [row.subject_id, row.other_id]));

      for (const { ids } of duplicates) {
        for (const id of ids.split(",")) {
          expect(protectedIds.has(id), `${ids} is duplicated`).toBe(true);
        }
      }
      // The seed places personal data on both halves of two pairs.
      expect(conflicts).toHaveLength(2);
    });

    it("keeps every house nobody merged exactly as it was", () => {
      for (const [id, facts] of Object.entries(BEFORE_HOUSES.attractions)) {
        if (!involved.has(id)) {
          expect(after.attractions[id], id).toEqual(facts);
        }
      }
    });

    it("gives a merged attraction both venues and the fuller of the two articles", () => {
      const prose: Array<keyof AttractionFacts> = [
        "shortSummary",
        "fullOverview",
        "storyLore",
        "experienceDescription",
        "developmentNotes",
        "ipType",
        "franchiseName",
      ];
      for (const [to, members] of groups) {
        if (!isHouse(to)) {
          continue; // a merged pair of zones, which 0014 then removed
        }
        const survivor = BEFORE.attractions[to];
        const merged = after.attractions[to];
        const others = members.filter((id) => id !== to).map((id) => BEFORE.attractions[id]);

        expect(merged.parkIds, to).toEqual(
          dedupe(members.flatMap((id) => BEFORE.attractions[id].parkIds)).sort(),
        );
        expect(merged.variantName, to).toBeNull();
        for (const key of ["eventYearId", "attractionType", "name", "slug"] as const) {
          expect(merged[key], `${to}.${key}`).toBe(survivor[key]);
        }
        for (const key of prose) {
          const expected = survivor[key] ?? others.find((other) => other[key] !== null)?.[key];
          expect(merged[key], `${to}.${key}`).toBe(expected ?? null);
        }
      }
    });

    it("keeps what differed between the parks as venue sections", async () => {
      const sections = await db.select<Array<{ attraction_id: string; venue_id: string }>>(
        "SELECT attraction_id, venue_id FROM attraction_venue_wiki",
      );
      for (const { attraction_id, venue_id } of sections) {
        expect(groups.has(attraction_id), attraction_id).toBe(true);
        const member = groups
          .get(attraction_id)!
          .find((id) => BEFORE.attractions[id].parkIds.includes(venue_id));
        expect(member, `${attraction_id}/${venue_id}`).toBeDefined();
      }
    });
  });

  describe("venues", () => {
    function venueCounts(snapshot: HhnSnapshot) {
      const counts: Record<string, number> = {};
      for (const facts of Object.values(snapshot.attractions)) {
        for (const park of facts.parkIds) {
          counts[park] = (counts[park] ?? 0) + 1;
        }
      }
      return counts;
    }

    it("keeps Orlando and Hollywood as HHN's two venues", async () => {
      expect(
        await db.select("SELECT id, name, haunt_id FROM parks WHERE haunt_id = 'hhn' ORDER BY id"),
      ).toEqual([
        { id: "hollywood", name: "Hollywood", haunt_id: "hhn" },
        { id: "orlando", name: "Orlando", haunt_id: "hhn" },
      ]);
    });

    it("keeps every Orlando and every Hollywood assignment", () => {
      // A merge turns two single-venue records into one with both venues, so
      // per venue the count of attractions that ran there cannot move.
      expect(venueCounts(after)).toEqual(venueCounts(BEFORE_HOUSES));
    });

    it("keeps the entries that were already shared by both parks", () => {
      for (const [id, facts] of Object.entries(BEFORE_HOUSES.attractions)) {
        if (facts.parkIds.length === 2) {
          expect(after.attractions[id].parkIds, id).toEqual(["hollywood", "orlando"]);
        }
      }
    });
  });

  describe("wiki content, sources and media", () => {
    it("keeps every source exactly as it was, less those only a scare zone cited", () => {
      expect(after.sources).toEqual(BEFORE_HOUSES.sources);
      expect(after.sources.length).toBeLessThan(BEFORE.sources.length);
    });

    it("keeps every citation, carried to the canonical record", () => {
      const expected: Record<string, string[]> = {};
      for (const [id, sources] of Object.entries(BEFORE_HOUSES.citations)) {
        expected[map(id)] = dedupe([...(expected[map(id)] ?? []), ...sources]).sort();
      }
      expect(after.citations).toEqual(expected);
      expect(after.seasonCitations).toEqual(BEFORE.seasonCitations);
    });

    it("keeps every media record's metadata, pointing at the canonical record", () => {
      expect(after.media).toEqual(
        BEFORE_HOUSES.media.map((row) => ({
          ...row,
          attraction_id: row.attraction_id === null ? null : map(String(row.attraction_id)),
        })),
      );
      expect(after.media.map((row) => row.distribution)).toContain("local");
    });

    it("keeps every character and relation", () => {
      expect(after.characters).toEqual(
        BEFORE_HOUSES.characters.map((row) => ({
          ...row,
          attraction_id: map(String(row.attraction_id)),
        })),
      );
      expect(after.relations).toEqual(
        BEFORE_HOUSES.relations
          .map((row) => ({
            ...row,
            attraction_id: map(String(row.attraction_id)),
            related_attraction_id: map(String(row.related_attraction_id)),
          }))
          .filter((row) => row.attraction_id !== row.related_attraction_id),
      );
    });
  });

  describe("personal data", () => {
    it("keeps every house rating, on the same attraction id or the one it merged into", () => {
      const expected = Object.fromEntries(
        Object.entries(BEFORE_HOUSES.ratings).map(([id, rating]) => [map(id), rating]),
      );
      expect(after.ratings).toEqual(expected);
      expect(Object.keys(after.ratings)).toHaveLength(Object.keys(BEFORE_HOUSES.ratings).length);
    });

    it("keeps every house note the same way", () => {
      const expected = Object.fromEntries(
        Object.entries(BEFORE_HOUSES.notes).map(([id, note]) => [map(id), note]),
      );
      expect(after.notes).toEqual(expected);
      expect(Object.keys(after.notes)).toHaveLength(Object.keys(BEFORE_HOUSES.notes).length);
    });

    it("keeps unmerged personal data on exactly the id it was written against", () => {
      for (const id of Object.keys(BEFORE_HOUSES.ratings)) {
        if (!mergedInto.has(id)) {
          expect(after.ratings[id], id).toEqual(BEFORE.ratings[id]);
        }
      }
    });

    /** 0009's rule: an id takes its survivor's place, unless the survivor already had one. */
    function carried(order: string[]): string[] {
      const present = new Set(order);
      return order
        .filter((id) => !(mergedInto.has(id) && present.has(mergedInto.get(id)!)))
        .map(map);
    }

    it("shows the same manual house ranking when HHN is the haunt in view", () => {
      expect(after.manualOrders.houses).toEqual(carried(BEFORE.manualOrders.houses));
      expect(after.manualOrders.houses.length).toBeGreaterThan(0);
    });

    it("keeps the same manual house ranking under All Haunts, where it was saved", async () => {
      const rankings = createRankingRepository(db);
      const order = (await rankings.getScope(rankingGroupScope("houses", "all"))).map(
        (entry) => entry.attractionId,
      );
      expect(order).toEqual(carried(BEFORE.manualOrders.houses));

      // The retired All Attractions list keeps its houses, in order; its
      // zones went to legacy_personal_data with everything else about them.
      const everything = (await rankings.getScope("attractions:all")).map(
        (entry) => entry.attractionId,
      );
      expect(everything).toEqual(carried(BEFORE.manualOrders.all).filter(isHouse));

      const yearly = await rankings.getScope("houses:year:2024");
      expect(yearly).toHaveLength(5);
    });

    it("keeps settings", () => {
      expect(after.settings).toEqual(BEFORE.settings);
    });
  });

  describe("what the screens show", () => {
    /**
     * The recorded Years figures counted zones, which are gone, so they are
     * recomputed here — by the unchanged pure functions, over the recorded
     * houses and the recorded house ratings (carried through the merge), not
     * over anything read back from the migrated database.
     */
    it("Years: the recorded houses and reviews, less zones and merged duplicates", () => {
      const carriedRatings = new Map(
        Object.entries(BEFORE_HOUSES.ratings).map(([id, rating]) => [map(id), rating]),
      );
      const summaries = BEFORE.seasons.map((season) => {
        const items = Object.entries(BEFORE_HOUSES.attractions)
          .filter(([id, facts]) => facts.eventYearId === season.id && !mergedInto.has(id))
          .map(([id, facts]) => ({
            attraction: { id, attractionType: facts.attractionType } as Attraction,
            rating: (carriedRatings.get(id) ?? null) as Rating | null,
            posterUrl: null,
          }));
        return summarizeYear(season as unknown as EventYear, items, null);
      });

      for (const summary of summaries) {
        const seasonId = summary.eventYear.id;
        const mergedHouses = [...mergedInto.keys()].filter(
          (id) => isHouse(id) && BEFORE.attractions[id].eventYearId === seasonId,
        ).length;
        expect(summary.houseCount, seasonId).toBe(
          Number(BEFORE.years[seasonId].houseCount) - mergedHouses,
        );
        expect(after.years[seasonId], seasonId).toEqual({
          houseCount: summary.houseCount,
          reviewedCount: summary.reviewedCount,
          attractionCount: summary.attractionCount,
          averages: summary.averages,
        });
      }
      for (const [key, sort] of [
        ["total-desc", { metric: "total", direction: "desc" }],
        ["fear-asc", { metric: "fear", direction: "asc" }],
      ] as const) {
        const ranking = buildYearRanking(summaries, sort);
        expect(after.yearRanking[key], key).toEqual({
          ranked: ranking.ranked.map((summary) => summary.eventYear.id),
          insufficient: ranking.insufficient.map((summary) => summary.eventYear.id),
        });
      }
    });

    /**
     * Filters that don't look at anything a merge changes — no park, no
     * licensing, no rated-or-not. Over these every answer must match the old
     * build exactly, merged records included.
     *
     * The rest filter on exactly what a merge is meant to change about a
     * merged record: it now ran at both parks, it carries its other half's
     * rating, and an empty licensing field is filled from the other half.
     * Over those, every record *not* involved in a merge must still match
     * exactly, in the same order; the merged records' own facts are checked
     * against the rule above, and the unchanged pure functions do the rest.
     */
    const NEUTRAL = new Set([
      "none",
      "year-2019",
      "years-2023-2026",
      "year-2024",
      "houses",
      "scare-zones",
      "query-stranger",
      "query-terror-tram",
    ]);
    const filterOf = (key: string) => key.split("|")[1] ?? key;

    it("Statistics: every figure built from reviews is unchanged", () => {
      const remap = (rows: unknown) =>
        (rows as Array<[string, ...unknown[]]>).map((row) =>
          row.map((cell, index) =>
            index === (row.length === 2 ? 0 : 1) ? map(String(cell)) : cell,
          ),
        );

      // The current snapshot records only the houses-only filters, under the
      // recorded half's own keys for them.
      expect(Object.keys(after.statistics).sort()).toEqual(["houses", "orlando-houses"]);
      for (const [key, now] of Object.entries(after.statistics)) {
        if (!NEUTRAL.has(key)) {
          continue; // covered, record by record, by the explorer check below
        }
        const before = BEFORE.statistics[key];
        expect(now.distribution, `${key}.distribution`).toEqual(before.distribution);
        expect(now.yearPerformance, `${key}.yearPerformance`).toEqual(before.yearPerformance);
        expect(now.top, `${key}.top`).toEqual(remap(before.top));
        expect(now.best, `${key}.best`).toEqual(remap(before.best));
        expect(now.lowest, `${key}.lowest`).toEqual(remap(before.lowest));

        const coverage = before.coverage as Record<string, { reviewed: number }>;
        const nowCoverage = now.coverage as Record<string, { reviewed: number }>;
        for (const slice of ["all", "houses"]) {
          expect(nowCoverage[slice].reviewed, `${key}.${slice}`).toBe(coverage.houses.reviewed);
        }
      }
    });

    it("Statistics explorer: the same answers, over the same attractions", () => {
      for (const [key, now] of Object.entries(after.explorer)) {
        const before = BEFORE.explorer[key];
        const beforeRanked = before.ranked as Array<[string, number]>;
        const nowRanked = now.ranked as Array<[string, number]>;
        const beforeIds = [...beforeRanked.map(([id]) => id), ...(before.unrated as string[])];
        const nowIds = [...nowRanked.map(([id]) => id), ...(now.unrated as string[])];

        // Every review counted is one the record really carries.
        for (const [id, value] of nowRanked) {
          expect(after.ratings[id]?.fear, `${key} ${id}`).toBe(value);
        }
        expect(withoutMerged(nowRanked.map(([id]) => id)), key).toEqual(
          withoutMerged(beforeRanked.map(([id]) => id)),
        );
        expect(withoutMerged(nowIds).sort(), key).toEqual(withoutMerged(beforeIds).sort());
        expect(after.statistics[key].count, key).toBe(now.matchCount);

        if (NEUTRAL.has(key)) {
          expect(dedupe(nowIds).sort(), key).toEqual(expectedMembers(beforeIds));
          expect(nowRanked, key).toEqual(beforeRanked.map(([id, value]) => [map(id), value]));
          expect(now.years, key).toEqual(before.years);
        }
      }
    });

    it("Houses browser: every filter and sort finds the same attractions", () => {
      expect(Object.keys(after.browser).every((key) => key.startsWith("house|"))).toBe(true);
      expect(Object.keys(after.browser).sort()).toEqual(
        Object.keys(BEFORE.browser)
          .filter((key) => key.startsWith("house|"))
          .sort(),
      );
      for (const [key, now] of Object.entries(after.browser)) {
        const before = BEFORE.browser[key];
        expect(withoutMerged(now), `${key} order`).toEqual(withoutMerged(before));
        if (NEUTRAL.has(filterOf(key))) {
          expect([...now].sort(), `${key} members`).toEqual(expectedMembers(before));
        }
      }
    });

    it("Rankings: calculated and manual lists hold the same attractions in the same order", () => {
      const calculated = ["calculated", "calculatedUnrated"];
      const manual = ["manual", "manualUnplaced", "manualUnrated"];
      const all = (lists: Record<string, string[]>, names: string[]) =>
        names.flatMap((name) => lists[name]);

      expect(Object.keys(after.rankings).sort()).toEqual(
        Object.keys(BEFORE.rankings)
          .filter((key) => key.startsWith("houses|"))
          .sort(),
      );
      for (const [key, now] of Object.entries(after.rankings)) {
        const before = BEFORE.rankings[key];
        for (const [list, ids] of Object.entries(before)) {
          expect(withoutMerged(now[list]), `${key}.${list} order`).toEqual(withoutMerged(ids));
        }
        if (!NEUTRAL.has(filterOf(key))) {
          continue;
        }
        expect(now.manual, `${key}.manual`).toEqual(
          before.manual
            .filter((id) => !(mergedInto.has(id) && before.manual.includes(map(id))))
            .map(map),
        );
        for (const names of [calculated, manual]) {
          expect(dedupe(all(now, names)).sort(), key).toEqual(expectedMembers(all(before, names)));
        }
      }
    });
  });

  describe("House is walkthrough underneath, and still House on screen", () => {
    it("files every HHN house under the walk-through category, and holds nothing else", async () => {
      expect(
        await db.select(
          `SELECT a.attraction_type, a.experience_type_id, t.category, COUNT(*) AS count
           FROM attractions a
           JOIN event_years e ON e.id = a.event_year_id
           LEFT JOIN experience_types t ON t.id = a.experience_type_id
           WHERE e.haunt_id = 'hhn'
           GROUP BY a.attraction_type, a.experience_type_id, t.category
           ORDER BY a.attraction_type`,
        ),
      ).toEqual([
        {
          attraction_type: "house",
          experience_type_id: "hhn:type:house",
          category: "walkthrough",
          count: Object.values(after.attractions).length,
        },
      ]);
      expect(
        await db.select("SELECT id, category FROM experience_types WHERE haunt_id = 'hhn'"),
      ).toEqual([{ id: "hhn:type:house", category: "walkthrough" }]);
    });

    it("still says House and Houses for HHN", async () => {
      const registry = buildRegistry({
        haunts: await createHauntRepository(db).getAll(),
        venues: await createParkRepository(db).getAll(),
        experienceTypes: await createExperienceTypeRepository(db).getAll(),
      });

      expect(registry.label("house", "hhn", "one")).toBe("House");
      expect(registry.label("house", "hhn", "many")).toBe("Houses");
      expect(registry.venueName("orlando")).toBe("Orlando");
      expect(registry.venueName("hollywood")).toBe("Hollywood");
    });

    it("never lets HHN records into another haunt's view", async () => {
      const knotts = await takeHhnSnapshot(db, {
        rankingScope: (group) => rankingGroupScope(group, "knotts-scary-farm"),
        inScope: (season) => isInHauntScope(season?.hauntId, "knotts-scary-farm"),
      });
      expect(Object.keys(knotts.attractions)).toEqual([]);
    });
  });

  describe("scare zones leave, and what the person wrote about them stays", () => {
    interface LegacyRow {
      kind: string;
      attraction_id: string;
      attraction_type: string;
      haunt_id: string;
      payload: string;
    }
    let legacy: LegacyRow[];
    beforeAll(async () => {
      legacy = await db.select<LegacyRow[]>(
        `SELECT kind, attraction_id, attraction_type, haunt_id, payload
         FROM legacy_personal_data ORDER BY id`,
      );
    });

    it("leaves no zone in the archive", async () => {
      expect(
        await db.select(
          "SELECT COUNT(*) AS count FROM attractions WHERE attraction_type <> 'house'",
        ),
      ).toEqual([{ count: 0 }]);
      expect(zoneIds.size).toBeGreaterThan(100);
    });

    it("keeps every zone rating whole, where the app no longer shows it", () => {
      const zoneRatings = Object.entries(BEFORE.ratings).filter(([id]) => zoneIds.has(id));
      expect(zoneRatings.length).toBeGreaterThan(0);

      for (const [id, rating] of zoneRatings) {
        const row = legacy.find(
          (entry) => entry.kind === "rating" && entry.attraction_id === map(id),
        );
        expect(row, id).toBeDefined();
        expect(row!.attraction_type).toBe("scare_zone");
        expect(row!.haunt_id).toBe("hhn");
        const payload = JSON.parse(row!.payload);
        expect({ theme: payload.theme, fun: payload.fun, fear: payload.fear }, id).toEqual({
          theme: rating.theme,
          fun: rating.fun,
          fear: rating.fear,
        });
      }
      expect(legacy.filter((row) => row.kind === "rating")).toHaveLength(zoneRatings.length);
    });

    it("keeps every zone note whole", () => {
      const zoneNotes = Object.entries(BEFORE.notes).filter(([id]) => zoneIds.has(id));
      for (const [id, note] of zoneNotes) {
        const row = legacy.find(
          (entry) => entry.kind === "note" && entry.attraction_id === map(id),
        );
        expect(JSON.parse(row!.payload).note, id).toBe(note);
      }
      expect(legacy.filter((row) => row.kind === "note")).toHaveLength(zoneNotes.length);
    });

    it("keeps every zone's place in a manual ranking", async () => {
      const scopes = new Set(
        legacy.filter((row) => row.kind === "ranking").map((row) => JSON.parse(row.payload).scope),
      );
      expect([...scopes].sort()).toEqual([
        "attractions:all",
        "hhn:attractions:all",
        "hhn:scare_zones:all",
        "scare_zones:all",
      ]);
      expect(
        await db.select(
          `SELECT COUNT(*) AS count FROM user_rankings r
           JOIN attractions a ON a.id = r.attraction_id
           WHERE a.attraction_type <> 'house'`,
        ),
      ).toEqual([{ count: 0 }]);
    });
  });

  describe("restoring a backup made before multi-haunt support", () => {
    // The same archive and the same personal data, as the old build's own
    // "Export backup" wrote them — restored into a current install. A person
    // who restores that file must end up with the same HHN as a person whose
    // database was migrated in place.
    it("gives the same HHN as migrating the database in place", async () => {
      const read = readBackup(readFileSync(join(FIXTURE, "backup-v1.json"), "utf8"));
      expect(read.ok ? [] : read.errors).toEqual([]);
      if (!read.ok) {
        return;
      }
      const restored = createTestDatabase();
      await createBackupRepository(restored).replaceAll(read.backup.data);

      const snapshot = await takeHhnSnapshot(restored, {
        rankingScope: (group) => rankingGroupScope(group, "hhn"),
        inScope: (season) => isInHauntScope(season?.hauntId, "hhn"),
      });

      expect(Object.keys(snapshot.attractions).length).toBe(Object.keys(after.attractions).length);
      // Lists sort by name, score or year and fall back to table order when
      // two records tie — which only happens between records with the same
      // name (a house that ran in 2011 and again in 2012). A restore lays the
      // table out differently from an in-place migration, as it would have
      // in the old build too, so within a run of same-named records the
      // order is not compared. Everything else must match exactly.
      const nameOf = (id: string) => after.attractions[id]?.name ?? id;
      const ties = (ids: string[]) => {
        const out: string[] = [];
        for (let start = 0; start < ids.length;) {
          let end = start + 1;
          while (end < ids.length && nameOf(ids[end]) === nameOf(ids[start])) {
            end += 1;
          }
          out.push(...ids.slice(start, end).sort());
          start = end;
        }
        return out;
      };
      const tiesOf = (lists: Record<string, string[]>) =>
        Object.fromEntries(Object.entries(lists).map(([key, ids]) => [key, ties(ids)]));
      const ignoringTieOrder = (value: HhnSnapshot) => ({
        ...value,
        browser: tiesOf(value.browser),
        rankings: Object.fromEntries(
          Object.entries(value.rankings).map(([key, lists]) => [key, tiesOf(lists)]),
        ),
        explorer: Object.fromEntries(
          Object.entries(value.explorer).map(([key, answer]) => [
            key,
            { ...answer, unrated: ties(answer.unrated as string[]) },
          ]),
        ),
      });
      const restoredView = ignoringTieOrder(snapshot);
      const migratedView = ignoringTieOrder(after);
      for (const key of Object.keys(migratedView) as Array<keyof HhnSnapshot>) {
        expect(restoredView[key], key).toEqual(migratedView[key]);
      }

      // And the zones' personal data lands in the same place by either road.
      const preserved = async (source: SqlExecutor) =>
        (
          await source.select<Array<Record<string, unknown>>>(
            `SELECT id, kind, original_id, attraction_id, attraction_name, attraction_type,
                    haunt_id, season_id, calendar_year, payload, reason
             FROM legacy_personal_data ORDER BY id`,
          )
        ).map((row) => ({ ...row, payload: JSON.parse(String(row.payload)) }));
      const migratedLegacy = await preserved(db);
      expect(migratedLegacy.length).toBeGreaterThan(0);
      expect(await preserved(restored)).toEqual(migratedLegacy);
    });
  });
});
