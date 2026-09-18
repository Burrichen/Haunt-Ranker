import type { EntityId, Timestamped } from "./common";

export interface Character extends Timestamped {
  id: EntityId;
  attractionId: EntityId;
  name: string;
  description: string | null;
}

export interface CharacterInput {
  attractionId: EntityId;
  name: string;
  description?: string | null;
}
