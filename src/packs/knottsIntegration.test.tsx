import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import type { SqlExecutor } from "../database/types";
import { buildRegistry } from "../hooks/useHauntRegistry";
import { DEFAULT_HAUNT_SCOPE, isInHauntScope, isRankedCategory } from "../models/haunt";
import { rankingGroupScope } from "../models/ranking";
import { createArchiveImportRepository } from "../repositories/archiveImportRepository";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createExperienceTypeRepository } from "../repositories/experienceTypeRepository";
import { createHauntPackRepository } from "../repositories/hauntPackRepository";
import { createHauntRepository } from "../repositories/hauntRepository";
import { createParkRepository } from "../repositories/parkRepository";
import { createRankingRepository } from "../repositories/rankingRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import { createTestDatabaseFromDump } from "../test/createTestDatabase";
import { takeHhnSnapshot, type HhnSnapshot } from "../test/hhnSnapshot";
import { buildCalculatedRanking } from "../utils/rankings";
import { compareHaunts, computeCoverage } from "../utils/statistics";
import { applyPackImport, preparePackImport } from "./importHauntPack";

/**
 * Knott's Scary Farm 2024–2026, imported the normal way into an archive
 * that already holds somebody's HHN.
 *
 * The base is the HHN database the pre-multi-haunt build recorded — its
 * real archive, with ratings, notes and manual rankings on top — migrated
 * to today. The pack goes through the same `preparePackImport` /
 * `applyPackImport` the Admin screen and `npm run pack:import` use, and
 * then the running app is rendered against the result.
 */

const database = vi.hoisted(() => ({ current: null as SqlExecutor | null }));

vi.mock("../database/client", () => ({
  DATABASE_URL: "sqlite:test.db",
  getDatabase: () => Promise.resolve(database.current),
}));

// The two pieces of Tauri the pages reach for, to turn a stored image into a
// src. There is no Tauri under jsdom; everything above them runs for real.
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: () => Promise.resolve("/app-data"),
  join: (...parts: string[]) => Promise.resolve(parts.join("/")),
}));
vi.mock("@tauri-apps/api/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tauri-apps/api/core")>()),
  convertFileSrc: (path: string) => `asset://localhost${path}`,
}));

const ROOT = join(import.meta.dirname, "..", "..");
const PACK_TEXT = readFileSync(
  join(ROOT, "data", "Knott's-Scary-Farm-2024-2026.hauntpack.json"),
  "utf8",
);
const DUMP = readFileSync(join(ROOT, "src", "test", "fixtures", "hhn-v7", "archive.sql"), "utf8");

const K = "knotts-scary-farm";
const WIDOWS = `${K}:2024:maze:widows`;
const ZOO = `${K}:2025:maze:the-zoo`;
const INKED = `${K}:2026:maze:inked`;
const GHOST_TOWN = `${K}:2024:scare-zone:ghost-town-streets`;

const hhnView = {
  rankingScope: (group: "houses" | "scare_zones" | "all") => rankingGroupScope(group, "hhn"),
  inScope: (season: { hauntId?: string } | null) => isInHauntScope(season?.hauntId, "hhn"),
} as const;

let hhnBefore: HhnSnapshot;

/** A fresh migrated HHN archive with personal data, and Knott's imported into it. */
async function importedArchive(): Promise<SqlExecutor> {
  const db = createTestDatabaseFromDump(DUMP, 7);
  const packs = createHauntPackRepository(db);
  const prepared = preparePackImport(PACK_TEXT, await packs.readState());
  expect(prepared.preview.conflicts).toEqual([]);
  expect(prepared.preview.warnings).toEqual([]);
  let n = 0;
  await applyPackImport(prepared, {
    archive: createArchiveImportRepository(db),
    packs,
    newId: () => `import-${(n += 1)}`,
  });
  return db;
}

