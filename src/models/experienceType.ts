import type { AttractionType } from "./attraction";
import type { Timestamped } from "./common";
import type { HauntId } from "./haunt";

/**
 * What one haunt calls one kind of experience.
 *
 * HHN has Houses, Knott's has Mazes, and a haunt imported tomorrow may have
 * Trails. The word belongs to the haunt, so it is a row rather than a
 * branch in the interface — that is the whole reason a haunt nobody has
 * written code for can still read correctly.
 *
 * `category` is the closed set the app reasons about; `labelOne` and
 * `labelMany` are what a reader sees and are entirely the pack's.
 */
export interface ExperienceType extends Timestamped {
  id: string;
  hauntId: HauntId;
  category: AttractionType;
  labelOne: string;
  labelMany: string;
  description: string | null;
  sortOrder: number;
  /** Which pack introduced this type, where one did. */
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
