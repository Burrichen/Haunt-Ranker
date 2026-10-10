/**
 * Shared shapes used across domain models (Attraction, Year, Ranking,
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

/**
 * Whether text holds anything a reader can see. `trim()` alone isn't enough:
 * a zero-width space (U+200B) or another format character survives it and
 * renders as nothing, which is how a scraped house once arrived nameless.
 */
export function hasVisibleText(value: string): boolean {
  return /[^\s\p{Cf}\p{Z}]/u.test(value);
}

/**
 * Zero-width characters a scrape can leave in a name: space, non-joiner,
 * joiner and the byte-order mark. An alternation rather than a character
 * class, because a joiner inside a class reads as a joined sequence.
 */
export const ZERO_WIDTH_PATTERN = "\u200b|\u200c|\u200d|\ufeff";
