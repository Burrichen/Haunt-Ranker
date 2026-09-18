import type { EntityId, Timestamped } from "./common";
import type { ParkId } from "./park";

export type AttractionType = "house" | "scare_zone";
export type IpType = "original" | "licensed";

/**
 * A house or scare zone. Most descriptive fields are nullable — do not
 * assume every fact is known. `parkIds` is assembled from the
 * `attraction_parks` join table, not a column on `attractions`.
 */
export interface Attraction extends Timestamped {
  id: EntityId;
  eventYearId: EntityId;
  attractionType: AttractionType;
  name: string;
  slug: string;
  variantName: string | null;
  ipType: IpType | null;
  franchiseName: string | null;
  shortSummary: string | null;
  fullOverview: string | null;
  storyLore: string | null;
  experienceDescription: string | null;
  developmentNotes: string | null;
  openingDate: string | null;
  closingDate: string | null;
  locationNotes: string | null;
  parkIds: ParkId[];
  /** True for fictional development/sample data — see src/database/devSampleData.ts. */
  isSample: boolean;
}

export interface AttractionInput {
  eventYearId: EntityId;
  attractionType: AttractionType;
  name: string;
  slug: string;
  /** An attraction can belong to Hollywood only, Orlando only, or both. */
  parkIds: ParkId[];
  variantName?: string | null;
  ipType?: IpType | null;
  franchiseName?: string | null;
  shortSummary?: string | null;
  fullOverview?: string | null;
  storyLore?: string | null;
  experienceDescription?: string | null;
  developmentNotes?: string | null;
  openingDate?: string | null;
  closingDate?: string | null;
  locationNotes?: string | null;
  /** Defaults to false. Only the dev sample seed should ever pass true. */
  isSample?: boolean;
}
