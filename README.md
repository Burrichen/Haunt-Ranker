# Haunt Ranker

A local-first Windows desktop app for browsing, reviewing and ranking Halloween
Horror Nights attractions — houses, scare zones, and years — built with
Tauri, React, TypeScript and SQLite.

This repository has the application shell, design system, a fully
migrated/tested SQLite data layer, and every browsing page built on top of
it — Home, Houses, Scare Zones, Attraction Wiki, Rankings, Years and
Statistics — plus a working review system (rate, edit, clear, notes — see
"Reviews" below), calculated and manual rankings (see "Rankings"), the year
archive and its statistics (see "Years"), a dashboard (see "Statistics
dashboard"), a generic ranking tool (see "Stats Explorer") and an opt-in
Admin Mode for editing the archive itself (see "Admin Mode"), and a complete
Settings page with a portable export/import backup (see "Settings and
backups"). It packages as a per-user Windows installer (see "Windows
release"), and carries the real Halloween Horror Nights dataset for 2010-2026
(see "The archive dataset"), validated but not yet imported by the app.

## Stack

- [Tauri 2](https://tauri.app/) — native shell, window, and (eventually) filesystem/SQLite access
- [React 19](https://react.dev/) + [React Router](https://reactrouter.com/) — UI and navigation
- [TypeScript](https://www.typescriptlang.org/) in strict mode
- [Vite](https://vite.dev/) — dev server and bundler
- [@tauri-apps/plugin-sql](https://v2.tauri.app/plugin/sql/) — SQLite access, with schema migrations
- [@tauri-apps/plugin-fs](https://v2.tauri.app/plugin/fs/) + [@tauri-apps/plugin-dialog](https://v2.tauri.app/plugin/dialog/) — managed local media files and backup files, always through a system dialog the user drives
- [@tauri-apps/plugin-opener](https://v2.tauri.app/plugin/opener/) — opens source URLs in the system's default browser instead of this window, never an in-app navigation to an external site
- [Recharts](https://recharts.org/) — the Statistics dashboard's two charts
- [lucide-react](https://lucide.dev/) — the app's one icon library (never emoji)
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) — tests
- ESLint + Prettier — linting and formatting

## Development commands

Run these from the repository root.

| Command                   | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `npm run tauri dev`       | Launch the app in development (native window + HMR)                 |
| `npm run dev`             | Run only the Vite dev server (frontend in a browser tab)            |
| `npm run build`           | Type-check and build the frontend for production                    |
| `npm run release:windows` | Build the distributable Windows installer (see "Windows release")   |
| `npm run typecheck`       | Type-check without emitting                                         |
| `npm run lint`            | Run ESLint                                                          |
| `npm run format`          | Format the codebase with Prettier                                   |
| `npm run format:check`    | Check formatting without writing                                    |
| `npm run test`            | Run the test suite once                                             |
| `npm run test:watch`      | Run tests in watch mode                                             |
| `npm run db:seed`         | Create the fictional dev sample dataset (see below)                 |
| `npm run db:clear`        | Remove the dev sample dataset                                       |
| `npm run db:reset`        | Clear then re-seed the dev sample dataset                           |
| `npm run data:validate`   | Validate data/hhn-archive.json and apply it to a throwaway database |
| `npm run data:import`     | Import the dataset into the app's real database                     |
| `npm run data:verify`     | Check the imported archive through the app's own browsing logic     |
| `npm run assets:icons`    | Regenerate the placeholder app icons                                |
| `npm run assets:fonts`    | Re-download the bundled Inter/Fraunces subsets                      |

### Requirements

- Node.js 22+ and npm
- Rust (stable) via [rustup](https://rustup.rs/)
- The [Tauri prerequisites](https://tauri.app/start/prerequisites/) for Windows (WebView2, MSVC Build Tools)

## Architecture

```
src/
  pages/         One component per top-level section (Home, Houses, Scare
                 Zones, Years, Rankings, Statistics, Settings, Admin Mode),
                 plus `AttractionWiki` (the `/attractions/:id` detail page
                 every attraction card/row links to — now a full article
                 page, see "Attraction Wiki" below) and `YearArchive` (the
                 `/years/:eventYearId` page, see "Years" below),
                 `AttractionEditor` (the admin form at
                 `/admin/attractions/new` and `/admin/attractions/:id`),
                 `YearEditor` (the admin form at `/admin/years/:id`, where an
                 event year gets its own sources and artwork — see "Sources
                 and media" below) and a real Settings page. A page composes components and talks
                 to repositories, never to the database directly. Admin Mode
                 only appears in the sidebar once it's switched on — see
                 "Admin Mode" below.
  components/
    ui/          The design system's foundational primitives — Button,
                 IconButton, Panel, Badge, Tooltip, Modal, Dropdown, Input,
                 Textarea, SearchInput, SegmentedControl, FilterChip,
                 ScoreMeter (the half-point 0–5 rating control, see
                 "Reviews" below), Toggle, EmptyState, LoadingState,
                 PageHeader. Every page is built from these; nothing
                 hard-codes colors, spacing or radii outside this layer and
                 `styles/tokens.css`.
    admin/       Editing UI, only reachable with Admin Mode on —
                 `AttractionForm` (the core record), the character and
                 relation sub-editors, `SourceManager`/`MediaManager` (the
                 provenance editors both the attraction and the year editor
                 mount — see "Sources and media" below), and `ConfirmDialog`,
                 the gate in front of anything irreversible. See "Admin Mode"
                 below.
    layout/      The persistent app shell: `Sidebar` (brand, primary nav,
                 Settings pinned at the bottom) and `AppShell` (renders the
                 sidebar beside the routed page via React Router's
                 `<Outlet>`).
    atmosphere/  `Atmosphere` — the decorative background layer (corner
                 glow, stars, a treeline silhouette, tiny bats). Purely
                 CSS/SVG, `aria-hidden`, `pointer-events: none`, and reads
                 `useAmbientEffectsPreference`, which Settings → Appearance
                 now controls.
    archive/     `ArchiveCard` — a poster-style card for one attraction
                 (artwork-or-fallback, name, year, type badge, IP badge,
                 rating summary/"Not Rated", park icons; always links to
                 its wiki page), `ParkBadgeRow`/`PARK_ICONS` (Star for
                 Hollywood, Palmtree for Orlando — professional icons, no
                 emoji), and `AttractionPreviewCard`/`AttractionHoverPreview`
                 (a compact reusable attraction summary card, and a hover-
                 delay wrapper that floats one beside any trigger — see
                 "Attraction Wiki" below). Shared by Home's spotlight, the
                 attraction browser and the wiki page.
    attractionBrowser/  `AttractionBrowser` — the shared search/filter/
                 sort/view-mode browsing UI Houses and Scare Zones are
                 both built from (see "Attraction browser" below), plus
                 its `FilterBar`, `SortMenu` and `AttractionRow` (the
                 compact-view row) pieces.
    rankings/    The Rankings page's pieces — `RankingList` (the ordered
                 list, and the drag-and-drop), `RankingRow` (one compact
                 entry), `RankingFilterBar`, `RankingSortMenu` and
                 `RankingSection` (the collapsed Unrated / Not-yet-placed
                 lists). See "Rankings" below.
    years/       The Years pages' pieces — `YearCard` (one year on the
                 overview), `YearHeader`, `YearStatsPanel` (averages and
                 the eight highlights, or the "not enough data" message)
                 and `YearRankingList`. See "Years" below.
    statistics/  Both statistics views' pieces — `StatisticsFacets` (the
                 four filters they share), `StatisticsFilterBar`,
                 `HighlightCards`, `YearPerformanceChart`,
                 `ScoreDistributionChart`, `CoveragePanel`,
                 `TopAttractionsList`, plus `chartTheme`/`ChartTooltip` (the
                 shared chart chrome) and the explorer's `ExplorerControls`,
                 `ExplorerAttractionTable` and `ExplorerYearTable`. See
                 "Statistics dashboard" and "Stats Explorer" below.
    wiki/        `AttractionWiki`'s pieces — `WikiHeader`, `WikiSection`
                 (the "only render if there's data" article section
                 wrapper), `DetailsPanel` (the compact infobox), `SourceList`
                 (safe external opening), `RelatedAttractions`,
                 `CharacterGrid`, `MediaGallery`, `MyReview` (the
                 clearly-separate personal panel) and `ReviewEditor` (its
                 explicit Save/Cancel editor). See "Attraction Wiki" and
                 "Reviews" below.
    settings/    The Settings page's panels — `AppearanceSettings`,
                 `DataSettings` (export/import, and what's stored now),
                 `ImportPreviewDialog` (the comparison shown before anything
                 is replaced), `SampleDataSettings` (development builds
                 only) and `AboutSettings`. See "Settings and backups"
                 below.
  models/        Domain types for every entity (EventYear, Attraction,
                 Character, AttractionRelation, Source, Media, Rating,
                 Note, RankingEntry, Setting, Park) plus their Create/Input
                 shapes, `backup.ts` (the backup file's own shape) and
                 `archiveDataset.ts` (the real-data import format's shape and
                 its `ARCHIVE_FORMAT_VERSION`). Pure types — no SQL, no React.
  database/      `client.ts` (the lazy Tauri SQL connection), `types.ts`
                 (the `SqlExecutor` contract repositories depend on instead
                 of the concrete driver), `errors.ts` (typed
                 `DatabaseError`/`ConstraintViolationError`/`NotFoundError`,
                 so callers can branch on constraint kind instead of
                 parsing driver strings), `nodeSqliteExecutor.ts` (a
                 Node-only `SqlExecutor` used by tests and the `db:*`
                 scripts, never by the app bundle), and
                 `devSampleData.ts` — the **fictional dev sample dataset**,
                 see below — plus `schemaVersion.ts`, the migration number
                 this build expects (kept honest by a test that reads the
                 migrations directory). Schema migrations themselves live in
                 `src-tauri/migrations/*.sql`, not here — see below.
  archive/       The real-data contract: `archiveTables.ts` (which tables a
                 dataset may touch and which are the user's alone),
                 `validateDataset.ts` (the format's validator),
                 `importOperations.ts` (planning every write, and how to undo
                 it) and `importDataset.ts` (preview and apply). See "The real
                 data contract" below.
  backup/        The portable backup: `backupTables.ts` (one description of
                 every backed-up table, shared by the validator and the
                 SQL), `backupFormat.ts` (validate, upgrade, summarize,
                 serialize — all pure), `importBackup.ts` (snapshot, replace,
                 and put it back if that fails) and `backupFiles.ts` (the
                 save/open dialogs and the safety copy). See "Settings and
                 backups" below.
  preferences/   `localPreferences.ts` — the localStorage preference keys,
                 their allowed values, and which of them a backup carries.
                 One place, so the hooks and the backup can't disagree.
  repositories/  One module per entity (`eventYearRepository.ts`,
                 `attractionRepository.ts`, `ratingRepository.ts`, ...),
                 each a `createXRepository(db: SqlExecutor)` factory
                 returning strongly-typed CRUD/query methods. Components
                 must go through these — never raw SQL. `types.ts` defines
                 the shared `Repository<T, TInput>` shape most of them
                 implement. `backupRepository.ts` is the exception that
                 spans them all: it reads and replaces every backed-up
                 table, for export and import.
  hooks/         Application-level React hooks: `useAmbientEffectsPreference`,
                 `useArchiveOverview` (Home's summary counts and spotlight),
                 `useAttractionBrowser` (Houses/Scare Zones' data + URL-backed
                 filter/sort state — see "Attraction browser" below),
                 `useAttractionViewMode` (the saved card/compact preference),
                 and `useAttractionWiki` (everything one attraction's wiki
                 page needs, including resolved related-attraction data and
                 the save/clear review mutations — see "Attraction Wiki"
                 and "Reviews" below), `useRankings` (a ranking group's
                 data, its URL-backed group/mode/filter/sort state, and
                 every write to the saved manual order — see "Rankings"
                 below), `useYearsOverview`/`useYearArchive` (the year
                 list with its summaries, and one year with its statistics
                 — see "Years" below), `useArchiveRows` (the whole archive
                 as one flat row per attraction, shared by both statistics
                 views so they can't join the data differently),
                 `useStatistics` (the dashboard's slice and every figure
                 derived from it), `useStatisticsExplorer` (the generic
                 query — see "Statistics dashboard" and "Stats Explorer"
                 below), `useAdminMode` (the persisted editing preference),
                 and `useAdminArchive`/`useAttractionEditor`/`useYearEditor`
                 (the admin console's, the attraction editor's and the year
                 editor's data and writes — see "Admin Mode" and "Sources and
                 media" below), `useMotionPreference` (System / Reduce /
                 Full, published as `data-reduce-motion` for CSS to act on),
                 `useBackup` (export, validate, preview, import) and
                 `useSampleData` (the development-only sample dataset
                 controls) — see "Settings and backups" below.
  utils/         Small framework-agnostic helpers: `cn` for class name
                 composition, `pickRandomSample` for Home's spotlight pick,
                 `formatDisplayDate` for the Details panel's date fields,
                 `formatScore` for rating values and totals (always one
                 decimal), `attractionBrowser.ts`/
                 `attractionBrowserParams.ts` — the browser's filter/sort
                 logic and URL (de)serialization — `rankings.ts`/
                 `rankingsParams.ts`, the calculated/manual ordering rules
                 and their URL state, `years.ts`/`yearsParams.ts`, the year
                 statistics (averages, highlights, the minimum sample size)
                 and the year ranking, `statistics.ts`/
                 `statisticsParams.ts`, every dashboard figure and its URL
                 state, `statisticsExplorer.ts`, the generic ranking query
                 behind the explorer, and `attractionMetrics.ts`, the shared
                 "extreme of a metric, ties broken by name" helper the year
                 superlatives
                 and dashboard highlights both use. All kept as pure
                 functions specifically so they're unit-testable without
                 rendering anything.
  version.ts     The app's version, injected from package.json at build time
                 (see `define` in vite.config.ts) — shown in About and
                 stamped into every backup file.
  media/         `mediaFiles.ts` — everything to do with image files on
                 disk: importing a user-chosen file by **copying** it into
                 the app's own data directory under a collision-safe name,
                 resolving a media row to something the webview can display
                 (a remote URL, or a managed local file via
                 `convertFileSrc`), and deleting a managed file when its row
                 goes. The only module that touches the filesystem. See
                 "Sources and media" below.
  styles/        Design tokens (`tokens.css`), global base styles
                 (`global.css`) and `fonts.css` — the @font-face rules for
                 the bundled typefaces, generated by scripts/fetch-fonts.mjs.
                 Components define their own scoped CSS files alongside them
                 and consume the tokens.
  test/          Shared test setup (`setup.ts`), a real-SQLite test
                 database (`createTestDatabase.ts` — in-memory by default,
                 plus `openTestDatabaseFile` for the file-backed
                 close-and-reopen persistence tests, and
                 `createTestDatabaseAtVersion` for testing a migration's
                 upgrade path against already-populated data) and shared
                 repository test fixtures (`fixtures.ts`).
  assets/        Static images/icons used by the UI.

public/          Copied into the build verbatim: the window/tab icon, and
                 `fonts/` — the Inter and Fraunces subsets the app ships
                 with, and their SIL Open Font License texts. See "Windows
                 release" below for why they are bundled rather than fetched.

src-tauri/
  migrations/    The schema, as plain numbered `.sql` files — the single
                 source of truth, read by both the Rust app
                 (`include_str!`, registered in `src/lib.rs`) and the test
                 database above. See "Persistence" below.
  src/           Native shell: window/plugin setup (`lib.rs`, `main.rs`).
  icons/         The application icons, generated from `source-icon.png`
                 (see "Windows release" below).
  tauri.conf.json, capabilities/  Window and bundle configuration, and the
                 permission grants the webview runs under.

docs/            `archive-dataset-format.md`, the specification real archive
                 data is entered against, and `examples/` — a dataset the test
                 suite validates, so the documentation can't drift from the
                 validator.

scripts/
  dev-db.ts      The `db:seed` / `db:clear` / `db:reset` CLI — connects to
                 the app's real on-disk database (never a test one) to
                 manage the fictional dev sample dataset. Run via `tsx`.
  make-placeholder-icon.mjs  Draws the placeholder application icon —
                 a lit doorway, in the app's own palette, containing no
                 Halloween Horror Nights artwork. `npm run assets:icons`.
  fetch-fonts.mjs  Downloads the bundled font subsets and writes
                 `src/styles/fonts.css`. `npm run assets:fonts`.
```

Data flow is one-directional and layered: **pages → components → hooks →
repositories → database**. Components never import `@tauri-apps/plugin-sql`
or write SQL directly; they go through a repository, so the persistence
layer can change without touching the UI.

### Design system

Haunt Ranker has one permanent visual identity — a near-black, warm
"premium archive" look — rather than a light/dark toggle. `src/styles/
tokens.css` defines every color, spacing, radius, shadow and animation-speed
variable; `src/components/ui/` and `src/components/layout/` consume them
exclusively rather than hard-coding values, so a token change propagates
everywhere. Headings and the sidebar brand use the display serif
(`--font-display`, Fraunces); everything else uses the sans-serif
(`--font-sans`, Inter). See `src/components/atmosphere/Atmosphere.css` for a
worked note on which CSS effects are safe to use for large decorative
regions (short version: avoid `radial-gradient` and blur spanning most of
the viewport — small blurred elements are fine, but on at least one
WebView2/GPU combination we've tested, a full-viewport gradient or blurred
shadow rasterizes as corrupted jagged shapes instead of a smooth fade).

### Persistence

**Schema.** The database is defined by three numbered SQL migration files
in `src-tauri/migrations/`, run automatically (via `tauri-plugin-sql` /
sqlx's migrator) the first time the app opens its connection:

- `0001_archive_schema.sql` — **archive data**: facts about attractions
  (`event_years`, `parks`, `attractions`, `attraction_parks`, `characters`,
  `attraction_relations`, `sources`, `attraction_sources`, `media`). Most
  descriptive columns are nullable — an unknown fact is `NULL`, never a
  placeholder.
- `0002_personal_schema.sql` — **personal data**: the user's own
  `user_ratings`, `user_notes`, `user_rankings` and `user_settings`. Every
  table here only references an attraction by id, so re-importing or
  correcting archive facts never touches a user's own reviews. Ratings
  store `total` as a SQLite generated column (`theme + fun + fear`) — the
  database itself rejects any attempt to write `total` directly.
- `0003_seed_reference_data.sql` — seeds the two fixed `parks` rows
  (Hollywood, Orlando; idempotent `INSERT OR IGNORE`).
- `0004_add_sample_data_flag.sql` — adds an `is_sample` column to
  `event_years`, `attractions` and `sources`, so fictional dev/sample rows
  (see "Development sample data" below) can be told apart from real
  imported data and removed cleanly.

An attraction can belong to Hollywood, Orlando, or both via the
`attraction_parks` join table — a real many-to-many relationship, not a
string field. Manual ranking order lives in `user_rankings`, keyed by a
free-form `scope` string (see `src/models/ranking.ts`'s `allTimeScope`/
`yearScope` helpers) so it always overrides the calculated (score-based)
order and can extend to filtered/year views without a schema change.

**Connecting to it.** `src/database/client.ts`'s `getDatabase()` lazily
opens the same connection every repository shares. Repositories depend
only on the `SqlExecutor` interface (`src/database/types.ts`) — `execute`/
`select`, mirroring `@tauri-apps/plugin-sql`'s `Database` class exactly —
never on the concrete Tauri plugin. That's what makes the test setup below
possible, and is also why `getDatabase()` can be swapped for a different
driver later without touching a single repository.

**Errors.** Driver errors are never allowed to reach a caller raw.
`src/database/errors.ts` translates them into `ConstraintViolationError`
(with a `constraint: "check" | "unique" | "foreign_key" | "not_null"`),
`NotFoundError`, or a generic `DatabaseError` — so UI code can branch on
what went wrong instead of parsing SQLite's error text.

**Testing against real SQL.** Repository tests don't mock the database —
`src/test/createTestDatabase.ts` spins up an in-memory database via
Node's built-in `node:sqlite` and runs the exact same migration files the
real app runs, so tests exercise real CHECK constraints, foreign keys and
the generated `total` column. Because that pulls in Node built-ins,
repository test files need `// @vitest-environment node` as their first
line (the project's default test environment is `jsdom`, for component
tests). `src/test/fixtures.ts` has shared helpers (`createFixtureEventYear`,
`createFixtureAttraction`) for the boilerplate most repository tests need.

### Development sample data

> **Everything this creates is 100% fictional** — invented houses, scare
> zones, event years, characters and sources (Moonlight Manor, Pumpkin
> Pier, Radioactive Crypt, Midnight Carnival, Graveyard Radio, ...), never
> real Halloween Horror Nights facts. It exists purely so the UI can be
> built and tested against realistic-looking records before any real data
> is imported.

Every row it creates is marked `is_sample = 1` (the column migration 0004
adds), which is what makes it possible to identify and delete cleanly:

```
npm run db:seed    # create the fictional sample dataset
npm run db:clear   # remove it — leaves everything else untouched
npm run db:reset   # clear then re-create it; safe to run repeatedly
```

These require the app to have been launched at least once already (`npm
run tauri dev`), so its migrations have created the schema — the script
deliberately never runs migrations itself, to avoid ever conflicting with
the Tauri app's own migration bookkeeping. It edits the real app database
directly (resolved from `%APPDATA%\<tauri identifier>\haunt-ranker.db`, or
`HAUNT_RANKER_DB_PATH` to override), never a test database.

The dataset (`src/database/devSampleData.ts`) deliberately covers every
combination the UI needs: 3 fictional "Shadowfest" event years; 4 houses
and 3 scare zones; Hollywood-only, Orlando-only and dual-park attractions;
original and fictional-licensed IP; rated and genuinely-unrated
attractions; attractions with and without characters, sources and media;
and related-attraction examples covering all four relation types. Media
rows point at `example.invalid` (an RFC 2606 domain that never resolves)
with an explicit `licenseNotes` saying it's a placeholder — never treat
sample media as a real, legally-bundled asset.

`seedDevSampleData`/`clearDevSampleData`/`resetDevSampleData` are ordinary
exported functions (not just CLI-only) — `src/database/devSampleData.test.ts`
calls them directly against the Vitest test database to validate
repository queries (filtering by type/year/park, characters, sources,
media, relations, ratings-vs-unrated, and manual ranking override) against
this dataset.

Before importing real data, run `npm run db:clear` first.

### Home page

Home (`src/pages/Home.tsx`) is the archive's entrance, not the Statistics
dashboard — it deliberately stays light on data. `useArchiveOverview`
(`src/hooks/`) loads everything it needs in one pass: total/house/scare-zone/
reviewed counts, and a spotlight of up to 6 random attractions. The
spotlight is picked once per mount (`pickRandomSample`, in a `useEffect`
with an empty dependency array) — it does not reshuffle while the page
stays open, per spec.

Each spotlight attraction renders as an `ArchiveCard`
(`src/components/archive/`): real poster artwork when a `Media` row has a
loadable `url`, or an elegant CSS-only fallback (name, year, type badge,
park icons) otherwise — including when the URL exists but the image
itself fails to load (`onError` swaps to the fallback), which is exactly
what happens with the dev sample dataset's intentionally-`.invalid` media
URLs. The fallback is a UI treatment only; nothing here ever generates or
fetches placeholder artwork.

### Attraction browser

Houses and Scare Zones (`src/pages/Houses.tsx` / `ScareZones.tsx`) are both
a `PageHeader` plus one shared component, `<AttractionBrowser
attractionType="house" | "scare_zone" />` — there is no separate
implementation per type. Everything type-specific is just that one prop;
adding a third browsable attraction type would mean adding a value to
`AttractionType`, not building a new browser.

**Data.** `useAttractionBrowser` loads every attraction of that type once
(via `attractionRepo.getByType`), plus every event year, media row, rating
and the type's manual ranking (`allTimeScope`) in parallel, and joins them
client-side into `AttractionBrowserRow[]`. Filtering/sorting/searching then
all happen in memory (`src/utils/attractionBrowser.ts`) — deliberately no
server-side pagination or virtualization, since even "hundreds of records"
is trivial for a client-side array filter/sort; that's the "avoid premature
complexity" call, revisit only if a real dataset proves it wrong.

**Filter/sort state lives in the URL**, not component state —
`useSearchParams` + `src/utils/attractionBrowserParams.ts`
(parse/serialize, both pure and unit-tested). That's what makes "open an
attraction, then go back" restore exactly where you were: React Router
remounts the page from the restored URL on back-navigation, and the hook
just re-derives filters/sort from `searchParams` on mount. **View mode**
(card vs. compact) is deliberately _not_ in the URL — `useAttractionViewMode`
persists it to localStorage under one shared key, so it's a single
cross-page preference rather than per-route state.

**Sorting an unrated attraction never treats it as a 0.** Every
score-based sort (`total`/`theme`/`fun`/`fear`, either direction) uses a
comparator where a missing rating always sorts after a present one,
regardless of direction — see `compareNullable` in
`attractionBrowser.ts` and its dedicated tests. The same rule applies to
`rankingPosition` for the "Personal Ranking" sort, which only appears in
the sort menu once a manual ranking actually exists for that type.

**Cards vs. rows.** Card view reuses `ArchiveCard` (the same component
Home uses, now with the rating/IP badges and park icons filled in from
real per-attraction data instead of Home's lighter spotlight version).
Compact view is `AttractionRow` — a single-line, no-artwork layout for
scanning many records quickly. Both link to `/attractions/:id`
(`AttractionWiki` — see "Attraction Wiki" below).

**Park icons** are `Star` (Hollywood) and `Palmtree` (Orlando) from
lucide-react — professional, non-emoji icons, never a raw map-pin-plus-text
label. They use the native `title` attribute rather than the app's own
`Tooltip` primitive on purpose: a card grid can have hundreds of these
icons on screen at once, and `title` needs no per-instance React state or
event listeners to still explain each icon on hover and to assistive tech.

### Attraction Wiki

`AttractionWiki` (`src/pages/AttractionWiki.tsx`) is the full detail page
every attraction card/row links to. `useAttractionWiki` (`src/hooks/`)
loads the attraction plus its event year, media, characters, sources,
personal rating, and (for every `AttractionRelation` it's part of) enough
of the related attraction's data to render a preview card.

**Only sections with data render.** `WikiSection` (`src/components/wiki/`)
is a plain wrapper — the page itself decides whether Overview, Story/Lore,
Experience, Characters/Creatures, Development, Event Details, Related
Attractions, Media and Sources have anything to show, and skips the ones
that don't. There is no "Unknown" placeholder state; an attraction with
only a name and a year renders a short page, not a form full of blanks.

**Header vs. Details panel.** `WikiHeader` is the identity block — real
artwork (or the same never-fabricated fallback treatment as `ArchiveCard`),
name, event year, type, IP classification, franchise and park icons.
`DetailsPanel` is the compact sidebar infobox — Event/Year/Type/Park(s)/
Classification/Franchise/Location/Opening/Closing/Related attractions,
each field rendered only when present. The **Media** article section
excludes whichever item was already used as the header's hero image, so
a single-poster attraction doesn't show that same image twice.

**Sources open externally, safely.** `SourceList` opens a source's URL via
`@tauri-apps/plugin-opener`'s `openUrl` rather than an `<a href>` or
in-app navigation — the app never loads an arbitrary external site inside
its own webview, it hands the URL to the system's default browser. A
YouTube source is identified by its visible "YouTube" label rather than a
brand icon; lucide-react dropped brand/wordmark icons, so there's no
built-in YouTube glyph to use.

**My Review is a clearly separate personal panel** (`MyReview`) — never
mixed into the factual sections above it. It shows the saved scores and
note, and owns the entry points into the editor — see "Reviews" below.

**`AttractionPreviewCard` and `AttractionHoverPreview`**
(`src/components/archive/`) are reusable infrastructure, not
wiki-page-specific: a compact name/year/park/type/Theme-Fun-Fear-Total/IP
card, and a wrapper that floats one beside any trigger element after a
400ms hover/focus delay (so a pointer merely passing over something never
flashes a popup), always clicking through to the same destination as the
trigger. The wiki page uses both today — `RelatedAttractions` renders full
cards, `DetailsPanel`'s compact related-attractions list uses the hover
wrapper around plain text links — and they're built to be dropped onto
other attraction references (e.g. Rankings) later without changes.

### Reviews

A review is three dimensions — **Theme**, **Fun** and **Fear** — each 0–5 in
half-point steps, plus an optional free-text note. The **total is always
Theme + Fun + Fear out of 15** (`13.0 / 15`) and is never editable
anywhere: the database stores it as a generated column that rejects direct
writes, and the UI has no control for it.

**The scoring control is `ScoreMeter`** (`src/components/ui/`), deliberately
not a five-star widget — half-steps across three dimensions have to be
readable at a glance, and half-filled stars aren't. It renders as a
segmented meter: a zero stop, then ten half-point segments grouped in
pairs, so five whole points each visibly split in half. Under the hood it's
a `radiogroup` over the eleven valid values rather than an ARIA slider,
because the values are discrete and every stop — including 0 — then gets
its own click target and accessible name. Keyboard: arrows step a half
point, PageUp/PageDown a whole point, Home/End jump to 0/5. Dragging across
the track works too, and can't save anything on its own (see below). The
same component renders the read-only display in the sidebar, so the saved
and editable views can't drift apart visually.

**Editing is an explicit Save/Cancel flow** in `ReviewEditor`, opened as a
modal so three meters and a real notes field get room the 300px sidebar
can't give them. Moving a meter only changes local draft state — nothing
reaches SQLite until Save — so there is no way to accidentally persist a
score mid-drag. Every exit path that would lose edits (Cancel, Escape,
clicking the overlay) is intercepted while the draft is dirty and asks
first; a failed save keeps the dialog open with the user's input intact
rather than discarding it. The editor is mounted only while open, so its
draft starts from the saved values each time without a syncing effect.

**Unrated is a real state, not a zero.** An attraction with no
`user_ratings` row is genuinely unrated: the panel says "Not Rated" and
offers `Rate this attraction`. Nothing in the app ever creates a
zero-valued rating on its own — a 0/0/0 review only exists if someone
opened the editor and saved it, which is a legitimate score. Once a rating
exists the panel offers `Edit Review` and `Clear Rating`; clearing deletes
the row (after a confirmation) so the attraction returns to genuinely
unrated. Clearing deliberately **keeps the note** — a score being wrong
isn't a request to throw away the user's writing.

**Validation lives at both boundaries.** `RatingRepository.upsert` rejects
anything that isn't 0–5 in 0.5 steps (including `NaN`/`Infinity`) with a
`ConstraintViolationError` before touching SQL, and the table's own CHECK
constraints reject it again independently — `ratingRepository.test.ts`
proves both, by going through the repository and by bypassing it with raw
SQL.

**Persistence is tested against a real file, not just a live connection.**
`reviewPersistence.test.ts` writes a review, _closes the database
connection entirely_, reopens the same file, and reads it back — the
closest a test can get to quitting and relaunching the app. It covers a
saved review, an edited one, and a cleared one (which must stay cleared).
`openTestDatabaseFile` in `src/test/createTestDatabase.ts` is the helper
for that; reopening passes `migrate: false`, since the migration files use
plain `CREATE TABLE` and would fail a second time against the same file.

### Rankings

The Rankings page (`src/pages/Rankings.tsx`) holds two separate ideas of
order, and the product rule is that the user's own wins.

**Calculated ranking** is derived from the saved scores: total high → low
by default, with ties broken by name A–Z so the list is stable rather than
dependent on load order. That tie-break is determinism, not an extra rating
criterion — nothing else feeds the order. Outside manual mode the list can
also be viewed by Theme, Fun or Fear, each in both directions. **Those
sorts are a view, never a write** — sorting cannot touch a saved manual
ranking.

**My Ranking** is the user's own drag-and-drop order, stored in
`user_rankings` under a per-group scope. It takes precedence in the literal
sense: once a group has a saved order, **manual is the mode the page opens
in**, and the calculated view becomes the opt-in one — with a notice saying
the saved ranking is still there and untouched. A score change reorders the
calculated view and never the manual one; `Reset to Calculated Ranking`
(behind a confirmation) is the only thing that deletes it.

**Three groups** — Houses, Scare Zones and All Attractions — each keep an
independent manual order. Houses and Scare Zones deliberately resolve to
the same scopes as `allTimeScope`, so an order made here is the same one
the attraction browser's "Personal Ranking" sort reads.

**Unrated attractions are never mixed into the ranking**, and never scored
as zero. They sit in their own collapsed section with a count, alongside a
second section for attractions rated _after_ the ranking was saved — those
are listed as "Not yet placed" with an `Add to ranking` button rather than
being silently appended, so a new attraction never looks like the user
deliberately ranked it last. (A deliberate 0/0/0 review is a real score and
does rank; only the absence of a rating is excluded.)

**Reordering under a filter is safe.** The list can be filtered by year,
type (on All Attractions), park and Original/Licensed IP while still being
reorderable, so `applyVisibleOrder` drops the visible rows back into the
slots they already occupied and leaves every hidden row's absolute position
alone. Saving just the visible ids instead would quietly delete the rest of
the ranking — there's a test for exactly that. Before anything is saved,
the order a drag is applied against is the calculated order over _every_
row, not just the visible ones, for the same reason.

**Reordering is offered two ways**: dragging a row, and per-row up/down
buttons so the ranking is reorderable from the keyboard. Both funnel into
one `reorder(from, to)`. Rows are compact — position, name, year, park
icons, the per-dimension breakdown (dropped on narrow windows) and the
total — hovering anywhere on one shows the shared `AttractionPreviewCard`,
and the row body links through to the wiki article.

Group, mode, filters and sort all live in the URL, like the attraction
browser, so leaving for a wiki article and coming back restores the view.
`rankingPersistence.test.ts` covers the rest by closing and reopening the
database file: an order survives a restart, survives the scores under it
changing, stays cleared once reset, and stays independent per group.

### Years

`/years` is the event archive; `/years/:eventYearId` is one event's page.
Both are built on `src/utils/years.ts`, where every statistic is computed.

**Statistics come from reviewed records only, and the app says when it
doesn't have enough.** An unrated attraction is excluded from a year's
averages rather than counted as a zero that drags the mean down — there's a
test asserting exactly that arithmetic. Below `MIN_REVIEWED_FOR_STATS`
reviewed attractions a year reports no averages and no highlights at all,
and the UI says so in words instead of printing a number. The threshold is
deliberately a flat minimum, not a confidence weighting: with a single
review there is nothing to average against, and "Highest Rated" and "Lowest
Rated" would name the same attraction. Above it, the raw mean is shown
**next to its sample size**, everywhere it appears, so the reader can judge
it.

**Year cards** show the event name and year, real artwork when the year has
some on file (a plain fallback otherwise — never a generated stand-in), the
house/scare-zone/reviewed counts, and the average total or a "Not enough
reviews" badge.

**The year page** is the header (artwork, name, counts, description if
there is one), the statistics panel, then Houses and Scare Zones as
`ArchiveCard` grids — the same card Home and the attraction browser use.
The statistics panel names eight highlights — Highest/Lowest Rated, Best/
Lowest Theme, Most/Least Fun, Scariest/Least Scary — each linking to its
wiki article and showing the shared `AttractionPreviewCard` on hover, like
every other attraction reference in the app. Ties are broken by name so the
same attraction is named every time rather than whichever loaded first.

**Year Rankings** is a view on the same page (`?view=rankings`), ordering
years by average Total, Theme, Fun or Fear in either direction. Every row
carries its sample size, and **years below the threshold are listed below
the ranking rather than inside it** — a year averaging a perfect 15 off one
review would otherwise sit above a fully reviewed one as though the two
numbers meant the same thing. There's a test for that case specifically.
Narrow windows drop the metrics the list isn't ordered by; the sample size
stays, because an average without it is the misleading half.

### Statistics dashboard

`/statistics` derives everything from one filtered slice, computed in
`src/utils/statistics.ts`. Reviewed entries only, everywhere — an unrated
attraction is never the least scary thing in the archive, it's unknown.

**One filter row scopes the whole page.** Year, Houses/Scare Zones, park and
Original/Licensed are single-select facets, and the **metric lives in that
same row** rather than inside a chart card, because the year chart and the
Top 10 both read it — the page can't disagree with itself about what it's
showing. All of it lives in the URL.

**Highlight cards** are four stat tiles with a Best/Lowest toggle rather
than eight tiles competing at once. Lowest mode flips the same four metrics
to their other end (Lowest Rated, Least Scary, Least Fun, Lowest Theme).
Ties break by name, using the same `pickExtreme` helper the year archive's
superlatives use, so the two features can't disagree about who won.

**Chart rules.** Both charts plot a single series, so there is exactly one
mark colour and no legend — the panel title says what's plotted. That colour
is the existing orange token, checked against the panel surface for contrast
and lightness rather than picked by eye. Grid and axes are solid recessive
hairlines (never dashed); bars cap at 24px with a 4px rounded top and square
base; line markers carry a 2px ring in the surface colour so they stay
legible on the line. No gradients, no 3D, no chart junk — and no large
gradient regions, which this WebView2 build renders badly anyway.

**Values are never hover-only.** The distribution labels each of its five
bars on the cap; the year chart states its best year in a line of text below
the plot; the axes and the Top 10 carry the rest. Tooltips lead with the
value and follow with the label, and the year tooltip names the sample size
behind each average.

**`computeYearPerformance` omits years with nothing reviewed** rather than
plotting them at zero — a dip to the axis would read as "this event scored
nothing" when the truth is that nobody has reviewed it. The distribution
buckets total scores into five half-open bands across 0–15, with the top
band closing on 15 so a perfect score has a home.

**Review coverage** is the honest denominator behind the rest of the page:
reviewed out of total, overall and per type, as plain meters whose unfilled
track is a lighter step of the fill's own hue. Every empty and low-data
state says what's missing in words instead of rendering a blank plot.

### Stats Explorer

The second view on `/statistics` (`?view=explorer`) is a generic ranking
tool rather than another set of cards. Its whole job is that questions the
dashboard doesn't have a card for can still be answered.

**Nothing is special-cased per question.** `runAttractionQuery` in
`src/utils/statisticsExplorer.ts` takes one struct — filters, metric,
direction, reviewed-only — and every example the feature is meant to
support is that struct with different values:

| Question                     | The query                                 |
| ---------------------------- | ----------------------------------------- |
| Scariest attractions ever    | Fear · Highest→Lowest                     |
| Least scary Houses           | Fear · Lowest→Highest · type = Houses     |
| Most fun Scare Zones         | Fun · Highest→Lowest · type = Scare Zones |
| Lowest Theme scores          | Theme · Lowest→Highest                    |
| Highest scoring in a year    | Total · Highest→Lowest · year = N         |
| Most fun Orlando attractions | Fun · Highest→Lowest · park = Orlando     |
| Best-scoring Originals       | Total · Highest→Lowest · IP = Original    |

`statisticsExplorer.test.ts` asserts each of those rows, plus combinations
nobody listed (all four facets at once, a combination matching nothing, a
slice that matches attractions but nothing reviewed) — the point being that
they all fall out of the same code path.

**The explorer shares the dashboard's filter state**, so switching views
keeps the slice you were looking at, and a particular question is a URL you
can come back to. Results are a table: rank, attraction, year, park icons,
the ranked metric, and the total beside it whenever the metric isn't
already the total. Hovering an attraction shows the shared
`AttractionPreviewCard`; clicking opens its wiki article.

**Unrated matches are never ranked** — a missing score isn't a low one. They
are hidden by default (a ranking question is about reviewed entries) and,
when shown, follow the ranking in their own labelled block with no rank
number rather than being mixed into it.

**Year mode** ranks event years by the average of the chosen metric across
their reviewed attractions, respecting the same filters — so "average fear
of Hollywood houses, by year" is just two facets and a subject switch. Every
row carries its review count in its own column. Note the deliberate
difference from the Years page: that page _withholds_ thinly-reviewed years
from its ranking, while the explorer shows them with the sample size
attached. The Years page is the curated presentation; the explorer is the
tool for looking at the raw answer, and the count is what makes it readable.

### Admin Mode

The archive is read-only until someone says otherwise. **Admin Mode is a
Settings toggle (`useAdminMode`), off by default**, and off again on any
storage read failure — the safe direction. While it's off, the sidebar has
no Admin entry, the wiki page has no edit control, and the admin routes
themselves say the archive is read-only rather than rendering a form.

**It gates controls; it does not gate validity.** The rules live in the
repositories — an attraction needs a name, an event year and at least one
park; an event year needs a name and a whole calendar year in a plausible
range. Everything else is optional, because an archive is built from partial
knowledge and a half-documented attraction is still worth recording. Admin
forms check the same things for the sake of good messages, but they have no
privileged path: `attractionRepository.setParks(id, [])` is rejected too, so
the last park can't be stripped by going around `update`.

**`/admin`** lists event years and attractions with Add House / Add Scare
Zone, edit and delete. **`/admin/attractions/:id`** is the editor: type,
year, name, variant, parks, Original/Licensed, franchise, every wiki field,
location and opening/closing, plus four sub-record editors — characters,
related attractions, sources and media metadata. Sub-records save on add and
remove rather than being staged with the main form: they're separate rows in
separate tables, and pretending otherwise would mean inventing a transaction
the repositories don't offer. A new attraction therefore shows the core form
first and its sub-editors once saved.

**One record or two is the user's call.** Parks is a multi-select, so a
single record covers an attraction that ran at both parks as essentially the
same thing; a substantially different version is a second record, and
`variantName` exists to tell them apart. **Nothing is merged automatically,
and nothing is matched on names.**

**Destructive actions spell out what they destroy.** Deleting an attraction
warns when it also deletes your review — with the score — and your note,
because the schema cascades from attraction to rating. Deleting an event
year cascades further still (its attractions, and their reviews), so **a
year is only deletable once it holds no attractions**; until then the
control is disabled and says why. Editing archive facts never touches
ratings, notes or ranking positions — they're separate rows and no admin
write goes near them. Every confirmation stays open and shows the failure if
the write is rejected, rather than closing as though it worked.

### Sources and media

Admin Mode can record _where a fact came from_ and _where an image came
from_, because an archive that can't tell a documented claim from an
unsupported one isn't an archive.

**Sources** (`SourceManager`) are their own records — type (Universal /
official, YouTube, website or article, promotional material, other), title,
URL, publisher or channel, date where known, and notes — and they're
attachable to **an attraction or to an event year itself**, since a line-up
announcement or a season recap documents the year rather than any one house.
`event_year_sources` is the second link table for exactly that. The same
source can be cited from many places, so the editor offers **"cite an
existing source"** beside "add a new one", and then distinguishes the two
ways of removing it: **Detach** drops this citation, **Delete everywhere**
removes the record from every attraction and year that cites it, behind a
confirmation that says so.

**YouTube is a source type, not a feature.** A video is a URL on a source
row; opening it goes through `openUrl` (`@tauri-apps/plugin-opener`) to the
system browser. Nothing is downloaded, embedded or redistributed.

**Artwork is never generated.** There is no "fill in the missing poster"
path anywhere in the app, and there will not be one — a fabricated image is
a false claim about a real attraction. **Missing artwork is not an error**:
`ArchiveCard`'s typographic fallback is the official presentation for an
attraction we don't have a legitimate image for, and it stays.

**Media rows separate storage from distribution**, because they're
different questions:

- _Where does the file live?_ — a `url` (remote, fetched by the webview at
  display time) or a `localPath` (a file the user picked, copied into the
  app's own data directory).
- _What may we do with it?_ — `distribution` is `reference` (default: never
  copied, never shipped), `local` (kept in this installation's data
  directory, still not shipped), or `bundled` (explicitly cleared to
  distribute with the app). **Finding an image online is not that
  decision**, and the default is the only safe assumption; the control spells
  this out beside itself rather than leaving it to be inferred. Attribution
  and license notes sit on the same row, and a media row can point at the
  source it came from.

This is what lets the eventual real dataset mix all three: reference the
originals, let the user add their own local images, and bundle only what
we've explicitly decided we may distribute.

**Imported files are managed, not merely remembered.** `src/media/` owns
this: `importLocalMediaFile` opens the Tauri dialog, reads the chosen file
and **copies** it into `$APPDATA/media/`, under a collision-safe name built
from a slug of the original plus a generated id (`moonlight-manor-a1b2c3.jpg`).
The stored value is a path _relative to the data directory_ — never the
user's original filepath, which may be a memory stick, a Downloads folder
that gets cleared, or a path that doesn't exist on their next machine.
`buildStoredFileName` is deliberately paranoid: separators and `..` are
stripped (`../../../etc/passwd.png` becomes `passwd-<id>.png`), unknown
extensions collapse to `.img`, and long names are capped. Display goes
through `resolveMediaSrc`, which returns the remote URL as-is or runs the
managed path through `convertFileSrc`; the asset protocol's scope is
`$APPDATA/media/*` and nothing wider. Removing a managed media row deletes
its file too, which is the only place the app deletes from disk.

### Settings and backups

Settings is four sections — Appearance, Data, Admin, About — plus a fifth,
Sample data, that only exists in a development build.

**Appearance** owns the preferences that were previously only reachable from
the pages that used them: the ambient background, the card/compact attraction
view, and motion. Motion is three-way rather than a switch (`useMotionPreference`):
**System**, which follows the operating system's reduced-motion setting,
**Reduce**, and **Full** — because a plain toggle would have to either ignore
the OS accessibility setting or silently disagree with it. The choice is
published as `data-reduce-motion` on the document element, and CSS decides
what that means; "System" removes the attribute entirely so the
`prefers-reduced-motion` media query stays in charge, which is also what
applies before any JavaScript has run.

Preferences live in localStorage, and their keys live in one place
(`src/preferences/localPreferences.ts`) rather than inside each hook, so the
backup code and the hooks can't disagree about what a preference is called.

#### The backup format

An export is one JSON file, and it is **a table-level dump, not a dump of the
domain models**. The join tables — `attraction_parks`, `attraction_sources`,
`event_year_sources` — carry relationships no single model exposes, and a
restore that lost them would quietly change the archive. `parks` is the one
table left out: fixed reference data seeded by a migration, which an import
has no business replacing.

Every file carries three versions, because they answer different questions:
`formatVersion` (the shape of the file), `appVersion` (which build wrote it)
and `schemaVersion` (the migration the database was at), plus `exportedAt`.
`user_ratings.total` is never exported — it's a generated column, and a
restored total is always recomputed by the database.

`BACKUP_TABLES` in `src/backup/backupTables.ts` describes each table once —
its columns, their types, the fixed value sets, which columns point at other
tables — and both the validator and the SQL read it. That sharing is the
point: a column added to the export but forgotten in the validator is exactly
the bug that makes a restore silently lossy, and there's no second list to
forget.

Preferences ride along, except **Admin Mode**, deliberately. It's a safety
default rather than a taste, and restoring someone's backup should never
quietly make the archive editable on this machine.

#### Importing safely

The order is the design:

1. **Validate completely, before anything is written.** Types, the small
   fixed enumerations, park ids, rating values (0–5 in halves), the
   attraction-or-year rule on media — and then the file against _itself_:
   every id a row points at must exist in the same file. The database would
   catch a dangling reference too, but only half way through writing, which
   is the state an import must never leave behind. Unknown columns are
   dropped rather than passed to SQL. A file from a newer format version is
   refused rather than guessed at; an older one goes through
   `upgradeBackup`'s chain, which today is empty and says so.
2. **Show what it contains, beside what's already here** — per table, because
   "1,204 rows" is not something anyone can consent to.
3. **Write a safety copy first.** `$APPDATA/backups/before-import-<stamp>.json`,
   written before a single row is deleted, and the path is shown to the user.
4. **Replace, and put it back if that fails.** The same snapshot is held in
   memory: if the replacement throws part way through, the previous data goes
   straight back in and the error says nothing was changed. If even that
   fails, the message names the file.

There is no SQL transaction around the replacement, deliberately: the Tauri
SQL plugin runs on a connection pool, so `BEGIN` and `COMMIT` issued as
separate calls are not guaranteed to land on the same connection — a
transaction that looks atomic and isn't would be worse than the snapshot,
which is honest about what it does. `importBackup.test.ts` proves the
rollback against a real database by importing a file that passes validation
but trips a UNIQUE constraint on its second insert.

After a successful import the panel offers **Reload to see it** rather than
refreshing in place: every other page is holding data that no longer exists,
and a reload is what a restore actually means.

#### Privacy

Nothing here touches a network. Export writes where the system save dialog
says, import reads what the open dialog returns — and it's those dialogs that
grant the access, so the app never holds blanket permission to read or write
the disk. There is no account, no sync and no server; the only thing that
leaves the app is a source URL you open yourself, which goes to your browser.

#### Sample data

The fictional dataset's seed/clear controls appear in Settings **only in a
development build** (`import.meta.env.DEV`). A shipped app has no business
writing invented attractions into someone's archive. They're the same
functions behind `npm run db:seed` / `db:clear` / `db:reset`, and they still
only touch rows flagged `is_sample`.

## Windows release

The target is someone with no developer tools installed. They run one
installer, get a Start Menu entry, and never see Node, Rust or a terminal.

### Building one

```
npm install                # once, or after dependency changes
npm run release:windows    # == tauri build
```

That runs `tsc && vite build` first (so a type error fails the release, not
the user's launch), compiles the Rust shell in release mode, and produces:

```
src-tauri/target/release/bundle/nsis/Haunt Ranker_<version>_x64-setup.exe
```

A cold build takes a few minutes; the Rust compile dominates. Building
requires the [Tauri prerequisites](https://tauri.app/start/prerequisites/) —
Rust, the MSVC build tools and WebView2 — on the _build_ machine only.

**To release a new version, bump `version` in `package.json` and nothing
else.** `tauri.conf.json` reads `"version": "../package.json"`, so the
installer name, the executable's file properties, Settings → About and the
`appVersion` stamped into every backup file all move together.
(`src-tauri/Cargo.toml`'s version is the Rust crate's own and doesn't affect
the bundle; keep it in step if you like tidiness.)

### What the installer does

- **NSIS, per-user** (`installMode: "currentUser"`): installs to
  `%LOCALAPPDATA%\Haunt Ranker` with **no administrator prompt**.
- Registers in Add/Remove Programs and adds one Start Menu shortcut.
- **WebView2**: `downloadBootstrapper`. Windows 11 already has it; on an older
  machine the installer fetches it. This is the only thing in the build that
  ever needs the network.
- The app itself is unsigned. Windows SmartScreen will warn on first run until
  the release is code-signed with a certificate — worth doing before this goes
  to anyone but the author.

### Where the user's data lives

Nothing mutable is written next to the executable. Everything is under the
identifier `com.hauntranker.app` in the user's roaming profile:

| What                     | Where                                                             |
| ------------------------ | ----------------------------------------------------------------- |
| SQLite database          | `%APPDATA%\com.hauntranker.app\haunt-ranker.db` (+ `-wal`/`-shm`) |
| Imported local media     | `%APPDATA%\com.hauntranker.app\media\`                            |
| Pre-import safety copies | `%APPDATA%\com.hauntranker.app\backups\`                          |
| Preferences              | The WebView2 profile's local storage, beside the app data         |
| Exported backups         | Wherever the user picked in the save dialog                       |

The database path comes from the SQL plugin, which resolves `sqlite:` URLs
against Tauri's app **config** directory; media and backups use the app
**data** directory. On Windows both are the same folder, which is why they sit
side by side above.

### Upgrade safety

Installing a newer version over an older one keeps everything. Verified
against the generated NSIS script and by an install/uninstall cycle on this
machine:

- User data is in `%APPDATA%`, never in the install directory the installer
  replaces.
- The generated uninstaller only removes `%APPDATA%\<identifier>` when the
  user **ticks "Delete application data"** on the uninstall confirmation page
  _and_ it isn't running as part of an upgrade — the installer passes
  `/UPDATE` to the outgoing uninstaller, which skips that branch entirely.
- A silent uninstall (`uninstall.exe /S`) never ticks that box, so it leaves
  the database in place.
- Migrations are versioned and tracked by the SQL plugin's own
  `_sqlx_migrations` table, so a newer build runs only the migrations the
  database hasn't seen. `SCHEMA_VERSION` is asserted against the migrations
  directory by a test, and Settings → Data shows the applied version when it
  differs from the expected one.

### What a production build leaves out

- **The fictional sample dataset is not in the shipped bundle at all.**
  `useSampleData` reaches it through a dynamic `import()` behind
  `import.meta.env.DEV`, which Vite replaces with `false` for production, so
  Rollup drops the module; the build was checked for its contents
  (`grep`-ing `dist/` for the fictional attraction names finds nothing).
- The sample-data panel in Settings renders nothing outside a development
  build, and there are no other debug-only controls.
- No `console` logging in application code — only `scripts/dev-db.ts`, a CLI
  that never ships, and the test setup.
- **No network requests.** The fonts used to come from Google Fonts on every
  launch; they're now bundled (`public/fonts/`, generated by
  `npm run assets:fonts`), so the app renders correctly offline and Settings →
  About's "nothing leaves this machine" is literally true. Inter and Fraunces
  are SIL Open Font License 1.1 and their licences ship beside them.

### Icons

`src-tauri/icons/` is generated from `src-tauri/icons/source-icon.png` by
`npm run assets:icons`, which draws a **placeholder** mark — a lit doorway in
the app's own palette — and then runs `tauri icon` to slice every size Windows
needs.

**No Halloween Horror Nights artwork, logo or photography is used as the
application icon, and none should be**: it is Universal's. Replacing the
placeholder is a matter of dropping a 1024×1024 PNG in as `source-icon.png`
and re-running `tauri icon` (at which point `scripts/make-placeholder-icon.mjs`
can be deleted).

### Release checklist

Automated, and green before a release is cut:

```
npm run format:check && npm run typecheck && npm run lint && npm test
```

Verified here on the packaged build:

- the installer installs per-user with no admin prompt, and registers in the
  Start Menu and Add/Remove Programs;
- the installed app launches, opens its window and renders — sidebar,
  bundled fonts, atmosphere and archive cards;
- it opens the existing database in `%APPDATA%` and shows data written by
  earlier runs (persistence across restarts, at the packaged level);
- a silent uninstall removes the program, its shortcut and its registry entry,
  and **leaves the database untouched**.

Still to be done by hand in the running app, once per release — these need a
person driving the UI:

1. Rate an attraction, close the app, reopen it, confirm the score is still
   there.
2. Export a backup, then import it back and confirm the summary matches.
3. Turn Admin Mode on, edit an attraction, turn it off again.
4. Navigate to a wiki page from a card and from a hover preview.
5. Reorder a manual ranking and confirm the order survives a restart.
6. Open Statistics and the Stats Explorer with a couple of filter combinations.

Each of these is covered by the automated suite at the repository level
(including file-reopen persistence tests), so the manual pass is confirming
the packaged app, not the logic.

## The real data contract

The app is structurally complete and the fictional development records are on
their way out of real databases: migration `0006_retire_sample_data.sql`
deletes every row flagged `is_sample = 1`, once, wherever it finds them. The
flag and `npm run db:seed` / `db:clear` / `db:reset` stay — the fictional
dataset is a development tool, and a shipped build has never inserted it (see
"What a production build leaves out").

Real Halloween Horror Nights records haven't been researched yet. What exists
now is the **contract they will be entered against**, settled first so the data
is entered once rather than reshaped later.

**[`docs/archive-dataset-format.md`](docs/archive-dataset-format.md) is the
specification**, with a worked example in
[`docs/examples/`](docs/examples/archive-dataset.example.json) that the test
suite validates on every run. In short:

- One human-reviewable JSON file: `events`, `attractions` and shared `sources`,
  covering type, parks, IP and franchise, summaries, the four wiki sections,
  characters, location, event and attraction dates, relationships, media
  metadata and citations.
- **Identity is an explicit stable id, never a display name.** Names get
  corrected; if identity came from the name, every correction would read as a
  new attraction and strand the rating attached to the old one. `previousIds`
  handles the rare case where an id itself must change.
- **A dataset can't describe a person.** There is no field for a rating, a note
  or a ranking position anywhere in the format.

### What an import may touch

`src/archive/archiveTables.ts` partitions every table into archive or personal
and **fails to compile** if a new table is added without that decision being
made. The archive side — event years, attractions, park assignments,
characters, relations, sources, citations and media metadata — is what a
dataset may add to and correct. The personal side — `user_ratings`,
`user_notes`, `user_rankings`, `user_settings` — is never written by an import.

The one exception exists so personal data _survives_ a correction: when a
dataset declares an id change, the importer **moves** the record and everything
pointing at it, the user's rating, note and ranking position included. Their
contents are never read; the importer reads a count, to report how many rows
moved.

Imports are additive and corrective. Nothing is deleted, and an attraction
dropped from a later dataset stays in the archive. Citations added by hand in
Admin Mode survive every import. Park assignments are the one thing replaced
outright, because a park left behind is a wrong fact rather than a preference.

### How an import runs

Validate the whole file (`validateDataset`) → plan every write against what's
stored (`planImport`) → refuse as a whole if any part is impossible → apply,
undoing every write already made if one fails. The undo log exists instead of a
SQL transaction for the same reason the backup importer has one: the Tauri SQL
plugin runs a connection pool, so `BEGIN`/`COMMIT` in separate calls aren't
guaranteed to share a connection. It also never deletes an attraction, so it
can't cascade into a rating — which restoring whole tables would.

Running the same dataset twice changes nothing the second time; every record is
matched by id and compared column by column.

There is no UI for this yet, by design: this phase is the contract and its
tests, and the importer is exercised end to end against real SQLite in
`src/archive/importDataset.test.ts`.

## The archive dataset

[`data/hhn-archive.json`](data/hhn-archive.json) is the real Halloween Horror
Nights data, in the format [`docs/archive-dataset-format.md`](docs/archive-dataset-format.md)
describes. It is validated, and imported into the archive by a script — there is
still no importer UI, so a _fresh install_ starts empty until
`npm run data:import` is run against it.

```
npm run data:validate
```

runs fourteen checks and writes
[`docs/research/hhn-import-validation.md`](docs/research/hhn-import-validation.md):
the format's own validator, then the archive-specific ones (unique ids,
duplicates, years in scope, park associations, the cross-park decisions, IP
values, source and media relationships, related-attraction ids, required
fields), then every cited YouTube URL against YouTube itself, and finally **a
real import into a throwaway database** — not a plan.

That last stage earns its keep: planning alone passed a dataset that failed on
execution, because relations were written before the attraction they pointed at
existed. The importer now appends relations last, and
`importDataset.test.ts` covers it.

### What's in it, and what deliberately isn't

The dataset covers **2010–2026** at both parks — the scope cap, not the limit of
what exists; the [research](docs/research/) established that usable material
goes back to Orlando 1991.

Every attraction carries what can be sourced: name, event year, type, parks, IP
classification and franchise, the venue it was housed in, and at least one
source. **394 of 416 have their IP classified** from each page's own "Based on"
field; the other 22 are left unclassified rather than guessed.

**Only 20 attractions have a summary**, and that is the point rather than an
oversight. Prose is written only where an authoritative source describes the
attraction — currently Universal's own 2026 press material, paraphrased. Every
other overview, story, experience and development field is **absent, not
empty-but-planned**: the archive's rule is that a field is filled when a source
says so, and connective narrative is never invented to fill a page. The wiki
pages for those attractions will show the sections they have and nothing else,
which is what "only sections with data render" was built for.

Characters and media are likewise absent. No artwork is referenced because none
has been cleared, and the typographic fallback card is the correct presentation
until it is.

### Provenance

Sources are labelled for what they are. The per-attraction rows come from the
Halloween Horror Nights Wiki, recorded as `other` with a note on every one that
it is a **fan-maintained archive, not a Universal publication** — so nothing
from it is presented as an official statement. The 2026 summaries cite
Universal's own press release and NBCUniversal's corporate guide as
`official_site`. Each event year cites the YouTube walkthroughs the eligibility
research verified, as `youtube`, with the channel as publisher; nothing is
downloaded or repackaged.

Two attractions are single records covering both parks, where a source
described the two builds as essentially the same. The other 50 same-year
cross-park pairs are separate records carrying "Orlando version" or "Hollywood
version" and a `related_concept` relation between them — the reasoning is in
[the catalogue research](docs/research/hhn-attraction-catalogue.md).
