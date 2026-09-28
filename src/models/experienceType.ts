import type { AttractionType } from "./attraction";
import type { Timestamped } from "./common";
import type { HauntId } from "./haunt";

/**
 * What one haunt calls one kind of experience.
 *
 * HHN has Houses and Knott's has Mazes. The word belongs to the haunt, so
 * it is a row rather than a branch in the interface.
 *
 * `category` is what the app reasons about — only walk-throughs, since
 * migration 0014; `labelOne` and `labelMany` are what a reader sees.
 */
export interface ExperienceType extends Timestamped {
  id: string;
  hauntId: HauntId;
  category: AttractionType;
  labelOne: string;
  labelMany: string;
  description: string | null;
  sortOrder: number;
  /** Dormant: written by the retired Haunt Pack importer. Never shown. */
  packId: string | null;
}

export interface ExperienceTypeInput {
  id: string;
  hauntId: HauntId;
  category: AttractionType;
  labelOne: string;
  labelMany: string;
  description?: string | null;
  sortOrder?: number;
  packId?: string | null;
}
