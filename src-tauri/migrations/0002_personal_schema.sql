-- Personal data: the user's own ratings, notes and manual ranking
-- preferences. Kept logically separate from archive facts
-- (0001_archive_schema.sql) — every table here only references an
-- attraction by id, so correcting or re-importing archive data never
-- deletes or overwrites a user's own reviews.

-- One rating per attraction. Theme/Fun/Fear are each 0-5 in 0.5
-- increments; `total` is a virtual generated column so it can never be
-- written directly — it is always Theme + Fun + Fear, never an
-- independently editable value. An attraction with no row here is
-- genuinely unrated, not rated zero.
CREATE TABLE user_ratings (
  id TEXT PRIMARY KEY,
  attraction_id TEXT NOT NULL UNIQUE REFERENCES attractions (id) ON DELETE CASCADE,
  theme REAL NOT NULL CHECK (theme >= 0 AND theme <= 5 AND theme = ROUND(theme * 2) / 2.0),
  fun REAL NOT NULL CHECK (fun >= 0 AND fun <= 5 AND fun = ROUND(fun * 2) / 2.0),
  fear REAL NOT NULL CHECK (fear >= 0 AND fear <= 5 AND fear = ROUND(fear * 2) / 2.0),
  total REAL GENERATED ALWAYS AS (theme + fun + fear) VIRTUAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- One free-text note per attraction.
CREATE TABLE user_notes (
  id TEXT PRIMARY KEY,
  attraction_id TEXT NOT NULL UNIQUE REFERENCES attractions (id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Manual ranking always takes precedence over the calculated (score-based)
-- ordering. `scope` is a free-form key identifying which list this
-- position applies to (e.g. "houses:all", "scare_zones:all",
-- "houses:year:2024"), so future filtered/year views can introduce new
-- scopes without a schema change. The repository layer is responsible for
-- keeping positions dense within a scope; this table only enforces that
-- an attraction has at most one position per scope.
CREATE TABLE user_rankings (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (scope, attraction_id)
);

CREATE INDEX idx_user_rankings_scope ON user_rankings (scope, position);

-- Generic local application settings as JSON-encoded values, so typed
-- settings can be layered on top without further schema changes.
CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