beforeAll(async () => {
  hhnBefore = await takeHhnSnapshot(createTestDatabaseFromDump(DUMP, 7), hhnView as never);
});

beforeEach(async () => {
  window.localStorage.clear();
  database.current = await importedArchive();
});

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

async function registry() {
  const db = database.current!;
  return buildRegistry({
    haunts: await createHauntRepository(db).getAll(),
    venues: await createParkRepository(db).getAll(),
    experienceTypes: await createExperienceTypeRepository(db).getAll(),
  });
}

/** Everything the page's main region says, as one line. */
async function mainText(expect: RegExp): Promise<string> {
  let text = "";
  await waitFor(() => {
    text = (screen.getByRole("main").textContent ?? "").replace(/\s+/g, " ");
    if (!expect.test(text)) {
      throw new Error(`main says: ${text.slice(0, 400)}`);
    }
  });
  return text;
}

/** Sources and relations belong to no haunt, so they're read whole; leave Knott's out. */
function withoutKnotts(snapshot: HhnSnapshot): HhnSnapshot {
  return {
    ...snapshot,
    sources: snapshot.sources.filter((row) => !String(row.id).startsWith(`${K}:`)),
    relations: snapshot.relations.filter((row) => !String(row.attraction_id).startsWith(`${K}:`)),
  };
}

function go(hash: string) {
  window.location.hash = hash;
  render(<App />);
}

async function view(haunt: "Halloween Horror Nights" | "Knott's Scary Farm" | "All Haunts") {
  const selector = await within(screen.getByRole("complementary")).findByRole("radiogroup", {
    name: "Viewing",
  });
  const option = await within(selector).findByRole("radio", { name: haunt });
  await act(async () => fireEvent.click(option));
}

