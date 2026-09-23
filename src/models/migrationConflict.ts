import type { EntityId } from "./common";

/**
 * Something a migration refused to decide on its own.
 *
 * Migration 0009 merges same-name cross-park HHN records into one canonical
 * attraction. Where both records carry a rating or a note, merging would
 * mean choosing between two things the user wrote — so it stops, leaves
 * both records exactly as they are, and writes one of these instead. The
 * question then belongs to the user, with nothing lost while it waits.
 */
export interface MigrationConflict {
  id: EntityId;
  /** Which migration recorded it, e.g. "0009_merge_hhn_cross_park". */
  migration: string;
  /** What kind of report this is — a merge that happened, or one that stopped. */
  kind: MigrationConflictKind;
  /** The record the report is about, where there is one. */
  subjectId: EntityId | null;
  /** The other record involved — the one merged away, or the one left alone. */
  otherId: EntityId | null;
  detail: string;
  /** Set once a person has dealt with it. */
  resolvedAt: string | null;
  createdAt: string;
}

/**
 * `cross_park_merged` is a record of work done; `cross_park_personal_data`
 * is a question still open. Anything else a future migration writes is
 * carried through as-is rather than dropped.
 */
export type MigrationConflictKind = "cross_park_merged" | "cross_park_personal_data" | string;

export const UNRESOLVED_CONFLICT_KINDS = ["cross_park_personal_data"] as const;
