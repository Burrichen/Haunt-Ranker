# The Haunt Ranker archive dataset format

This is the contract between whoever assembles real Halloween Horror Nights
records and the app that displays them. One JSON file describes the archive;
Haunt Ranker reads it, adds what's new, corrects what's changed, and leaves
everything you wrote about it alone.

Nothing in this document describes real HHN data — that research hasn't been
done. The format is settled first, deliberately, so the data can be entered
once rather than reshaped later.

- **Machine-checkable version:** `src/models/archiveDataset.ts` (types) and
  `src/archive/validateDataset.ts` (the validator).
- **Worked example:** [`examples/archive-dataset.example.json`](examples/archive-dataset.example.json).

## The two rules everything else follows

**1. Identity is an explicit id, never a display name.** Names get corrected,
re-cased, disambiguated and translated. If identity came from the name, every
correction would read as a brand-new attraction, and the rating attached to the
old one would be stranded beside it. Every entity therefore carries an `id`
chosen once and kept forever.

An id is lowercase letters, numbers and hyphens (`^[a-z0-9][a-z0-9-]{1,79}$`).
A readable convention that has held up: `<event>-<type>-<name>`, e.g.
`hhn-2024-house-the-quarry`. The validator only enforces the shape; the
convention is for humans reading diffs.

**2. A dataset describes the event, never the person.** There is no field in
this format for a rating, a note or a ranking position, and no code path from a
dataset to those tables. That is not a policy someone has to remember — it's the
shape of the format.

## File shape

```json
{
  "formatVersion": 1,
  "datasetVersion": "2026.09.1",
  "generatedAt": "2026-09-18T00:00:00.000Z",
  "notes": "What changed in this revision.",
  "sources": [/* … */],
  "events": [/* … */],
  "attractions": [/* … */]
}
```

| Field            | Required | Meaning                                                                      |
| ---------------- | -------- | ---------------------------------------------------------------------------- |
| `formatVersion`  | yes      | The format's version, currently `1`. A newer file is refused, not guessed at |
| `datasetVersion` | no       | The dataset's own version. Free-form, for humans                             |
| `generatedAt`    | no       | ISO 8601 timestamp                                                           |
| `notes`          | no       | Scope, gaps and caveats for this revision                                    |
| `sources`        | no       | Shared source records, cited by id from anywhere                             |
| `events`         | yes      | Event years                                                                  |
| `attractions`    | yes      | Houses and scare zones                                                       |

### `events[]`

| Field          | Required | Notes                                                       |
| -------------- | -------- | ----------------------------------------------------------- |
| `id`           | yes      | Stable id                                                   |
| `previousIds`  | no       | Ids this event used to have — see "Renaming" below          |
| `calendarYear` | yes      | Whole year, 1900–2200                                       |
| `name`         | yes      | e.g. "Halloween Horror Nights 2024"                         |
| `description`  | no       | Prose about the year                                        |
| `sourceNotes`  | no       | A note about the sourcing of this entry itself              |
| `dates`        | no       | `{ "start": "2024-09-06", "end": "2024-11-03" }`, ISO dates |
| `sourceIds`    | no       | Ids from `sources` — a season recap belongs to the year     |
| `media`        | no       | Event artwork (see "Media")                                 |

One event record covers **both parks**. Which parks an attraction actually ran
at is recorded on the attraction, because that's where it differs.

### `attractions[]`

| Field         | Required | Notes                                                               |
| ------------- | -------- | ------------------------------------------------------------------- |
| `id`          | yes      | Stable id                                                           |
| `previousIds` | no       | See "Renaming"                                                      |
| `eventId`     | yes      | An `id` from `events`                                               |
| `type`        | yes      | `house` or `scare_zone`                                             |
| `name`        | yes      | Display name                                                        |
| `slug`        | no       | URL segment; defaults to the id. Addressing, not identity           |
| `variantName` | no       | What distinguishes this record from another of the same name        |
| `parks`       | yes      | `["hollywood"]`, `["orlando"]`, or both                             |
| `ip`          | no       | `{ "type": "original" \| "licensed", "franchise": "…" }`            |
| `summary`     | no       | One or two sentences; used on cards and hover previews              |
| `wiki`        | no       | `{ overview, story, experience, development }` — all optional prose |
| `location`    | no       | Where it stood: a soundstage, a lot, a street                       |
| `dates`       | no       | `{ start, end }` — when this attraction opened and closed           |
| `characters`  | no       | `[{ id, name, description? }]`                                      |
| `related`     | no       | `[{ attractionId, type, notes? }]`                                  |
| `media`       | no       | See "Media"                                                         |
| `sourceIds`   | no       | Ids from `sources`                                                  |

**Shared appearances vs. separate versions.** Listing both parks in one record
means _the same attraction_ appeared at both. A version different enough to be
worth describing separately gets **its own record, with its own id**, and the
two are linked with a `previous_version` relation; `variantName` (e.g.
"Hollywood version") is what tells them apart in the UI. Nothing is ever merged
automatically on a name.

`related[].type` is one of `sequel`, `previous_version`, `same_franchise`,
`related_concept`. A relation may point at an attraction in this file _or_ at
one imported by an earlier dataset; anything else is an error before any write
happens.

### `sources[]`

| Field         | Required | Notes                                                                                                         |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Stable id                                                                                                     |
| `type`        | yes      | `youtube`, `article`, `official_site`, `promotional`, `book`, `podcast`, `interview`, `social_media`, `other` |
| `title`       | yes      | What it's called                                                                                              |
| `url`         | no       | Where it lives                                                                                                |
| `publisher`   | no       | The site, publication or YouTube channel                                                                      |
| `publishedAt` | no       | ISO date                                                                                                      |
| `notes`       | no       | Anything a reader should know about it                                                                        |

