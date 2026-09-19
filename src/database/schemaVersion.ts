/**
 * The migration this build of the app expects the database to be at — i.e.
 * the number on the highest `src-tauri/migrations/NNNN_*.sql` file.
 *
 * `schemaVersion.test.ts` reads that directory and fails if this constant
 * drifts from it, so adding a migration without updating this is caught in
 * CI rather than by a backup that claims the wrong schema.
 */
export const SCHEMA_VERSION = 7;
