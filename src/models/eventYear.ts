import type { EntityId, Timestamped } from "./common";
import type { HauntId } from "./haunt";

/**
 * One haunt's season — "Halloween Horror Nights 2024", "Knott's Scary Farm
 * 2024". Identity is the id, never the year: two haunts both have a 2024.
 */
export interface EventYear extends Timestamped {
  id: EntityId;
  /** The haunt this season belongs to. */
  hauntId: HauntId;
  calendarYear: number;
  name: string;
  description: string | null;
  sourceNotes: string | null;
  /** ISO date the event's first night ran, where it's known. */
  startsOn: string | null;
  /** ISO date of its last night, where it's known. */
  endsOn: string | null;
  /** True for fictional development/sample data — see src/database/devSampleData.ts. */
  isSample: boolean;
}

export interface EventYearInput {
  hauntId?: HauntId;
  calendarYear: number;
  name: string;
  description?: string | null;
  sourceNotes?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  /** Defaults to false. Only the dev sample seed should ever pass true. */
  isSample?: boolean;
}

/** Seasons are what the app calls these now; the type name is kept for continuity. */
export type HauntSeason = EventYear;
export type HauntSeasonInput = EventYearInput;