**YouTube is an ordinary source type, not a feature.** A video is a URL on a
source record; the app opens it in the system browser. Nothing is downloaded,
embedded or redistributed.

### Media

Media entries carry _metadata about an image_, never an image and never a path
on anyone's machine.

| Field          | Required | Notes                                                                 |
| -------------- | -------- | --------------------------------------------------------------------- |
| `id`           | yes      | Stable id                                                             |
| `kind`         | yes      | `poster`, `promotional_image`, `logo`, `event_artwork`, `local_image` |
| `url`          | yes      | The remote original                                                   |
| `attribution`  | no       | Who made it / where it came from                                      |
| `licenseNotes` | no       | What's actually known about reuse rights                              |
| `sourceId`     | no       | The source this image came from                                       |
| `distribution` | no       | `reference` (default) or `bundled`                                    |

`distribution` says what the archive may _do_ with the image, separately from
where it lives. A dataset may only say `reference` (link to the original) or
`bundled` (a deliberate, recorded decision that this asset may ship with the
app). It may **never** say `local` — that describes a file a user picked on
their own computer.

**Artwork is never generated to fill a gap.** An attraction with no legitimate
image simply has no media entry; the app's typographic fallback card is the
correct presentation, not an error.

## Renaming: `previousIds`

Ids are meant to be permanent. When one genuinely has to change — a convention
changes, or an id turns out to encode something wrong — the new entry lists the
old id in `previousIds`:

```json
{
  "id": "hhn-2024-house-the-quarry",
  "previousIds": ["hhn-2024-house-quarry"],
  "…": "…"
}
```

The importer then **moves** the existing record to the new id, taking its
characters, media, citations _and the user's rating, note and ranking position_
with it. This is the one place an import touches personal rows, and it exists
precisely so that correcting the archive doesn't cost anyone their review.

If **both** ids already exist, nothing is merged: the import says so in a
warning and leaves both records alone. Which record to keep is a judgement about
the world, not something an importer should guess.

## What an import may change, and what it never touches

An import is **additive and corrective**. It adds what's new and corrects what
the dataset describes differently. It does not delete records, and removing an
attraction from a dataset does **not** remove it from someone's archive.

**May be replaced** (the dataset is the authority on these facts):

| Table                  | Fields                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `event_years`          | `calendar_year`, `name`, `description`, `source_notes`, `starts_on`, `ends_on`                                                                                                                                                                   |
| `attractions`          | `event_year_id`, `attraction_type`, `name`, `slug`, `variant_name`, `ip_type`, `franchise_name`, `short_summary`, `full_overview`, `story_lore`, `experience_description`, `development_notes`, `opening_date`, `closing_date`, `location_notes` |
| `attraction_parks`     | The whole set for an attraction the dataset describes — a park left behind would be a wrong fact                                                                                                                                                 |
| `characters`           | `name`, `description`                                                                                                                                                                                                                            |
| `attraction_relations` | `notes` (the relation itself is matched on attraction + attraction + type)                                                                                                                                                                       |
| `sources`              | `source_type`, `title`, `url`, `publisher`, `published_at`, `notes`                                                                                                                                                                              |
| `media`                | `media_type`, `url`, `source_id`, `attribution`, `license_notes`, `distribution`, and its owner                                                                                                                                                  |

**Added but never removed:** `attraction_sources` and `event_year_sources`
citations. A source you attached by hand in Admin Mode survives every import.

**Never written, in any circumstance:**

| Table           | What it holds                  |
| --------------- | ------------------------------ |
| `user_ratings`  | Your Theme / Fun / Fear scores |
| `user_notes`    | What you wrote                 |
| `user_rankings` | Your manual order              |
| `user_settings` | Your stored settings           |

The single exception is a rename, which changes _which attraction id_ those rows
point at and nothing else. The importer never reads their contents: it reads the
count, to report how many rows moved.

Also never written: `is_sample` on existing rows (imported records are always
real ones, `is_sample = 0`), and `media.local_path`, which only ever refers to a
file on this machine.

This split is enforced in code, not only here — `src/archive/archiveTables.ts`
partitions every table into archive or personal, and fails to compile if a new
table is added without deciding which it is.

## How an import runs

1. **Validate the file completely.** Structure, enumerations, id shape, id
   collisions and every reference inside the file. An invalid dataset never
   reaches the database.
2. **Plan against what's stored.** Work out every insert, update, link and
   rename, plus anything only the stored archive could rule out (a relation to
   an attraction nobody has). The plan is both the preview and the instruction
   list, so what you approve is what runs.
3. **Refuse as a whole, or apply as a whole.** If any part of the plan is
   impossible, nothing is written.
4. **Undo everything on failure.** Each write records how to reverse it; if one
   fails, the rest are unwound in reverse order.

There is no SQL transaction around step 4, deliberately. The Tauri SQL plugin
runs a connection pool, so `BEGIN` and `COMMIT` issued as separate calls are not
guaranteed to reach the same connection — a transaction that looks atomic and
isn't would be worse than an undo log that says what it does. The undo log also
never deletes an attraction, so it can never cascade into a rating.

## Re-importing the same file

Running the same dataset twice changes nothing the second time: every record is
matched by id, compared column by column, and reported as unchanged. That's what
makes a dataset safe to re-apply after a partial failure or an app update.
