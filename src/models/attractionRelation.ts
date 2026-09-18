import type { EntityId, Timestamped } from "./common";

/** Deliberately a small, fixed set — not an open-ended relationship graph. */
export type RelationType = "sequel" | "previous_version" | "same_franchise" | "related_concept";

export interface AttractionRelation extends Timestamped {
  id: EntityId;
  attractionId: EntityId;
  relatedAttractionId: EntityId;
  relationType: RelationType;
  notes: string | null;
}

export interface AttractionRelationInput {
  attractionId: EntityId;
  relatedAttractionId: EntityId;
  relationType: RelationType;
  notes?: string | null;
}
