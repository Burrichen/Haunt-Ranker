import type { EntityId, Timestamped } from "./common";

/** One private free-text note per attraction. */
export interface Note extends Timestamped {
  id: EntityId;
  attractionId: EntityId;
  note: string;
}
