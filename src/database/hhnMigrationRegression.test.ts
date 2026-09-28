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
 * One change is intended and nothing else is: 0009 folds an Orlando record
 * and a Hollywood record of the same attraction in the same season into one
 * canonical record, carrying both venues. So every check below maps a
 * merged-away id onto the record it merged into, and otherwise demands the
 * two halves agree exactly.
 */

const FIXTURE = join(import.meta.dirname, "..", "test", "fixtures", "hhn-v7");
const BEFORE = JSON.parse(readFileSync(join(FIXTURE, "snapshot.json"), "utf8")) as HhnSnapshot;

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

  describe("houses and scare zones", () => {
    it("merges only split Orlando/Hollywood pairs, and nothing else goes", () => {
      const beforeIds = Object.keys(BEFORE.attractions);
      const afterIds = Object.keys(after.attractions);

      expect(afterIds.sort()).toEqual(beforeIds.filter((id) => !mergedInto.has(id)).sort());
      expect(afterIds.length).toBe(beforeIds.length - mergedInto.size);

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

    it("keeps every attraction nobody merged exactly as it was", () => {
      for (const [id, facts] of Object.entries(BEFORE.attractions)) {
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
      expect(venueCounts(after)).toEqual(venueCounts(BEFORE));
    });

    it("keeps the entries that were already shared by both parks", () => {
      for (const [id, facts] of Object.entries(BEFORE.attractions)) {
        if (facts.parkIds.length === 2) {
          expect(after.attractions[id].parkIds, id).toEqual(["hollywood", "orlando"]);
        }
      }
    });
  });

  describe("wiki content, sources and media", () => {
    it("keeps every source exactly as it was", () => {
      expect(after.sources).toEqual(BEFORE.sources);
    });

    it("keeps every citation, carried to the canonical record", () => {
      const expected: Record<string, string[]> = {};
      for (const [id, sources] of Object.entries(BEFORE.citations)) {
        expected[map(id)] = dedupe([...(expected[map(id)] ?? []), ...sources]).sort();
      }
      expect(after.citations).toEqual(expected);
      expect(after.seasonCitations).toEqual(BEFORE.seasonCitations);
    });

    it("keeps every media record's metadata, pointing at the canonical record", () => {
      expect(after.media).toEqual(
        BEFORE.media.map((row) => ({
          ...row,
          attraction_id: row.attraction_id === null ? null : map(String(row.attraction_id)),
        })),
      );
      expect(after.media.map((row) => row.distribution)).toContain("local");
    });

    it("keeps every character and relation", () => {
      expect(after.characters).toEqual(
        BEFORE.characters.map((row) => ({ ...row, attraction_id: map(String(row.attraction_id)) })),
      );
      expect(after.relations).toEqual(
        BEFORE.relations
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
    it("keeps every rating, on the same attraction id or the one it merged into", () => {
      const expected = Object.fromEntries(
        Object.entries(BEFORE.ratings).map(([id, rating]) => [map(id), rating]),
      );
      expect(after.ratings).toEqual(expected);
      expect(Object.keys(after.ratings)).toHaveLength(Object.keys(BEFORE.ratings).length);
    });

    it("keeps every note the same way", () => {
      const expected = Object.fromEntries(
        Object.entries(BEFORE.notes).map(([id, note]) => [map(id), note]),
      );
      expect(after.notes).toEqual(expected);
      expect(Object.keys(after.notes)).toHaveLength(Object.keys(BEFORE.notes).length);
    });

    it("keeps unmerged personal data on exactly the id it was written against", () => {
      for (const id of Object.keys(BEFORE.ratings)) {
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

    it("shows the same manual rankings when HHN is the haunt in view", () => {
      for (const group of ["houses", "scare_zones", "all"] as const) {
        expect(after.manualOrders[group], group).toEqual(carried(BEFORE.manualOrders[group]));
        expect(after.manualOrders[group].length, group).toBeGreaterThan(0);
      }
    });

    it("keeps the same manual rankings under All Haunts, where they were saved", async () => {
      const rankings = createRankingRepository(db);
      for (const group of ["houses", "scare_zones", "all"] as const) {
        const order = (await rankings.getScope(rankingGroupScope(group, "all"))).map(
          (entry) => entry.attractionId,
        );
        expect(order, group).toEqual(carried(BEFORE.manualOrders[group]));
      }
      const yearly = await rankings.getScope("houses:year:2024");
      expect(yearly).toHaveLength(5);
    });

    it("keeps settings", () => {
      expect(after.settings).toEqual(BEFORE.settings);
    });
  });

  describe("what the screens show", () => {
    it("Years: the same reviews and the same averages, less the merged duplicates", () => {
      for (const [seasonId, summary] of Object.entries(BEFORE.years)) {
        const mergedHere = [...mergedInto.keys()].filter(
          (id) => BEFORE.attractions[id].eventYearId === seasonId,
        );
        const mergedHouses = mergedHere.filter(
          (id) => BEFORE.attractions[id].attractionType === "house",
        ).length;

        expect(after.years[seasonId], seasonId).toEqual({
          ...summary,
          attractionCount: Number(summary.attractionCount) - mergedHere.length,
          houseCount: Number(summary.houseCount) - mergedHouses,
          scareZoneCount: Number(summary.scareZoneCount) - (mergedHere.length - mergedHouses),
        });
      }
      expect(after.yearRanking).toEqual(BEFORE.yearRanking);
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

      for (const [key, before] of Object.entries(BEFORE.statistics)) {
        if (!NEUTRAL.has(key)) {
          continue; // covered, record by record, by the explorer check below
        }
        const now = after.statistics[key];
        expect(now.distribution, `${key}.distribution`).toEqual(before.distribution);
        expect(now.yearPerformance, `${key}.yearPerformance`).toEqual(before.yearPerformance);
        expect(now.top, `${key}.top`).toEqual(remap(before.top));
        expect(now.best, `${key}.best`).toEqual(remap(before.best));
        expect(now.lowest, `${key}.lowest`).toEqual(remap(before.lowest));

        const coverage = before.coverage as Record<string, { reviewed: number }>;
        const nowCoverage = now.coverage as Record<string, { reviewed: number }>;
        for (const slice of ["all", "houses", "scareZones"]) {
          expect(nowCoverage[slice].reviewed, `${key}.${slice}`).toBe(coverage[slice].reviewed);
        }
      }
    });

    it("Statistics explorer: the same answers, over the same attractions", () => {
      for (const [key, before] of Object.entries(BEFORE.explorer)) {
        const now = after.explorer[key];
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

    it("Houses and Scare Zones browsers: every filter and sort finds the same attractions", () => {
      for (const [key, before] of Object.entries(BEFORE.browser)) {
        const now = after.browser[key];
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

      for (const [key, before] of Object.entries(BEFORE.rankings)) {
        const now = after.rankings[key];
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
    it("files every HHN house under the walk-through category, and every zone as a zone", async () => {
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
          count: Object.values(after.attractions).filter((a) => a.attractionType === "house")
            .length,
        },
        {
          attraction_type: "scare_zone",
          experience_type_id: "hhn:type:scare-zone",
          category: "scare_zone",
          count: Object.values(after.attractions).filter((a) => a.attractionType === "scare_zone")
            .length,
        },
      ]);
    });

    it("still says House and Houses for HHN, and Scare Zone and Scare Zones", async () => {
      const registry = buildRegistry({
        haunts: await createHauntRepository(db).getAll(),
        venues: await createParkRepository(db).getAll(),
        experienceTypes: await createExperienceTypeRepository(db).getAll(),
      });

      expect(registry.label("house", "hhn", "one")).toBe("House");
      expect(registry.label("house", "hhn", "many")).toBe("Houses");
      expect(registry.label("scare_zone", "hhn", "one")).toBe("Scare Zone");
      expect(registry.label("scare_zone", "hhn", "many")).toBe("Scare Zones");
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
    });
  });
});
