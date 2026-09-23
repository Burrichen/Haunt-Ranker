import type { EntityId } from "./common";

/**
 * A season an attraction ran in.
 *
 * The relationship exists so that a returning attraction is one rankable
 * record with several appearances, rather than a new record each year.
 * Knott's needs this most — a maze that comes back for four seasons is one
 * maze — but both haunts answer "which seasons did this run in?" the same
 * way.
 */
export interface SeasonAppearance {
  attractionId: EntityId;
  seasonId: EntityId;
  /** Anything true of this appearance in particular — a new room, a changed ending. */
  notes: string | null;
  createdAt: string;
}

export interface SeasonAppearanceInput {
  attractionId: EntityId;
  seasonId: EntityId;
  notes?: string | null;
}