describe("Knott's Scary Farm, imported through the Haunt Pack importer", () => {
  describe("user data", () => {
    it("leaves every HHN record, rating, note and ranking exactly as it was", async () => {
      const after = withoutKnotts(await takeHhnSnapshot(database.current!, hhnView as never));
      for (const key of Object.keys(hhnBefore) as Array<keyof HhnSnapshot>) {
        expect(after[key], key).toEqual(hhnBefore[key]);
      }
    });
  });

  describe("haunts", () => {
    it("lists Halloween Horror Nights and Knott's Scary Farm on the Haunts page", async () => {
      go("#/haunts");

      expect(
        await screen.findByRole("heading", { name: "Halloween Horror Nights" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Knott's Scary Farm" })).toBeInTheDocument();
    });

    it("keeps HHN as the default haunt", async () => {
      expect(DEFAULT_HAUNT_SCOPE).toBe("hhn");
      go("#/");

      const selector = await within(screen.getByRole("complementary")).findByRole("radiogroup", {
        name: "Viewing",
      });
      expect(await within(selector).findByRole("radio", { checked: true })).toHaveAccessibleName(
        "Halloween Horror Nights",
      );
    });
  });

  describe("terminology", () => {
    it("says Mazes at Knott's, Houses at HHN, and both across haunts", async () => {
      const words = await registry();

      expect(words.label("house", K, "many")).toBe("Mazes");
      expect(words.label("house", K, "one")).toBe("Maze");
      expect(words.label("scare_zone", K, "many")).toBe("Scare Zones");
      expect(words.label("house", "hhn", "many")).toBe("Houses");
      expect(words.label("house", null, "many")).toBe("Houses & Mazes");
      expect(words.label("other", K, "many")).toBe("Special Experiences");
    });

    it("renames the walk-through browser to Mazes when Knott's is in view", async () => {
      go("#/houses");
      await view("Knott's Scary Farm");

      expect(await screen.findByRole("heading", { level: 1, name: "Mazes" })).toBeInTheDocument();
    });
  });

  describe("seasons", () => {
    it("files 2024, 2025 and 2026 under Knott's only, beside HHN's own 2024–2026", async () => {
      const seasons = await createEventYearRepository(database.current!).getAll();
      const knotts = seasons.filter((season) => season.hauntId === K);
      const hhn2024 = seasons.filter(
        (season) => season.hauntId === "hhn" && season.calendarYear >= 2024,
      );

      expect(knotts.map((season) => [season.id, season.calendarYear]).sort()).toEqual([
        [`${K}:2024`, 2024],
        [`${K}:2025`, 2025],
        [`${K}:2026`, 2026],
      ]);
      expect(hhn2024.map((season) => season.id).sort()).toEqual([
        "hhn-2024",
        "hhn-2025",
        "hhn-2026",
      ]);
    });

    it("shows only Knott's seasons on the Years page, each with its full line-up", async () => {
      go("#/years");
      await view("Knott's Scary Farm");

      const text = await mainText(/Knott's Scary Farm 2024/);
      for (const year of [2024, 2025, 2026]) {
        // Returning mazes count in every season they ran, not only the first.
        expect(text).toContain(`Knott's Scary Farm ${year}Mazes10Scare Zones5`);
      }
      expect(text).not.toMatch(/Halloween Horror Nights/);
    });

    it("lists every maze on each season page, returning ones included", async () => {
      const pack = JSON.parse(PACK_TEXT) as {
        experiences: Array<{
          name: string;
          typeId: string;
          seasonId: string;
          alsoAppearedIn?: string[];
        }>;
      };
      for (const year of [2024, 2025, 2026]) {
        const season = `${K}:${year}`;
        const mazes = pack.experiences.filter(
          (e) =>
            e.typeId === `${K}:type:maze` &&
            [e.seasonId, ...(e.alsoAppearedIn ?? [])].includes(season),
        );
        expect(mazes).toHaveLength(10);

        go(`#/years/${season}`);
        const text = await mainText(new RegExp(`Knott's Scary Farm ${year}10 Mazes5 Scare Zones`));
        for (const maze of mazes) {
          expect(text, `${maze.name} in ${year}`).toContain(maze.name);
        }
        // Only mazes and zones are reviewed: 15, not the whole line-up.
        expect(text).toContain("0 of 15 reviewed");
        cleanup();
      }
    });
  });

  describe("archive, search and filters", () => {
    it("holds 14 mazes, 6 scare zone records and 6 special experiences, and no shows", async () => {
      const all = await createAttractionRepository(database.current!).getAll();
      const knotts = all.filter((a) => a.id.startsWith(`${K}:`));
      const count = (type: string) => knotts.filter((a) => a.attractionType === type).length;

      expect(count("house")).toBe(14);
      expect(count("scare_zone")).toBe(6);
      expect(count("other")).toBe(6);
      expect(count("show")).toBe(0);
    });

    it("finds a Knott's maze by search in the Knott's view, and not in HHN's", async () => {
      go("#/houses?q=inked");
      await view("Knott's Scary Farm");
      expect(await mainText(/1 result/)).toContain("Inked");

      await view("Halloween Horror Nights");
      expect(await mainText(/0 results|No /)).not.toContain("Inked");
    });

    it("filters Knott's mazes by year", async () => {
      go("#/houses?year=2024");
      await view("Knott's Scary Farm");

      const text = await mainText(/10 results/);
      expect(text).toContain("Wax Works");
      expect(text).not.toContain("Inked");
    });

    it("lists Knott's scare zones in their own browser", async () => {
      go("#/scare-zones");
      await view("Knott's Scary Farm");

      const text = await mainText(/6 results/);
      for (const zone of [
        "Ghost Town Streets",
        "The Gore-ing '20s",
        "CarnEVIL",
        "Forsaken Lake",
        "The Gauntlet",
      ]) {
        expect(text).toContain(zone);
      }
    });
  });

  describe("ratings and rankings", () => {
    it("rates Knott's mazes and zones with the same Theme / Fun / Fear system", async () => {
      const ratings = createRatingRepository(database.current!);
      const zoo = await ratings.upsert(ZOO, { theme: 4.5, fun: 4, fear: 3.5 });
      await ratings.upsert(GHOST_TOWN, { theme: 4, fun: 4.5, fear: 2 });

      expect(zoo.total).toBe(12);
      expect(
        (await ratings.getAll()).filter((r) => r.attractionId.startsWith(`${K}:`)),
      ).toHaveLength(2);
    });

    it("keeps a Knott's manual ranking apart from HHN's, and HHN's order never moves", async () => {
      const db = database.current!;
      const rankings = createRankingRepository(db);
      const hhnOrder = async () =>
        Object.fromEntries(
          await Promise.all(
            (["houses", "scare_zones", "all"] as const).flatMap((group) =>
              (["hhn", "all"] as const).map(async (haunt) => [
                `${haunt}|${group}`,
                (await rankings.getScope(rankingGroupScope(group, haunt))).map(
                  (e) => e.attractionId,
                ),
              ]),
            ),
          ),
        );
      const before = await hhnOrder();

      await rankings.setScope(rankingGroupScope("houses", K), [INKED, WIDOWS, ZOO]);
      await rankings.setScope(rankingGroupScope("houses", K), [ZOO, INKED, WIDOWS]);

      expect(
        (await rankings.getScope(rankingGroupScope("houses", K))).map((e) => e.attractionId),
      ).toEqual([ZOO, INKED, WIDOWS]);
      expect(await hhnOrder()).toEqual(before);
    });

    it("ranks HHN houses and Knott's mazes together under All Haunts", async () => {
      const db = database.current!;
      await createRatingRepository(db).upsert(ZOO, { theme: 5, fun: 5, fear: 5 });
      const [attractions, seasons, ratings] = await Promise.all([
        createAttractionRepository(db).getAll(),
        createEventYearRepository(db).getAll(),
        createRatingRepository(db).getAll(),
      ]);
      const seasonById = new Map(seasons.map((s) => [s.id, s]));
      const ratingOf = new Map(ratings.map((r) => [r.attractionId, r]));
      const rows = attractions
        .filter((a) => a.attractionType === "house")
        .map((attraction) => ({
          attraction,
          eventYear: seasonById.get(attraction.eventYearId) ?? null,
          rating: ratingOf.get(attraction.id) ?? null,
        }));

      const ranked = buildCalculatedRanking(rows).ranked;
      const haunts = new Set(ranked.map((row) => row.eventYear?.hauntId));

      expect(ranked[0].attraction.id).toBe(ZOO);
      expect(haunts).toEqual(new Set(["hhn", K]));
    });

    it("shows the rating panel on the Rankings page for Knott's with Mazes as the group", async () => {
      go(`#/rankings?haunt=${K}`);

      expect(await screen.findByRole("radio", { name: "Mazes" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Scare Zones" })).toBeInTheDocument();
    });
  });

  describe("statistics", () => {
    it("counts Knott's on its own, and compares the haunts with their sample sizes", async () => {
      const db = database.current!;
      await createRatingRepository(db).upsert(ZOO, { theme: 4, fun: 4, fear: 4 });
      await createRatingRepository(db).upsert(WIDOWS, { theme: 3, fun: 3, fear: 5 });
      const [attractions, seasons, ratings] = await Promise.all([
        createAttractionRepository(db).getAll(),
        createEventYearRepository(db).getAll(),
        createRatingRepository(db).getAll(),
      ]);
      const seasonById = new Map(seasons.map((s) => [s.id, s]));
      const ratingOf = new Map(ratings.map((r) => [r.attractionId, r]));
      const rows = attractions.map((attraction) => ({
        attraction,
        eventYear: seasonById.get(attraction.eventYearId) ?? null,
        rating: ratingOf.get(attraction.id) ?? null,
      }));
      const knottsRows = rows.filter((row) => isInHauntScope(row.eventYear?.hauntId, K));

      expect(computeCoverage(knottsRows).houses).toEqual({ reviewed: 2, total: 14 });
      // The Statistics page counts only what is reviewed: mazes and zones.
      const reviewable = rows.filter((row) => isRankedCategory(row.attraction.attractionType));
      const [hhn, knotts] = compareHaunts(reviewable, ["hhn", K]);
      expect(knotts).toMatchObject({ hauntId: K, reviewedCount: 2, attractionCount: 20 });
      expect(knotts.averages?.total).toBe(11.5);
      expect(hhn.reviewedCount).toBe(Object.keys(hhnBefore.ratings).length);
    });

    it("shows the side-by-side comparison, with sample sizes, under All Haunts", async () => {
      go("#/statistics");
      await view("All Haunts");

      const text = await mainText(/By haunt/);
      expect(text).toContain(
        `Halloween Horror Nights${Object.keys(hhnBefore.ratings).length} of 369`,
      );
      expect(text).toContain("Knott's Scary Farm0 of 20Not enough reviewed to average");
    });

    it("shows Knott's statistics on their own when Knott's is in view", async () => {
      go("#/statistics");
      await view("Knott's Scary Farm");

      const text = await mainText(/Review coverage/);
      expect(text).toContain("All attractions0 / 20");
      expect(text).toContain("Mazes0 / 14");
      expect(text).not.toContain("By haunt");
    });
  });

  describe("wiki", () => {
    it("shows a Knott's maze's haunt, season, venue, type, sources and related records", async () => {
      go(`#/attractions/${encodeURIComponent(`${K}:2024:maze:room-13`)}`);

      expect(await screen.findByRole("heading", { level: 1, name: "Room 13" })).toBeInTheDocument();
      const text = await mainText(/Sources/);
      expect(text).toContain("Knott's Scary Farm");
      expect(text).toContain("Knott's Berry Farm");
      expect(text).toContain("Maze");
      expect(text).toContain("Event DetailsKnott's Scary Farm 2024");
      expect(screen.getAllByText(/Room 13 Full Walkthrough/).length).toBe(2);
      expect(screen.getAllByRole("link", { name: /The Gore-ing '20s/ }).length).toBeGreaterThan(0);
      expect(screen.getByLabelText("My Review")).toHaveTextContent("Not Rated");
    });

    it("lists every season a returning maze appeared in", async () => {
      go(`#/attractions/${encodeURIComponent(WIDOWS)}`);

      expect(await screen.findByRole("heading", { level: 1, name: "Widows" })).toBeInTheDocument();
      const text = await mainText(/Sources/);
      for (const year of ["2024", "2025", "2026"]) {
        expect(text).toContain(`Knott's Scary Farm ${year}`);
      }
    });

    it("shows the reimagined Gauntlet as its own record, linked to the original", async () => {
      go(`#/attractions/${encodeURIComponent(`${K}:2025:scare-zone:the-gauntlet-reimagined`)}`);

      const text = await mainText(/Sources/);
      expect(text).toContain("Reimagined (2025)");
      expect(screen.getAllByRole("link", { name: /The Gauntlet/ }).length).toBeGreaterThan(0);
    });

    it("offers no Theme / Fun / Fear review for a ride overlay", async () => {
      go(
        `#/attractions/${encodeURIComponent(`${K}:2024:experience:timber-mountain-log-ride-halloween-hootenanny`)}`,
      );

      await mainText(/Sources/);
      const panel = screen.getByLabelText("My Review");
      expect(panel).toHaveTextContent(
        "Special Experiences are archive records, not rated or ranked.",
      );
      // The overlay's own panel offers no score. (The related Origins maze,
      // which is rated, still shows its own "Not Rated" card.)
      expect(panel).not.toHaveTextContent("Not Rated");
      expect(panel.querySelector("button")).toBeNull();
    });
  });
});
