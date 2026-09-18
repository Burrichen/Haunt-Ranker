import type { EntityId, Timestamped } from "./common";
import type { AttractionType } from "./attraction";

/**
 * A manually-ranked position within a `scope` — a free-form key
 * identifying which list this ordering applies to (e.g. "houses:all",
 * "scare_zones:year:2024"), so filtered/year views can introduce new
 * scopes without a schema change. Manual ranking always takes precedence
 * over the calculated (score-based) ordering.
 */
export interface RankingEntry extends Timestamped {
  id: EntityId;
  scope: string;
  attractionId: EntityId;
  position: number;
}

const ATTRACTION_TYPE_SCOPE: Record<AttractionType, string> = {
  house: "houses",
  scare_zone: "scare_zones",
};

/** The lists the Rankings page can rank. Each keeps its own independent manual order. */
export type RankingGroup = "houses" | "scare_zones" | "all";

/** The scope covering every attraction of a type, across all years. */
export function allTimeScope(attractionType: AttractionType): string {
  return `${ATTRACTION_TYPE_SCOPE[attractionType]}:all`;
}

/**
 * The scope a Rankings group saves its manual order under. The houses and
 * scare_zones groups deliberately resolve to the same scopes as
 * `allTimeScope`, so a manual order made on the Rankings page is the same
 * one the browser's "Personal Ranking" sort reads.
 */
export function rankingGroupScope(group: RankingGroup): string {
  return group === "all" ? "attractions:all" : `${group}:all`;
}

/** The scope covering every attraction of a type within a single event year. */
export function yearScope(attractionType: AttractionType, calendarYear: number): string {
  return `${ATTRACTION_TYPE_SCOPE[attractionType]}:year:${calendarYear}`;
}
