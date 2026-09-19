/**
 * Exercises the app's own browsing, filtering and year logic against the real
 * imported archive.
 *
 * The Houses and Scare Zones browsers, the Years pages and the wiki links are
 * built on these functions, so running them over the real rows checks the same
 * behaviour those screens show — and can be run without taking the keyboard
 * away from whoever is using the machine.
 *
 * Usage: npm run data:verify
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { DATABASE_URL } from "../src/database/client";
import { NodeSqliteExecutor } from "../src/database/nodeSqliteExecutor";
import { createAttractionRepository } from "../src/repositories/attractionRepository";
import { createEventYearRepository } from "../src/repositories/eventYearRepository";
import { createRatingRepository } from "../src/repositories/ratingRepository";
import {
  DEFAULT_FILTERS,
  matchesFilters,
  matchesQuery,
  type AttractionBrowserFilters,
  type AttractionBrowserRow,
} from "../src/utils/attractionBrowser";
import { summarizeYear } from "../src/utils/years";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function resolveDatabasePath(): string {
  if (process.env.HAUNT_RANKER_DB_PATH) {
    return process.env.HAUNT_RANKER_DB_PATH;
  }
  const { identifier } = JSON.parse(
    readFileSync(join(ROOT, "src-tauri", "tauri.conf.json"), "utf8"),
  ) as { identifier: string };
  return join(process.env.APPDATA ?? "", identifier, DATABASE_URL.replace(/^sqlite:/, ""));
}

function browse(rows: AttractionBrowserRow[], filters: Partial<AttractionBrowserFilters>) {
  const merged = { ...DEFAULT_FILTERS, ...filters };
  return rows.filter((row) => matchesQuery(row, merged.query) && matchesFilters(row, merged));
}

const raw = new DatabaseSync(resolveDatabasePath(), { readOnly: true });
raw.exec("PRAGMA foreign_keys = ON;");
const db = new NodeSqliteExecutor(raw);

const [attractions, years, ratings] = await Promise.all([
  createAttractionRepository(db).getAll(),
  createEventYearRepository(db).getAll(),
  createRatingRepository(db).getAll(),
]);

const yearById = new Map(years.map((year) => [year.id, year]));
const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));

const rows: AttractionBrowserRow[] = attractions.map((attraction) => ({
  attraction,
  eventYear: yearById.get(attraction.eventYearId) ?? null,
  posterUrl: null,
  rating: ratingByAttraction.get(attraction.id) ?? null,
  rankingPosition: null,
}));

const houses = rows.filter((row) => row.attraction.attractionType === "house");
const zones = rows.filter((row) => row.attraction.attractionType === "scare_zone");

console.log("Browsers");
console.log(`  Houses      ${houses.length} rows`);
console.log(`  Scare Zones ${zones.length} rows`);
console.log(`  Years       ${years.length}`);

console.log("\nSearch");
for (const query of ["stranger", "hellraiser", "terror tram", "walking dead"]) {
  const hits = browse(rows, { query });
  const sample = hits
    .slice(0, 3)
    .map((row) => `${row.attraction.name} (${row.eventYear?.calendarYear})`)
    .join(", ");
  console.log(`  "${query}" → ${hits.length}${hits.length > 0 ? `: ${sample}…` : ""}`);
}

console.log("\nFilters (houses)");
console.log(`  year 2019            ${browse(houses, { years: [2019] }).length}`);
console.log(`  park hollywood       ${browse(houses, { parks: ["hollywood"] }).length}`);
console.log(`  park orlando         ${browse(houses, { parks: ["orlando"] }).length}`);
console.log(`  park both            ${browse(houses, { parks: ["both"] }).length}`);
console.log(`  IP licensed          ${browse(houses, { ipTypes: ["licensed"] }).length}`);
console.log(`  IP original          ${browse(houses, { ipTypes: ["original"] }).length}`);
console.log(`  status unrated       ${browse(houses, { rated: ["unrated"] }).length}`);
console.log(`  status rated         ${browse(houses, { rated: ["rated"] }).length}`);
const combined = browse(houses, { years: [2026], parks: ["orlando"], ipTypes: ["original"] });
console.log(
  `  2026 + Orlando + Original → ${combined.length}: ${combined.map((row) => row.attraction.name).join(", ")}`,
);

console.log("\nYears (the Years page's own summary)");
for (const year of years.slice(-3)) {
  const items = rows
    .filter((row) => row.attraction.eventYearId === year.id)
    .map((row) => ({ attraction: row.attraction, rating: row.rating, posterUrl: row.posterUrl }));
  const summary = summarizeYear(year, items, null);
  console.log(
    `  ${year.calendarYear}: ${summary.houseCount} houses, ${summary.scareZoneCount} zones, ` +
      `${summary.reviewedCount}/${summary.attractionCount} reviewed, ` +
      `average ${summary.averages ? summary.averages.total.toFixed(1) : "none (too few reviews)"}`,
  );
}

console.log("\nWiki links and icons");
const badIds = attractions.filter((attraction) => !/^[A-Za-z0-9-]+$/.test(attraction.id));
const slugCounts = new Map<string, number>();
for (const attraction of attractions) {
  const key = `${attraction.eventYearId}/${attraction.slug}`;
  slugCounts.set(key, (slugCounts.get(key) ?? 0) + 1);
}
console.log(`  ids unusable in a URL           ${badIds.length}`);
console.log(
  `  duplicate slugs within a year   ${[...slugCounts.values()].filter((count) => count > 1).length}`,
);
console.log(
  `  attractions with no park        ${attractions.filter((a) => a.parkIds.length === 0).length}`,
);
console.log(
  `  attractions showing both parks  ${attractions.filter((a) => a.parkIds.length === 2).length}`,
);

console.log("\nPersonal data");
console.log(`  ratings in the archive          ${ratings.length}`);
console.log(`  attractions marked as sample    ${attractions.filter((a) => a.isSample).length}`);

raw.close();
