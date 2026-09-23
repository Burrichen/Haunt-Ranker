import type { EntityId, Timestamped } from "./common";
import type { AttractionType } from "./attraction";
import { HAUNT_IDS, type HauntId } from "./haunt";

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

/**
 * Which haunt a ranking covers. `all` ranks across both, and is not a
 * summary of the two: it is a list of its own, ordered by hand, that the
 * per-haunt lists neither feed nor are fed by.
 */
export type RankingHauntScope = HauntId | "all";

export const RANKING_HAUNT_SCOPES: readonly RankingHauntScope[] = [
  "all",
  HAUNT_IDS.hhn,
  HAUNT_IDS.knotts,
];

/**
 * Prefixes a scope with the haunt it belongs to.
 *
 * All Haunts deliberately keeps the unprefixed key. Those are the scopes
 * every ranking saved before there was a second haunt, and a user's manual
 * order is the last thing that should be lost to a naming decision.
 */
function scopedTo(haunt: RankingHauntScope, scope: string): string {
  return haunt === "all" ? scope : `${haunt}:${scope}`;
}

/** The scope covering every attraction of a type, across all years. */
export function allTimeScope(
  attractionType: AttractionType,
  haunt: RankingHauntScope = "all",
): string {
  return scopedTo(haunt, `${ATTRACTION_TYPE_SCOPE[attractionType]}:all`);
}

/**
 * The scope a Rankings group saves its manual order under. The houses and
 * scare_zones groups deliberately resolve to the same scopes as
 * `allTimeScope`, so a manual order made on the Rankings page is the same
 * one the browser's "Personal Ranking" sort reads.
 */
export function rankingGroupScope(group: RankingGroup, haunt: RankingHauntScope = "all"): string {
  return scopedTo(haunt, group === "all" ? "attractions:all" : `${group}:all`);
}

/** The scope covering every attraction of a type within a single event year. */
export function yearScope(attractionType: AttractionType, calendarYear: number): string {
  return `${ATTRACTION_TYPE_SCOPE[attractionType]}:year:${calendarYear}`;
}
