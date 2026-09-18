/**
 * Shared shapes used across domain models (House, ScareZone, Year, Ranking,
 * etc.). Entity-specific models are added as those features are built.
 */

export type EntityId = string;

export interface Identifiable {
  id: EntityId;
}

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}
