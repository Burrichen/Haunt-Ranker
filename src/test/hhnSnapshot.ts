import type { SqlExecutor } from "../database/types";
import type { Attraction, AttractionType } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";
import { createNoteRepository } from "../repositories/noteRepository";
import { createRankingRepository } from "../repositories/rankingRepository";
import { createRatingRepository } from "../repositories/ratingRepository";
import {
  DEFAULT_FILTERS,
  filterAndSortRows,
  type AttractionBrowserFilters,
  type AttractionBrowserRow,
  type SortOption,
} from "../utils/attractionBrowser";
import {
  buildCalculatedRanking,
  buildManualRanking,
  DEFAULT_RANKING_FILTERS,
  groupAttractionTypes,
  matchesRankingFilters,
  type RankingFilters,
  type RankingRow,
} from "../utils/rankings";
import {
  computeCoverage,
  computeHighlights,
  computeScoreDistribution,
  computeTopAttractions,
  computeYearPerformance,
  DEFAULT_STATISTICS_FILTERS,
  filterStatisticsRows,
  type StatisticsFilters,
  type StatisticsRow,
} from "../utils/statistics";
import { runAttractionQuery, runYearQuery } from "../utils/statisticsExplorer";
import { buildYearRanking, summarizeYear, type YearAttraction } from "../utils/years";

/**
 * Everything Halloween Horror Nights shows a person, reduced to plain data.
 *
 * This file is run twice, against two different builds: once by the
 * pre-multi-haunt app (commit 475b8cd, schema 7) to record what HHN looked
 * like before there was a second haunt, and once by the current app after
 * migrating that same database. The migration regression test compares the
 * two. So it may only use APIs both builds have, and it goes through the
 * same repositories and the same pure functions the screens use — the
 * Houses and Scare Zones browsers, Years, Rankings, Statistics and the
 * explorer — rather than re-deriving any of it.
 *
 * `scripts/make-hhn-v7-fixture.ts` regenerates the recorded half.
 */

type RankingGroup = "houses" | "scare_zones" | "all";

export interface SnapshotOptions {
  /**
   * The scope key a Rankings group, viewed for HHN, saves its manual order
   * under. The key is the one thing whose spelling legitimately changed:
   * `houses:all` then, `hhn:houses:all` now.
   */
  rankingScope: (group: RankingGroup) => string;
  /** Narrows rows the way the haunt in view does. The old build had no haunts. */
  inScope?: (eventYear: EventYear | null) => boolean;
}

export interface AttractionFacts {
  eventYearId: string;
  attractionType: string;
  name: string;
  slug: string;
  variantName: string | null;
  ipType: string | null;
  franchiseName: string | null;
  shortSummary: string | null;
  fullOverview: string | null;
  storyLore: string | null;
  experienceDescription: string | null;
  developmentNotes: string | null;
  openingDate: string | null;
  closingDate: string | null;
  locationNotes: string | null;
  isSample: boolean;
  parkIds: string[];
}

export interface HhnSnapshot {
  seasons: Array<Record<string, unknown>>;
  attractions: Record<string, AttractionFacts>;
  /** Attraction → the source ids cited for it, sorted. */
  citations: Record<string, string[]>;
  /** Season → the source ids cited for it, sorted. */
  seasonCitations: Record<string, string[]>;
  sources: Array<Record<string, unknown>>;
  media: Array<Record<string, unknown>>;
  characters: Array<Record<string, unknown>>;
  relations: Array<Record<string, unknown>>;
  ratings: Record<string, { theme: number; fun: number; fear: number; total: number }>;
  notes: Record<string, string>;
  /** What the Rankings page reads for each group, in saved order. */
  manualOrders: Record<RankingGroup, string[]>;
  settings: Record<string, string>;
  /** The Years page. */
  years: Record<string, Record<string, unknown>>;
  yearRanking: Record<string, { ranked: string[]; insufficient: string[] }>;
  /** Statistics, per filter set. */
  statistics: Record<string, Record<string, unknown>>;
  /** The explorer, per filter set. */
  explorer: Record<string, Record<string, unknown>>;
  /** The Houses and Scare Zones browsers: `type|filters|sort` → ids in order. */
  browser: Record<string, string[]>;
  /** The Rankings page: `group|mode|filters|sort` → ids in order. */
  rankings: Record<string, Record<string, string[]>>;
}

