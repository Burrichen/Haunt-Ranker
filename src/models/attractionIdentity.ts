/**
 * When two records are the same attraction. These rules are permanent:
 *
 * - **HHN:** the same name in the same season is one attraction, whichever
 *   parks it ran at and however much the builds differed. A name reused in
 *   another season is a different house.
 * - **Knott's:** a returning maze is the same maze — one record with an
 *   appearance per season, never a record per season. Two records with the
 *   same name are only different mazes when both debut years are known and
 *   differ (a reused title).
 *
 * Migration 0015 applies the same rules to stored data; this is the check
 * that keeps new data from breaking them.
 */

export interface IdentityCandidate {
  /** Absent for a record not created yet. */
  id?: string;
  hauntId: string;
  seasonId: string;
  name: string;
  debutYear?: number | null;
}

/**
 * Names compared for identity: surrounding spaces trimmed, runs of spaces
 * collapsed, ASCII lowercased — the harmless differences, and nothing else.
 * No fuzzy matching: "The Exorcist" and "The Exorcist: Believer" differ.
 */
export function identityName(name: string): string {
  return name
    .replace(/ {2,}/g, " ")
    .replace(/^ +| +$/g, "")
    .replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

/** The record `candidate` would duplicate, if any. */
export function findIdentityClash<T extends IdentityCandidate>(
  candidate: IdentityCandidate,
  others: readonly T[],
): T | null {
  const name = identityName(candidate.name);
  return (
    others.find((other) => {
      if (other.id !== undefined && other.id === candidate.id) {
        return false;
      }
      if (other.hauntId !== candidate.hauntId || identityName(other.name) !== name) {
        return false;
      }
      if (candidate.hauntId === "hhn") {
        return other.seasonId === candidate.seasonId;
      }
      const reusedTitle =
        candidate.debutYear != null &&
        other.debutYear != null &&
        candidate.debutYear !== other.debutYear;
      return !reusedTitle;
    }) ?? null
  );
}
