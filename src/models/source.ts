import type { EntityId, Timestamped } from "./common";

export type SourceType =
  | "youtube"
  | "article"
  | "official_site"
  | "promotional"
  | "book"
  | "podcast"
  | "interview"
  | "social_media"
  | "other";

export interface Source extends Timestamped {
  id: EntityId;
  sourceType: SourceType;
  title: string;
  url: string | null;
  publisher: string | null;
  publishedAt: string | null;
  notes: string | null;
  /** True for fictional development/sample data — see src/database/devSampleData.ts. */
  isSample: boolean;
}

export interface SourceInput {
  sourceType: SourceType;
  title: string;
  url?: string | null;
  publisher?: string | null;
  publishedAt?: string | null;
  notes?: string | null;
  /** Defaults to false. Only the dev sample seed should ever pass true. */
  isSample?: boolean;
}