function facts(attraction: Attraction): AttractionFacts {
  return {
    eventYearId: attraction.eventYearId,
    attractionType: attraction.attractionType,
    name: attraction.name,
    slug: attraction.slug,
    variantName: attraction.variantName,
    ipType: attraction.ipType,
    franchiseName: attraction.franchiseName,
    shortSummary: attraction.shortSummary,
    fullOverview: attraction.fullOverview,
    storyLore: attraction.storyLore,
    experienceDescription: attraction.experienceDescription,
    developmentNotes: attraction.developmentNotes,
    openingDate: attraction.openingDate,
    closingDate: attraction.closingDate,
    locationNotes: attraction.locationNotes,
    isSample: attraction.isSample,
    parkIds: [...attraction.parkIds].sort(),
  };
}

function ratingValues(rating: Rating) {
  return { theme: rating.theme, fun: rating.fun, fear: rating.fear, total: rating.total };
}

function ids(rows: Array<{ attraction: Attraction }>): string[] {
  return rows.map((row) => row.attraction.id);
}

function grouped(rows: Array<Record<string, string>>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    (out[row.owner] ??= []).push(row.source);
  }
  for (const list of Object.values(out)) {
    list.sort();
  }
  return out;
}

const BROWSER_FILTERS: Record<string, Partial<AttractionBrowserFilters>> = {
  none: {},
  "year-2019": { years: [2019] },
  "years-2023-2026": { years: [2023, 2026] },
  hollywood: { parks: ["hollywood"] },
  orlando: { parks: ["orlando"] },
  both: { parks: ["both"] },
  licensed: { ipTypes: ["licensed"] },
  original: { ipTypes: ["original"] },
  rated: { rated: ["rated"] },
  unrated: { rated: ["unrated"] },
  "query-stranger": { query: "stranger" },
  "query-terror-tram": { query: "terror tram" },
  "score-8-15": { ratingMin: 8, ratingMax: 15 },
  "orlando-original-2026": { years: [2026], parks: ["orlando"], ipTypes: ["original"] },
};

const BROWSER_SORTS: SortOption[] = [
  "name-asc",
  "year-desc",
  "year-asc",
  "total-desc",
  "fear-asc",
  "manual",
];

const STATISTICS_FILTERS: Record<string, Partial<StatisticsFilters>> = {
  none: {},
  "year-2019": { year: 2019 },
  houses: { type: "house" },
  "scare-zones": { type: "scare_zone" },
  hollywood: { park: "hollywood" },
  orlando: { park: "orlando" },
  licensed: { ipType: "licensed" },
  "orlando-houses": { park: "orlando", type: "house" },
};

const RANKING_FILTERS: Record<string, Partial<RankingFilters>> = {
  none: {},
  orlando: { parks: ["orlando"] },
  both: { parks: ["both"] },
  "year-2024": { years: [2024] },
  original: { ipTypes: ["original"] },
};

