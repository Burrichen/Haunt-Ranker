/**
 * What the archive already holds, as a pack import sees it.
 *
 * Plain rows rather than domain models: the planner compares column by
 * column against what a pack says, and a model would have to be unmapped
 * again to do that.
 */
export interface PackState {
  haunts: Map<string, Record<string, unknown>>;
  experienceTypes: Map<string, Record<string, unknown>>;
  venues: Map<string, Record<string, unknown>>;
  seasons: Map<string, Record<string, unknown>>;
  attractions: Map<string, Record<string, unknown>>;
  characters: Map<string, Record<string, unknown>>;
  sources: Map<string, Record<string, unknown>>;
  media: Map<string, Record<string, unknown>>;
  /** Keyed `attraction|related|type`. */
  relations: Map<string, Record<string, unknown>>;
  /** Keyed `attraction|venue`. */
  venueWiki: Map<string, Record<string, unknown>>;
  /** `attraction|venue` for every venue assignment. */
  attractionVenues: Set<string>;
  /** `attraction|season` for every recorded appearance. */
  appearances: Set<string>;
  /** `attraction|source`. */
  attractionSources: Set<string>;
  /** `season|source`. */
  seasonSources: Set<string>;
}

export function emptyPackState(): PackState {
  return {
    haunts: new Map(),
    experienceTypes: new Map(),
    venues: new Map(),
    seasons: new Map(),
    attractions: new Map(),
    characters: new Map(),
    sources: new Map(),
    media: new Map(),
    relations: new Map(),
    venueWiki: new Map(),
    attractionVenues: new Set(),
    appearances: new Set(),
    attractionSources: new Set(),
    seasonSources: new Set(),
  };
}

/** One pack import, as the archive remembers it. */
export interface PackImportRecord {
  id: string;
  packId: string;
  packVersion: string;
  schemaId: string;
  hauntId: string;
  hauntName: string;
  generatedAt: string | null;
  importedAt: string;
  /** The preview, as it read at the time. */
  summary: string;
  provenanceNotes: string | null;
}