export async function takeHhnSnapshot(
  db: SqlExecutor,
  { rankingScope, inScope = () => true }: SnapshotOptions,
): Promise<HhnSnapshot> {
  const [allAttractions, seasons, ratings, notes] = await Promise.all([
    createAttractionRepository(db).getAll(),
    createEventYearRepository(db).getAll(),
    createRatingRepository(db).getAll(),
    createNoteRepository(db).getAll(),
  ]);
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  const hhnSeasons = seasons.filter((season) => inScope(season));
  const attractions = allAttractions.filter((a) => inScope(seasonById.get(a.eventYearId) ?? null));
  const ratingByAttraction = new Map(ratings.map((rating) => [rating.attractionId, rating]));

  const rankingRepo = createRankingRepository(db);
  const manualOrders = {} as Record<RankingGroup, string[]>;
  for (const group of ["houses", "scare_zones", "all"] as const) {
    manualOrders[group] = (await rankingRepo.getScope(rankingScope(group))).map(
      (entry) => entry.attractionId,
    );
  }

  const statisticsRows: StatisticsRow[] = attractions.map((attraction) => ({
    attraction,
    eventYear: seasonById.get(attraction.eventYearId) ?? null,
    rating: ratingByAttraction.get(attraction.id) ?? null,
  }));

  // --- archive facts, straight from the tables ----------------------------
  const hhnIds = new Set(attractions.map((a) => a.id));
  const hhnSeasonIds = new Set(hhnSeasons.map((s) => s.id));
  const keep = (row: Record<string, unknown>) =>
    (row.attraction_id == null || hhnIds.has(String(row.attraction_id))) &&
    (row.event_year_id == null || hhnSeasonIds.has(String(row.event_year_id)));

  const citations = grouped(
    await db.select<Array<Record<string, string>>>(
      "SELECT attraction_id AS owner, source_id AS source FROM attraction_sources",
    ),
  );
  const seasonCitations = grouped(
    await db.select<Array<Record<string, string>>>(
      "SELECT event_year_id AS owner, source_id AS source FROM event_year_sources",
    ),
  );

  const snapshot: HhnSnapshot = {
    seasons: hhnSeasons
      .map((season) => ({
        id: season.id,
        calendarYear: season.calendarYear,
        name: season.name,
        description: season.description,
        sourceNotes: season.sourceNotes,
        startsOn: season.startsOn,
        endsOn: season.endsOn,
        isSample: season.isSample,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    attractions: Object.fromEntries(
      attractions.map((attraction) => [attraction.id, facts(attraction)]),
    ),
    citations: Object.fromEntries(Object.entries(citations).filter(([id]) => hhnIds.has(id))),
    seasonCitations: Object.fromEntries(
      Object.entries(seasonCitations).filter(([id]) => hhnSeasonIds.has(id)),
    ),
    sources: await db.select(
      `SELECT id, source_type, title, url, publisher, published_at, notes
       FROM sources ORDER BY id`,
    ),
    media: (
      await db.select<Array<Record<string, unknown>>>(
        `SELECT id, attraction_id, event_year_id, media_type, url, local_path, source_id,
                attribution, license_notes, distribution
         FROM media ORDER BY id`,
      )
    ).filter(keep),
    characters: (
      await db.select<Array<Record<string, unknown>>>(
        "SELECT id, attraction_id, name, description FROM characters ORDER BY id",
      )
    ).filter(keep),
    relations: await db.select(
      `SELECT id, attraction_id, related_attraction_id, relation_type, notes
       FROM attraction_relations ORDER BY id`,
    ),
    ratings: Object.fromEntries(
      ratings
        .filter((rating) => hhnIds.has(rating.attractionId))
        .map((rating) => [rating.attractionId, ratingValues(rating)]),
    ),
    notes: Object.fromEntries(
      notes.filter((note) => hhnIds.has(note.attractionId)).map((n) => [n.attractionId, n.note]),
    ),
    manualOrders,
    settings: Object.fromEntries(
      (
        await db.select<Array<{ key: string; value: string }>>(
          "SELECT key, value FROM user_settings ORDER BY key",
        )
      ).map((row) => [row.key, row.value]),
    ),
    years: {},
    yearRanking: {},
    statistics: {},
    explorer: {},
    browser: {},
    rankings: {},
  };

  // --- Years ---------------------------------------------------------------
  const summaries = hhnSeasons.map((season) => {
    const items: YearAttraction[] = statisticsRows
      .filter((row) => row.attraction.eventYearId === season.id)
      .map((row) => ({ attraction: row.attraction, rating: row.rating, posterUrl: null }));
    return summarizeYear(season, items, null);
  });
  for (const summary of summaries) {
    snapshot.years[summary.eventYear.id] = {
      houseCount: summary.houseCount,
      scareZoneCount: summary.scareZoneCount,
      reviewedCount: summary.reviewedCount,
      attractionCount: summary.attractionCount,
      averages: summary.averages,
    };
  }
  for (const [key, sort] of [
    ["total-desc", { metric: "total", direction: "desc" }],
    ["fear-asc", { metric: "fear", direction: "asc" }],
  ] as const) {
    const ranking = buildYearRanking(summaries, sort);
    snapshot.yearRanking[key] = {
      ranked: ranking.ranked.map((summary) => summary.eventYear.id),
      insufficient: ranking.insufficient.map((summary) => summary.eventYear.id),
    };
  }

  // --- Statistics and the explorer ------------------------------------------
  for (const [key, partial] of Object.entries(STATISTICS_FILTERS)) {
    const filters = { ...DEFAULT_STATISTICS_FILTERS, ...partial };
    const visible = filterStatisticsRows(statisticsRows, filters);
    snapshot.statistics[key] = {
      count: visible.length,
      coverage: computeCoverage(visible),
      distribution: computeScoreDistribution(visible),
      yearPerformance: {
        total: computeYearPerformance(visible, "total"),
        fear: computeYearPerformance(visible, "fear"),
      },
      top: computeTopAttractions(visible, "total").map((top) => [top.attraction.id, top.value]),
      best: computeHighlights(visible, "best").map((h) => [h.metric, h.attraction.id, h.value]),
      lowest: computeHighlights(visible, "lowest").map((h) => [h.metric, h.attraction.id, h.value]),
    };
    const query = runAttractionQuery(statisticsRows, {
      filters,
      metric: "fear",
      direction: "desc",
      reviewedOnly: false,
    });
    snapshot.explorer[key] = {
      ranked: query.ranked.map((row) => [row.attraction.id, row.value]),
      unrated: ids(query.unrated),
      matchCount: query.matchCount,
      years: runYearQuery(statisticsRows, filters, "total", "desc"),
    };
  }

  // --- The Houses and Scare Zones browsers -----------------------------------
  for (const type of ["house", "scare_zone"] as AttractionType[]) {
    const scope = rankingScope(type === "house" ? "houses" : "scare_zones");
    const positions = new Map(
      (await rankingRepo.getScope(scope)).map((entry) => [entry.attractionId, entry.position]),
    );
    const rows: AttractionBrowserRow[] = statisticsRows
      .filter((row) => row.attraction.attractionType === type)
      .map((row) => ({
        ...row,
        posterUrl: null,
        rankingPosition: positions.get(row.attraction.id) ?? null,
      }));
    for (const [filterKey, partial] of Object.entries(BROWSER_FILTERS)) {
      for (const sort of BROWSER_SORTS) {
        snapshot.browser[`${type}|${filterKey}|${sort}`] = ids(
          filterAndSortRows(rows, { ...DEFAULT_FILTERS, ...partial }, sort),
        );
      }
    }
  }

  // --- Rankings ---------------------------------------------------------------
  for (const group of ["houses", "scare_zones", "all"] as const) {
    const types = groupAttractionTypes(group);
    const groupRows: RankingRow[] = statisticsRows.filter((row) =>
      types.includes(row.attraction.attractionType),
    );
    for (const [filterKey, partial] of Object.entries(RANKING_FILTERS)) {
      const filters = { ...DEFAULT_RANKING_FILTERS, ...partial };
      const visible = groupRows.filter((row) => matchesRankingFilters(row, filters));
      const calculated = buildCalculatedRanking(visible);
      const byFear = buildCalculatedRanking(visible, { metric: "fear", direction: "asc" });
      const manual = buildManualRanking(visible, manualOrders[group]);
      snapshot.rankings[`${group}|${filterKey}`] = {
        calculated: ids(calculated.ranked),
        calculatedUnrated: ids(calculated.unrated),
        byFear: ids(byFear.ranked),
        manual: ids(manual.ranked),
        manualUnplaced: ids(manual.unplaced),
        manualUnrated: ids(manual.unrated),
      };
    }
  }

  return snapshot;
}
